import { NextResponse } from "next/server"

import { withHasPermission } from "@/auth/auth"
import { type IdentifierRelation, updateBook } from "@/database/books"
import { getIdentifiers } from "@/database/identifiers"
import { type UUID } from "@/uuid"
import { queueWritesToFiles } from "@/writeToFiles/fileWriteDistributor"

type Params = Promise<{ bookId: UUID }>

/**
 * @summary List identifiers attached to a book
 */
export const GET = withHasPermission<Params>("bookList")(async (
  _request,
  context,
) => {
  const { bookId } = await context.params
  const identifiers = await getIdentifiers(bookId)
  return NextResponse.json(identifiers)
})

/**
 * @summary Replace the identifiers attached to a book
 */
export const PUT = withHasPermission<Params>("bookUpdate")(async (
  request,
  context,
) => {
  const { bookId } = await context.params
  const body = (await request.json()) as {
    identifiers: IdentifierRelation[]
  }

  await updateBook(bookId, null, { identifiers: body.identifiers })
  void queueWritesToFiles(bookId)

  return new Response(null, { status: 204 })
})
