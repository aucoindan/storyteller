import { NextResponse } from "next/server"

import { withHasPermission } from "@/auth/auth"
import {
  type ExternalSourceUpdate,
  deleteExternalSource,
  getExternalSource,
  updateExternalSource,
} from "@/database/externalSources"
import { type UUID } from "@/uuid"

type Params = Promise<{ sourceId: UUID }>

/**
 * @summary Get an external source
 */
export const GET = withHasPermission<Params>("bookList")(async (
  _request,
  context,
) => {
  const { sourceId } = await context.params
  const source = await getExternalSource(sourceId)
  return NextResponse.json(source)
})

/**
 * @summary Update an external source
 */
export const PUT = withHasPermission<Params>("bookUpdate")(async (
  request,
  context,
) => {
  const { sourceId } = await context.params
  const body = (await request.json()) as ExternalSourceUpdate

  if ("kind" in body) {
    return NextResponse.json({ message: "Cannot set kind" }, { status: 400 })
  }

  const source = await getExternalSource(sourceId)

  if (source.kind) {
    return NextResponse.json(
      { message: "Cannot update built-in source" },
      { status: 400 },
    )
  }

  await updateExternalSource(sourceId, body)
  return new Response(null, { status: 204 })
})

/**
 * @summary Delete an external source
 */
export const DELETE = withHasPermission<Params>("bookUpdate")(async (
  _request,
  context,
) => {
  const { sourceId } = await context.params

  const source = await getExternalSource(sourceId)
  if (source.kind) {
    return NextResponse.json(
      { message: "Cannot delete built-in source" },
      { status: 400 },
    )
  }

  await deleteExternalSource(sourceId)
  return new Response(null, { status: 204 })
})
