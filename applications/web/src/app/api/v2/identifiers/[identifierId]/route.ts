import { NextResponse } from "next/server"

import { withHasPermission } from "@/auth/auth"
import {
  type IdentifierUpdate,
  deleteIdentifierType,
  getIdentifierType,
  updateIdentifierType,
} from "@/database/identifiers"
import { type UUID } from "@/uuid"

type Params = Promise<{ identifierId: UUID }>

/**
 * @summary Get an identifier type
 */
export const GET = withHasPermission<Params>("bookList")(async (
  _request,
  context,
) => {
  const { identifierId } = await context.params
  const identifier = await getIdentifierType(identifierId)
  return NextResponse.json(identifier)
})

/**
 * @summary Update an identifier type
 */
export const PUT = withHasPermission<Params>("bookUpdate")(async (
  request,
  context,
) => {
  const { identifierId } = await context.params
  const body = (await request.json()) as IdentifierUpdate

  if ("kind" in body) {
    return NextResponse.json({ message: "Cannot set kind" }, { status: 400 })
  }

  const identifier = await getIdentifierType(identifierId)

  if (identifier.kind) {
    return NextResponse.json(
      { message: "Cannot update built-in identifier" },
      { status: 400 },
    )
  }

  await updateIdentifierType(identifierId, body)
  return new Response(null, { status: 204 })
})

/**
 * @summary Delete an identifier type
 */
export const DELETE = withHasPermission<Params>("bookUpdate")(async (
  _request,
  context,
) => {
  const { identifierId } = await context.params

  const identifier = await getIdentifierType(identifierId)
  if (identifier.kind) {
    return NextResponse.json(
      { message: "Cannot delete built-in identifier" },
      { status: 400 },
    )
  }

  await deleteIdentifierType(identifierId)
  return new Response(null, { status: 204 })
})
