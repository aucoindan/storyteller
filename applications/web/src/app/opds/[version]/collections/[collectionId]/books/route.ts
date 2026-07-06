import { NextResponse } from "next/server"

import { getCollection } from "@/database/collections"
import { buildCollectionBooks } from "@/opds/builders"
import { handleOpds, opdsOptions } from "@/opds/respond"
import type { UUID } from "@/uuid"

export const dynamic = "force-dynamic"

export const GET = handleOpds<{ version: string; collectionId: string }>(
  async ({ userId, version, params, config, page }) => {
    try {
      const collection = await getCollection(
        params.collectionId as UUID,
        userId,
      )

      return await buildCollectionBooks(
        { userId, version, format: config.format },
        collection,
        { page, pageSize: config.pageSize },
      )
    } catch {
      return new NextResponse("Collection not found", { status: 404 })
    }
  },
)

export const OPTIONS = opdsOptions
