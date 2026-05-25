import { randomBytes } from "node:crypto"
import { mkdir, readdir, rm } from "node:fs/promises"
import { basename, extname, join } from "node:path"

import { FileStore } from "@tus/file-store"
import { Server } from "@tus/server"
import { lookup } from "mime-types"
import { type NextRequest } from "next/server"

import { move } from "@/assets/fs"
import { scan } from "@/assets/library/scanner/scan"
import { type Candidate } from "@/assets/library/scanner/types"
import { isAudioFile, isZipArchive, lookupAudioMime } from "@/audio"
import { withHasPermission } from "@/auth/auth"
import { UPLOADS_DIR } from "@/directories"
import { logger } from "@/logging"
import { type UUID } from "@/uuid"

const inProgressAudioUploads = new Set<string>()

/* the default naming func found in @tus/server */
const defaultNamingFunc = () => randomBytes(16).toString("hex")

const server = new Server({
  path: "/api/v2/books/upload",
  respectForwardedHeaders: true,
  onResponseError(_req, err) {
    if ("status_code" in err && err.status_code === 404) return undefined
    logger.error(`Upload server encountered error`)
    logger.error(err)
    return undefined
  },

  datastore: new FileStore({ directory: UPLOADS_DIR }),
  namingFunction(_req, metadata) {
    if (!metadata?.["filename"]) return defaultNamingFunc()
    const extension = extname(metadata["filename"])
    if (!extension) return defaultNamingFunc()
    return `${defaultNamingFunc()}${extension}`
  },
  onUploadFinish: async (_req, upload) => {
    if (!upload.metadata) {
      return {
        status_code: 405,
        body: "Missing required file metadata: bookId, filename, filetype (optional)",
      }
    }

    try {
      const bookUuid = upload.metadata["bookUuid"] as UUID | undefined
      if (!bookUuid) {
        return { status_code: 405, body: "Missing required metadata: bookUuid" }
      }

      const filename = upload.metadata["filename"]
      if (!filename) {
        return { status_code: 405, body: "Missing required metadata: filename" }
      }

      const filetype =
        upload.metadata["filetype"] ??
        lookupAudioMime(filename) ??
        lookup(filename)

      const collectionUuid = upload.metadata["collection"] as UUID | undefined

      const isEpub =
        filetype !== false &&
        (filetype.startsWith("application/epub") || filetype === "image/epub")

      const isAudiobook = isAudioFile(filename) || isZipArchive(filename)
      if (!isEpub && !isAudiobook) {
        return {
          status_code: 405,
          body: `Invalid upload type. Expected application/epub+zip, audio/*, or video/mp4, received "${upload.metadata["filetype"]}" from browser and "${lookupAudioMime(filename) ?? lookup(filename)}" from extension`,
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const uploadPath = upload.storage!.path
      // make uuid dir in uploads dir
      const uuidDir = join(UPLOADS_DIR, bookUuid)
      await mkdir(uuidDir, { recursive: true })

      const newUploadPath = join(uuidDir, filename)
      await move(uploadPath, newUploadPath)

      const candidates: Candidate[] = []
      if (isEpub) {
        candidates.push({
          folder: uuidDir,
          format: "ebook",
          filepath: newUploadPath,
          titleHint: basename(filename, extname(filename)),
          bookUuidHint: bookUuid,
          ...(collectionUuid && { collections: [collectionUuid] }),
          importMode: "move",
          // override other possible strategy, doesn't make sense to skip or backup-and-convert
          epub2ImportStrategy: "replace",
        })
      }

      if (isAudiobook) {
        // wait until all audio files have landed in uuidDir before scanning
        const totalAudioFilesMeta = upload.metadata["totalAudioFiles"]
        const totalAudioFiles =
          totalAudioFilesMeta && /^\d+$/.test(totalAudioFilesMeta)
            ? parseInt(totalAudioFilesMeta, 10)
            : null

        if (totalAudioFiles !== null && totalAudioFiles > 1) {
          const entries = await readdir(uuidDir).catch(() => [] as string[])
          const arrived = entries.filter(
            (name) => isAudioFile(name) || isZipArchive(name),
          ).length
          const stillInFlight = inProgressAudioUploads.has(bookUuid)
          if (arrived < totalAudioFiles || stillInFlight) {
            // siblings still in flight; the last one to arrive will scan.
            return {}
          }
          inProgressAudioUploads.add(bookUuid)
          const stack = new DisposableStack()
          stack.defer(() => {
            inProgressAudioUploads.delete(bookUuid)
          })
        }

        candidates.push({
          folder: uuidDir,
          format: "audiobook",
          filepath: uuidDir,
          titleHint: basename(filename, extname(filename)),
          bookUuidHint: bookUuid,
          ...(collectionUuid && { collections: [collectionUuid] }),
          importMode: "move",
        })
      }

      await scan({
        source: "upload",
        request: { kind: "candidates", candidates },
        options: { force: true },
        signal: new AbortController().signal,
      })

      return {}
    } catch (e) {
      logger.error(e)
      throw e
    } finally {
      if (upload.storage?.path) {
        await rm(upload.storage.path, { force: true })
        await rm(`${upload.storage.path}.json`, { force: true })
      }
    }
  },
})

export const GET = withHasPermission("bookCreate")(async (req: NextRequest) =>
  server.handleWeb(req),
)
export const PATCH = withHasPermission("bookCreate")(async (req: NextRequest) =>
  server.handleWeb(req),
)
export const POST = withHasPermission("bookCreate")(async (req: NextRequest) =>
  server.handleWeb(req),
)
export const DELETE = withHasPermission("bookCreate")(
  async (req: NextRequest) => server.handleWeb(req),
)
export const OPTIONS = withHasPermission("bookCreate")(
  async (req: NextRequest) => server.handleWeb(req),
)
export const HEAD = withHasPermission("bookCreate")(async (req: NextRequest) =>
  server.handleWeb(req),
)
