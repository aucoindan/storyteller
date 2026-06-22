import { getBook, getOverlayClipsForBook } from "@/database/books"
import { logger } from "@/logger"
import { Storyteller, openPublication } from "@/modules/readium"
import { type AppStore } from "@/store/appState"
import { getLocalBookExtractedUrl } from "@/store/persistence/files"
import { bookshelfSlice } from "@/store/slices/bookshelfSlice"
import { generateTracks } from "@/store/tracks"
import { type UUID } from "@/uuid"

/**
 * Attaches the JS layer to a playback session that was started outside the app
 * (e.g. from Android Auto). It seeds the store with the currently-playing book
 * and connects a controller to the running native session, after which the
 * existing event listeners (storytellerEvents -> syncListeners) handle
 * persistence and the background sync task handles server sync — exactly as
 * they do when a book is opened from within the app.
 *
 * The native session is already playing at its resolved position, so this never
 * (re)loads or seeks the player; it only mirrors state and starts listening.
 */
export async function attachToAndroidAutoSession(
  store: AppStore,
  { bookUuid, format }: { bookUuid: UUID; format: "audiobook" | "readaloud" },
): Promise<void> {
  const book = await getBook(bookUuid)
  if (!book) {
    logger.debug(`attachToAndroidAutoSession: no book for ${bookUuid}`)
    return
  }

  // Readaloud progress is persisted as a fragment locator, which the native
  // side can only build once the publication is open. Audiobooks build their
  // locator from the track list alone, so they don't need this.
  if (format === "readaloud") {
    const clips = await getOverlayClipsForBook(bookUuid)
    await openPublication(
      bookUuid,
      getLocalBookExtractedUrl(bookUuid, format),
      clips ?? undefined,
    )
  }

  const tracks = await generateTracks(book, format)
  if (tracks.length === 0) {
    logger.debug(`attachToAndroidAutoSession: no tracks for ${bookUuid}`)
    return
  }

  store.dispatch(
    bookshelfSlice.actions.playerAttached({ bookUuid, format, tracks }),
  )

  await Storyteller.connectToActiveSession(tracks)
  logger.debug(
    `attachToAndroidAutoSession: attached to ${bookUuid} (${format})`,
  )
}
