import { NextResponse } from "next/server"

import { getTagByUuid } from "@/database/tags"
import { buildTagBooks } from "@/opds/builders"
import { handleOpds, opdsOptions } from "@/opds/respond"
import type { UUID } from "@/uuid"

export const dynamic = "force-dynamic"

export const GET = handleOpds<{ version: string; tagId: string }>(
  async ({ userId, version, params, config, page }) => {
    const tag = await getTagByUuid(params.tagId as UUID, userId)
    if (!tag) return new NextResponse("Tag not found", { status: 404 })

    return buildTagBooks({ userId, version, format: config.format }, tag, {
      page,
      pageSize: config.pageSize,
    })
  },
)

export const OPTIONS = opdsOptions
