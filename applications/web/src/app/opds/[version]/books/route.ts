import { buildAllBooks } from "@/opds/builders"
import { handleOpds, opdsOptions } from "@/opds/respond"

export const dynamic = "force-dynamic"

export const GET = handleOpds(
  ({ userId, version, config, page, searchParams }) => {
    // the `?format=` query filters which books are listed; the configured
    // `config.format` controls which acquisition links each book exposes.
    const formatFilter = searchParams.get("format") as
      | "ebook"
      | "audiobook"
      | "readaloud"
      | null

    return buildAllBooks(
      { userId, version, format: config.format },
      formatFilter ?? undefined,
      { page, pageSize: config.pageSize },
    )
  },
)

export const OPTIONS = opdsOptions
