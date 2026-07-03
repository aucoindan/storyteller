import { withHasPermission } from "@/auth/auth"
import {
  type IdentifierUpdate,
  deleteIdentifier,
  updateIdentifier,
} from "@/database/identifiers"
import { type UUID } from "@/uuid"

type Params = Promise<{ bookId: UUID; identifierBookId: UUID }>

/**
 * @summary Update a book identifier entry
 */
export const PUT = withHasPermission<Params>("bookUpdate")(async (
  request,
  context,
) => {
  const { identifierBookId } = await context.params
  const body = (await request.json()) as IdentifierUpdate
  await updateIdentifier(identifierBookId, body)
  return new Response(null, { status: 204 })
})

/**
 * @summary Remove a book identifier entry
 */
export const DELETE = withHasPermission<Params>("bookUpdate")(async (
  _request,
  context,
) => {
  const { identifierBookId } = await context.params
  await deleteIdentifier(identifierBookId)
  return new Response(null, { status: 204 })
})
