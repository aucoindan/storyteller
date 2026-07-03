import { NextResponse } from "next/server"

import { withHasPermission } from "@/auth/auth"
import {
  type NewIdentifierType,
  createIdentifierType,
  getIdentifierTypes,
} from "@/database/identifiers"

/**
 * @summary List identifier types
 */
export const GET = withHasPermission("bookList")(async () => {
  const identifiers = await getIdentifierTypes()
  return NextResponse.json(identifiers)
})

/**
 * @summary Create an identifier type
 */
export const POST = withHasPermission("bookUpdate")(async (request) => {
  const body = (await request.json()) as NewIdentifierType
  if (body.kind) {
    return NextResponse.json({ message: "Cannot set kind" }, { status: 400 })
  }
  const created = await createIdentifierType(body)
  return NextResponse.json(created, { status: 201 })
})
