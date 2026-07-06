import { buildSearchResults } from "@/opds/builders"
import { handleOpds, opdsOptions } from "@/opds/respond"

export const dynamic = "force-dynamic"

export const GET = handleOpds(({ userId, version, config, searchParams }) =>
  buildSearchResults(
    { userId, version, format: config.format },
    searchParams.get("query"),
  ),
)

export const OPTIONS = opdsOptions
