import {
  deleteProcessed,
  isReadaloudInFlight,
  resetReadaloudIfUnfinished,
} from "@/assets/fs"
import { withHasPermission } from "@/auth/auth"
import { getBooks } from "@/database/books"
import { type UUID } from "@/uuid"

export const dynamic = "force-dynamic"

/**
 * @summary Delete processed cache files for many books
 *
 * @desc Deletes processed (split and transcoded) audio and transcription
 *       files. Pass `bookUuids` to limit to specific books, or omit it to
 *       clear the cache for every book in the library.
 */
export const DELETE = withHasPermission("bookProcess")(async (request) => {
  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    // no body means clear everything
  }

  const rawUuids =
    body && typeof body === "object" && "bookUuids" in body
      ? (body as { bookUuids?: unknown }).bookUuids
      : undefined

  const bookUuids =
    Array.isArray(rawUuids) && rawUuids.every((u) => typeof u === "string")
      ? (rawUuids as UUID[])
      : null

  const books = await getBooks(bookUuids, request.auth.user.id)

  for (const book of books) {
    // don't pull the cache out from under a queued or running job
    if (isReadaloudInFlight(book)) continue

    await deleteProcessed(book)
    await resetReadaloudIfUnfinished(book)
  }

  return new Response(null, { status: 204 })
})
