import { NextResponse } from "next/server"

import { withHasPermission } from "@/auth/auth"
import {
  type NewExternalSource,
  createExternalSource,
  getExternalSources,
} from "@/database/externalSources"

/**
 * @summary List external sources
 */
export const GET = withHasPermission("bookList")(async () => {
  const sources = await getExternalSources()
  return NextResponse.json(sources)
})

/**
 * @summary Create an external source
 */
export const POST = withHasPermission("bookUpdate")(async (request) => {
  const body = (await request.json()) as NewExternalSource
  if (body.kind) {
    return NextResponse.json({ message: "Cannot set kind" }, { status: 400 })
  }
  const created = await createExternalSource(body)
  return NextResponse.json(created, { status: 201 })
})
