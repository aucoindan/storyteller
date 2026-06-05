import {
  deleteOriginals,
  deleteProcessed,
  isReadaloudInFlight,
  resetReadaloudIfUnfinished,
} from "@/assets/fs"
import { withHasPermission } from "@/auth/auth"
import { getBook, getBookUuid } from "@/database/books"
import { BookEvents } from "@/events"

type Params = Promise<{
  bookId: string
}>

/**
 * @summary Delete cache files for a book
 *
 * @desc Cache files are generated during processing. They include
 *       processed (split and transcoded) audio files, transcriptions, etc.
 */
export const DELETE = withHasPermission<Params>("bookProcess")(async (
  request,
  context,
) => {
  const { bookId } = await context.params
  const bookUuid = await getBookUuid(bookId)
  const book = await getBook(bookUuid, request.auth.user.id)
  if (!book) {
    return Response.json(
      { message: `Could not find book with id ${bookId}` },
      { status: 404 },
    )
  }
  if (isReadaloudInFlight(book)) {
    return Response.json(
      { message: "Can't clear cache while the book is queued or processing" },
      { status: 409 },
    )
  }

  const url = request.nextUrl
  const includeOriginals = typeof url.searchParams.get("originals") === "string"

  await Promise.all([
    deleteProcessed(book),
    ...(includeOriginals ? [deleteOriginals(book)] : []),
  ])

  await resetReadaloudIfUnfinished(book)

  if (includeOriginals) {
    BookEvents.emit("message", {
      type: "bookCacheDeleted",
      bookUuid,
      payload: undefined,
    })
  }

  return new Response(null, { status: 204 })
})
