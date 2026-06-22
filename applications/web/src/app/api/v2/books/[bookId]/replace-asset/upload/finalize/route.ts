import { join } from "path"

import { NextResponse } from "next/server"
import { z } from "zod"

import { replaceBookAssetFromUpload } from "@/assets/library/scanner/replaceAsset"
import { withHasPermission } from "@/auth/auth"
import { getBook, getBookUuid } from "@/database/books"
import { MetadataFieldOverridesSchema } from "@/database/settingsTypes"
import { UPLOADS_DIR } from "@/directories"
import { logger } from "@/logging"

export const dynamic = "force-dynamic"

type Params = Promise<{
  bookId: string
}>

const BodySchema = z.object({
  metadataFieldOverrides: MetadataFieldOverridesSchema.optional(),
  batchId: z.string().min(1),
})

/**
 * fallback route for multi-file audiobook replace-uploads.
 * manually allows you to scan the audiobook directory after all the tracks have been uploaded
 * in case some fail
 */
export const POST = withHasPermission<Params>("bookUpdate")(async (
  request,
  context,
) => {
  const { bookId } = await context.params
  const bookUuid = await getBookUuid(bookId)
  const book = await getBook(bookUuid)
  if (!book) {
    return NextResponse.json(
      { message: `Could not find book with id ${bookId}` },
      { status: 404 },
    )
  }

  const json = (await request.json().catch(() => null)) as unknown
  const parsed = BodySchema.safeParse(json ?? {})
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid request body", issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const batchUuidDir = join(UPLOADS_DIR, bookUuid, parsed.data.batchId)

  try {
    await replaceBookAssetFromUpload({
      book,
      uploadPath: batchUuidDir,
      format: "audiobook",
      metadataFieldOverrides: parsed.data.metadataFieldOverrides,
      signal: new AbortController().signal,
    })
    return new Response(null, { status: 204 })
  } catch (e) {
    logger.error(e)
    return NextResponse.json({ message: "Scan failed" }, { status: 500 })
  }
})
