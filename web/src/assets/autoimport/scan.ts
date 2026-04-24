import { mkdir, readdir, rm, stat } from "node:fs/promises"
import { basename, dirname, extname, join, resolve } from "node:path"

import {
  Audiobook,
  type AudiobookInputs,
} from "@storyteller-platform/audiobook"
import { Epub } from "@storyteller-platform/epub"

import {
  getAudioCover,
  getEpubCover,
  writeExtractedAudiobookCover,
  writeExtractedEbookCover,
} from "@/assets/covers"
import { copyWithHardlink, move, writeCachedCoverImage } from "@/assets/fs"
import {
  getMetadataFromAudiobook,
  getMetadataFromEpub,
  keepMissingMetadata,
  keepMissingRelations,
} from "@/assets/metadata"
import {
  getDefaultSuffix,
  getInternalAudioDirectory,
  getInternalBookDirectory,
  getInternalEpubFilepath,
  getInternalReadaloudFilepath,
} from "@/assets/paths"
import { isAudioFile } from "@/audio"
import {
  type BookUpdate,
  type BookWithRelations,
  createBookFromAudiobook,
  createBookFromEpub,
  getBookByAudiobookFilepathPrefix,
  getBooks,
  updateBook,
} from "@/database/books"
import { db } from "@/database/connection"
import { type ImportMode } from "@/database/settingsTypes"
import { optimizeImage } from "@/images"
import { logger } from "@/logging"
import { type UUID } from "@/uuid"

type BookPaths = {
  ebook?: string
  audiobook?: string
  readaloud?: string
}

/**
 * Handle imported book files according to import mode. For "reference" mode,
 * just record skip paths. For "move"/"copy" modes, relocate files to the
 * internal library (copy uses hardlinks where possible).
 */
async function handleImportedFiles(
  book: BookWithRelations,
  sourcePaths: BookPaths,
  mode: ImportMode,
  newSkipPaths: { bookUuid: UUID; filepath: string }[],
): Promise<BookWithRelations> {
  if (mode === "reference") {
    for (const path of [
      sourcePaths.ebook,
      sourcePaths.readaloud,
      sourcePaths.audiobook,
    ]) {
      if (path) newSkipPaths.push({ bookUuid: book.uuid, filepath: path })
    }
    return book
  }
  const relocate = mode === "move" ? move : copyWithHardlink
  const relations: Parameters<typeof updateBook>[2] = {}
  if (sourcePaths.ebook) {
    const destPath = getInternalEpubFilepath(book)
    await mkdir(dirname(destPath), { recursive: true })
    await relocate(sourcePaths.ebook, destPath)
    relations.ebook = { filepath: destPath }
    if (mode === "copy")
      newSkipPaths.push({ bookUuid: book.uuid, filepath: sourcePaths.ebook })
  }
  if (sourcePaths.readaloud) {
    const destPath = getInternalReadaloudFilepath(book)
    await mkdir(dirname(destPath), { recursive: true })
    await relocate(sourcePaths.readaloud, destPath)
    relations.readaloud = {
      filepath: destPath,
      currentStage: book.readaloud?.currentStage ?? "SPLIT_TRACKS",
    }
    if (mode === "copy")
      newSkipPaths.push({
        bookUuid: book.uuid,
        filepath: sourcePaths.readaloud,
      })
  }
  if (sourcePaths.audiobook) {
    const destDir = getInternalAudioDirectory(book)
    await mkdir(destDir, { recursive: true })
    const entries = await readdir(sourcePaths.audiobook)
    for (const entry of entries) {
      if (!isAudioFile(entry)) continue
      await relocate(join(sourcePaths.audiobook, entry), join(destDir, entry))
    }
    if (mode === "move") await rm(sourcePaths.audiobook, { recursive: true })
    relations.audiobook = { filepath: destDir }
    if (mode === "copy")
      newSkipPaths.push({
        bookUuid: book.uuid,
        filepath: sourcePaths.audiobook,
      })
  }
  if (Object.keys(relations).length === 0) return book
  return await updateBook(book.uuid, null, relations)
}

export async function scan(
  importPath: string,
  collectionUuid: UUID | null,
  signal: AbortSignal,
  importMode: ImportMode = "reference",
) {
  logger.debug(`Starting new scan for ${importPath}`)
  const allBooks = await getBooks()
  if (signal.aborted) {
    logger.debug("Scanning aborted")
    return
  }

  const books = collectionUuid
    ? allBooks.filter((book) =>
        book.collections.some((c) => c.uuid === collectionUuid),
      )
    : allBooks

  const knownEbookPaths = new Set(books.map((book) => book.ebook?.filepath))
  const knownReadaloudPaths = new Set(
    books.map((book) => book.readaloud?.filepath),
  )
  const skipPaths = new Set(
    (await db.selectFrom("importSkipPath").select("filepath").execute()).map(
      (row) => row.filepath,
    ),
  )
  const seenSkipPaths = new Set<string>()
  const newSkipPaths: { bookUuid: UUID; filepath: string }[] = []

  logger.debug("Starting recursive directory scan...")
  const entries = await readdir(importPath, {
    recursive: true,
    withFileTypes: true,
  })
  logger.debug(`Found ${entries.length} files recursively`)

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (signal.aborted) {
    logger.debug("Scanning aborted")
    return
  }

  const ebookPaths: string[] = []
  const audiobookPathsSet = new Set<string>()
  const bookPaths: {
    ebook?: string
    audiobook?: string
    readaloud?: string
  }[] = []

  logger.debug("Searching for new epub and audio files...")
  for (const entry of entries) {
    if (!entry.isFile() && !entry.isSymbolicLink()) continue
    const ext = extname(entry.name)
    if (ext === ".epub") {
      if (resolve(entry.parentPath) === resolve(importPath)) {
        logger.warn(
          `Found an EPUB file that was not in a book folder: skipping. Please place all files within book-specific folders: https://storyteller-platform.gitlab.io/storyteller/docs/managing/adding#organizing-your-auto-import-folder. ${entry.parentPath}${entry.name}`,
        )
        continue
      }
      const fullPath = join(entry.parentPath, entry.name)
      if (skipPaths.has(fullPath)) {
        seenSkipPaths.add(fullPath)
        continue
      }
      ebookPaths.push(fullPath)
    }
    if (isAudioFile(ext)) {
      if (resolve(entry.parentPath) === resolve(importPath)) {
        logger.warn(
          `Found an audiobook file that was not in a book folder: skipping. Please place all files within book-specific folders: https://storyteller-platform.gitlab.io/storyteller/docs/managing/adding#organizing-your-auto-import-folder. ${entry.parentPath}${entry.name}`,
        )
        continue
      }
      if (skipPaths.has(entry.parentPath)) {
        seenSkipPaths.add(entry.parentPath)
        continue
      }
      audiobookPathsSet.add(entry.parentPath)
    }
  }
  logger.debug(
    `Found ${ebookPaths.length} ebook files and ${audiobookPathsSet.size} audiobook folders`,
  )

  const audiobookPaths = Array.from(audiobookPathsSet)

  const handledEbookPaths = new Set<string>()
  const handledAudiobookPaths = new Set<string>()

  logger.debug("Checking ebooks for adjacent readalouds and audio...")
  for (const ebookPath of ebookPaths) {
    if (handledEbookPaths.has(ebookPath)) continue

    const dir = `${dirname(ebookPath)}/`
    const additionalEbookPaths = ebookPaths.filter(
      (path) => path.startsWith(dir) && path !== ebookPath,
    )
    let plainEbookPath: string | null = null
    let readaloudPath: string | null = null

    // TODO: log ebook files that don't get handled?
    for (const path of [ebookPath, ...additionalEbookPaths]) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (signal.aborted) {
        logger.debug("Scanning aborted")
        return
      }

      if (plainEbookPath && readaloudPath) break

      // If we already have this path in the db,
      // we know which format it is, so we don't
      // need to inspect it
      if (knownEbookPaths.has(path)) {
        plainEbookPath = path
        continue
      }
      if (knownReadaloudPaths.has(path)) {
        readaloudPath = path
        continue
      }

      try {
        using epub = await Epub.from(path)
        const manifest = await epub.getManifest()
        const isReadaloud = Object.values(manifest).some(
          (item) => item.mediaOverlay,
        )
        if (isReadaloud && !readaloudPath) {
          readaloudPath = path
          handledEbookPaths.add(path)
        }
        if (!isReadaloud && !plainEbookPath) {
          plainEbookPath = path
          handledEbookPaths.add(path)
        }
      } catch (e) {
        logger.error(
          `Encountered issue attempting to read EPUB file at ${path}, skipping`,
        )
        logger.error(e)
        continue
      }
    }

    const nestedAudiobookPaths = audiobookPaths.filter((path) =>
      `${path}/`.startsWith(dir),
    )

    // TODO: log audiobook files that don't get handled?
    const [nestedAudiobookPath] = nestedAudiobookPaths
    if (nestedAudiobookPath) {
      handledAudiobookPaths.add(nestedAudiobookPath)
    }
    if (plainEbookPath || readaloudPath || nestedAudiobookPath) {
      bookPaths.push({
        ...(plainEbookPath && { ebook: plainEbookPath }),
        ...(readaloudPath && { readaloud: readaloudPath }),
        ...(nestedAudiobookPath && { audiobook: nestedAudiobookPath }),
      })
    }
  }

  logger.debug("Checking for standalone audiobooks...")
  for (const audiobookPath of audiobookPaths) {
    if (handledAudiobookPaths.has(audiobookPath)) continue

    bookPaths.push({ audiobook: audiobookPath })
  }

  logger.debug(`Found ${bookPaths.length} book folders.`)

  logger.debug("Searching found book folders for new books...")
  for (const bookPath of bookPaths) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (signal.aborted) {
      logger.debug("Scanning aborted")
      return
    }

    let book = books.find(
      (book) =>
        (bookPath.ebook && bookPath.ebook === book.ebook?.filepath) ||
        (bookPath.audiobook &&
          bookPath.audiobook === book.audiobook?.filepath) ||
        (bookPath.readaloud && bookPath.readaloud === book.readaloud?.filepath),
    )

    if (!book) {
      logger.debug(
        `Found a new book! Importing from ${JSON.stringify(bookPath)}`,
      )

      if (bookPath.readaloud || bookPath.ebook) {
        // We've already confirmed that one of these is truthy above
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        using epub = await Epub.from((bookPath.readaloud ?? bookPath.ebook)!)

        let created: BookWithRelations
        try {
          created = await createBookFromEpub(
            epub,
            {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              title: basename((bookPath.readaloud ?? bookPath.ebook)!, ".epub"),
            },
            {
              ...(collectionUuid && { collections: [collectionUuid] }),
              ...(bookPath.ebook && { ebook: { filepath: bookPath.ebook } }),
              ...(bookPath.readaloud && {
                readaloud: {
                  filepath: bookPath.readaloud,
                  status: "ALIGNED",
                  currentStage: "SPLIT_TRACKS",
                },
              }),
              ...(bookPath.audiobook && {
                audiobook: { filepath: bookPath.audiobook },
              }),
            },
          )
        } catch (e) {
          logger.error(
            `Encountered issue attempting to read EPUB file at ${bookPath.readaloud ?? bookPath.ebook}, skipping`,
          )
          logger.error(e)
          continue
        }

        try {
          await mkdir(getInternalBookDirectory(created))
        } catch (e) {
          if (e instanceof Error && "code" in e && e.code === "EEXIST") {
            created = await updateBook(created.uuid, {
              suffix: getDefaultSuffix(created.uuid),
            })
          }
        }

        const coverImage = await getEpubCover(created)
        if (coverImage) {
          await writeExtractedEbookCover(
            created,
            coverImage.filename,
            coverImage.data,
          )
          const optimized = await optimizeImage({
            buffer: coverImage.data,
            height: 225,
            width: 147,
            contentType: coverImage.mimeType,
          })

          await writeCachedCoverImage(created.uuid, "text", 225, 147, {
            ...coverImage,
            data: optimized,
          })
        }

        if (bookPath.audiobook) {
          const nestedBook = await getBookByAudiobookFilepathPrefix(
            bookPath.audiobook,
          )
          if (nestedBook) {
            logger.warn(
              `Found a new audiobook file in the folder ${bookPath.audiobook}, but the book ${nestedBook.title} already has audiobook files at ${nestedBook.audiobookFilepath}: skipping. Please place all files within book-specific folders: https://storyteller-platform.gitlab.io/storyteller/docs/managing/adding#organizing-your-auto-import-folder.`,
            )
            continue
          }
          const audiobookPath = bookPath.audiobook
          const entries = await readdir(audiobookPath)
          using audiobook = await Audiobook.from(
            ...(entries
              .filter((entry) => isAudioFile(entry))
              .map((relativePath) =>
                join(audiobookPath, relativePath),
              ) as AudiobookInputs),
          )

          const { update: audiobookUpdate, relations: audiobookRelations } =
            await getMetadataFromAudiobook(audiobook)

          audiobook.discardAndClose()

          const update = keepMissingMetadata(created, audiobookUpdate)
          const relations = keepMissingRelations(created, audiobookRelations)

          await updateBook(created.uuid, update, relations)

          const audioCover = await getAudioCover(created)

          if (audioCover) {
            await writeExtractedAudiobookCover(
              created,
              audioCover.filename,
              audioCover.data,
            )

            const optimized = await optimizeImage({
              buffer: Buffer.from(audioCover.data),
              height: 147,
              width: 147,
              contentType: audioCover.mimeType,
            })

            await writeCachedCoverImage(created.uuid, "audio", 147, 147, {
              ...audioCover,
              data: optimized,
            })
          }
        }
        await handleImportedFiles(created, bookPath, importMode, newSkipPaths)
      } else if (bookPath.audiobook) {
        const audiobookPath = bookPath.audiobook
        const entries = await readdir(audiobookPath)
        using audiobook = await Audiobook.from(
          ...(entries
            .filter((entry) => isAudioFile(entry))
            .map((relativePath) =>
              join(audiobookPath, relativePath),
            ) as AudiobookInputs),
        )

        let created = await createBookFromAudiobook(
          audiobook,
          {
            title: basename(audiobookPath),
          },
          {
            ...(collectionUuid && { collections: [collectionUuid] }),
            audiobook: { filepath: audiobookPath },
          },
        )
        audiobook.discardAndClose()

        try {
          await mkdir(getInternalBookDirectory(created))
        } catch (e) {
          if (e instanceof Error && "code" in e && e.code === "EEXIST") {
            created = await updateBook(created.uuid, {
              suffix: getDefaultSuffix(created.uuid),
            })
          }
        }

        const coverImage = await getAudioCover(created)
        if (coverImage) {
          await writeExtractedAudiobookCover(
            created,
            coverImage.filename,
            coverImage.data,
          )
          const optimized = await optimizeImage({
            buffer: coverImage.data,
            height: 147,
            width: 147,
            contentType: coverImage.mimeType,
          })

          coverImage.data = optimized
          await writeCachedCoverImage(
            created.uuid,
            "audio",
            147,
            147,
            coverImage,
          )
        }
        await handleImportedFiles(created, bookPath, importMode, newSkipPaths)
      }
      continue
    }

    if (
      bookPath.ebook === book.ebook?.filepath &&
      bookPath.readaloud === book.readaloud?.filepath &&
      bookPath.audiobook === book.audiobook?.filepath
    ) {
      // Book has already been imported and hasn't changed
      continue
    }

    let update: BookUpdate | null = null
    const relations: Parameters<typeof updateBook>[2] = {}

    if (bookPath.ebook && !book.ebook) {
      logger.debug(
        `Found new ebook file for ${book.title} at ${bookPath.ebook}. Importing metadata.`,
      )
      using epub = await Epub.from(bookPath.ebook)
      const { update: ebookUpdate, relations: ebookRelations } =
        await getMetadataFromEpub(epub)

      update = keepMissingMetadata(book, ebookUpdate)

      Object.assign(relations, {
        ...keepMissingRelations(book, ebookRelations),
        ebook: {
          filepath: bookPath.ebook,
          missing: false,
        },
      })
    }

    if (book.ebook?.filepath) {
      try {
        await stat(book.ebook.filepath)
        if (book.ebook.missing) {
          relations.ebook = {
            filepath: book.ebook.filepath,
            missing: false,
          }
        }
      } catch (e) {
        if (e instanceof Error && "code" in e && e.code === "ENOENT") {
          logger.debug(
            `Ebook file for ${book.title} is missing, was ${book.ebook.filepath}`,
          )
          relations.ebook = {
            filepath: book.ebook.filepath,
            missing: true,
          }
        }
      }
    }

    if (bookPath.audiobook && !book.audiobook) {
      logger.debug(
        `Found new audiobook file(s) for ${book.title} at ${bookPath.audiobook}. Importing.`,
      )

      const audiobookPath = bookPath.audiobook
      const entries = await readdir(audiobookPath)
      using audiobook = await Audiobook.from(
        ...(entries
          .filter((entry) => isAudioFile(entry))
          .map((relativePath) =>
            join(audiobookPath, relativePath),
          ) as AudiobookInputs),
      )

      const { update: audiobookUpdate, relations: audiobookRelations } =
        await getMetadataFromAudiobook(audiobook)

      audiobook.discardAndClose()

      if (!update) {
        update = keepMissingMetadata(book, audiobookUpdate)
      } else {
        Object.assign(update, keepMissingMetadata(book, audiobookUpdate))
      }

      Object.assign(relations, {
        ...keepMissingRelations(book, audiobookRelations),
        audiobook: {
          filepath: bookPath.audiobook,
        },
      })
    }

    if (book.audiobook?.filepath) {
      try {
        await stat(book.audiobook.filepath)
        if (book.audiobook.missing) {
          relations.audiobook = {
            filepath: book.audiobook.filepath,
            missing: false,
          }
        }
      } catch (e) {
        if (e instanceof Error && "code" in e && e.code === "ENOENT") {
          logger.debug(
            `Audiobook file for ${book.title} is missing, was ${book.audiobook.filepath}`,
          )
          relations.audiobook = {
            filepath: book.audiobook.filepath,
            missing: true,
          }
        }
      }
    }

    if (bookPath.readaloud && !book.readaloud) {
      logger.debug(
        `Found new readaloud book file for ${book.title} at ${bookPath.readaloud}. Importing metadata.`,
      )
      using epub = await Epub.from(bookPath.readaloud)
      const { update: readaloudUpdate, relations: readaloudRelations } =
        await getMetadataFromEpub(epub)

      if (!update) {
        update = keepMissingMetadata(book, readaloudUpdate)
      } else {
        Object.assign(update, keepMissingMetadata(book, readaloudUpdate))
      }

      Object.assign(relations, {
        ...keepMissingRelations(book, readaloudRelations),
        readaloud: {
          filepath: bookPath.readaloud,
          missing: false,
          status: "ALIGNED",
        },
      })
    }

    if (book.readaloud?.filepath) {
      try {
        await stat(book.readaloud.filepath)
        if (book.readaloud.missing) {
          relations.readaloud = {
            filepath: book.readaloud.filepath,
            missing: false,
            currentStage: book.readaloud.currentStage,
          }
        }
      } catch (e) {
        if (e instanceof Error && "code" in e && e.code === "ENOENT") {
          logger.debug(
            `Readaloud book file for ${book.title} is missing, was ${book.readaloud.filepath}`,
          )
          relations.readaloud = {
            filepath: book.readaloud.filepath,
            missing: true,
            currentStage: book.readaloud.currentStage,
          }
        }
      }
    }

    book = await updateBook(book.uuid, update, relations)

    const epubCover = await getEpubCover(book)
    if (epubCover) {
      await writeExtractedEbookCover(book, epubCover.filename, epubCover.data)
      const optimized = await optimizeImage({
        buffer: epubCover.data,
        height: 225,
        width: 147,
        contentType: epubCover.mimeType,
      })

      epubCover.data = optimized
      await writeCachedCoverImage(book.uuid, "text", 225, 147, epubCover)
    }

    const audioCover = await getAudioCover(book)
    if (audioCover) {
      await writeExtractedAudiobookCover(
        book,
        audioCover.filename,
        audioCover.data,
      )
      const optimized = await optimizeImage({
        buffer: audioCover.data,
        height: 147,
        width: 147,
        contentType: audioCover.mimeType,
      })

      audioCover.data = optimized
      await writeCachedCoverImage(book.uuid, "audio", 147, 147, audioCover)
    }
    const newFiles: BookPaths = {}
    if (relations.ebook && bookPath.ebook) newFiles.ebook = bookPath.ebook
    if (relations.audiobook && bookPath.audiobook)
      newFiles.audiobook = bookPath.audiobook
    if (relations.readaloud && bookPath.readaloud)
      newFiles.readaloud = bookPath.readaloud
    if (Object.keys(newFiles).length > 0) {
      book = await handleImportedFiles(book, newFiles, importMode, newSkipPaths)
    }
  }
  // Persist skip paths: add new ones, remove stale ones (files no longer in import directory)
  if (newSkipPaths.length > 0) {
    await db.insertInto("importSkipPath").values(newSkipPaths).execute()
  }
  const staleSkipPaths = [...skipPaths].filter((p) => !seenSkipPaths.has(p))
  if (staleSkipPaths.length > 0) {
    await db
      .deleteFrom("importSkipPath")
      .where("filepath", "in", staleSkipPaths)
      .execute()
  }

  logger.info("Scanning complete")
}
