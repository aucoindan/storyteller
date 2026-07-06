import { NextResponse } from "next/server"

import { getSeriesByUuid } from "@/database/series"
import { buildSeriesBooks } from "@/opds/builders"
import { handleOpds, opdsOptions } from "@/opds/respond"
import type { UUID } from "@/uuid"

export const dynamic = "force-dynamic"

export const GET = handleOpds<{ version: string; seriesId: string }>(
  async ({ userId, version, params, config, page }) => {
    const series = await getSeriesByUuid(params.seriesId as UUID, userId)
    if (!series) return new NextResponse("Series not found", { status: 404 })

    return buildSeriesBooks(
      { userId, version, format: config.format },
      series,
      {
        page,
        pageSize: config.pageSize,
      },
    )
  },
)

export const OPTIONS = opdsOptions
