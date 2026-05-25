import { join } from "node:path"

import { NextResponse } from "next/server"
import { z } from "zod"

import { scan } from "@/assets/library/scanner/scan"
import { type Candidate } from "@/assets/library/scanner/types"
import { withHasPermission } from "@/auth/auth"
import { UPLOADS_DIR } from "@/directories"
import { logger } from "@/logging"
import { type UUID } from "@/uuid"

export const dynamic = "force-dynamic"

const BodySchema = z.object({
  bookUuid: z.string().min(1),
  collectionUuid: z.string().min(1).optional(),
})

/**
 * fallback for multi-file audiobook upload
 */
export const POST = withHasPermission("bookCreate")(async (request) => {
  const json = (await request.json().catch(() => null)) as unknown
  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid request body", issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const bookUuid = parsed.data.bookUuid as UUID
  const collectionUuid = parsed.data.collectionUuid as UUID | undefined
  const uuidDir = join(UPLOADS_DIR, bookUuid)

  const candidate: Candidate = {
    folder: uuidDir,
    format: "audiobook",
    filepath: uuidDir,
    bookUuidHint: bookUuid,
    importMode: "move",
    ...(collectionUuid && { collections: [collectionUuid] }),
  }

  try {
    await scan({
      source: "upload",
      request: { kind: "candidates", candidates: [candidate] },
      options: { force: true },
      signal: new AbortController().signal,
    })
    return new Response(null, { status: 204 })
  } catch (e) {
    logger.error(e)
    return NextResponse.json({ message: "Scan failed" }, { status: 500 })
  }
})
