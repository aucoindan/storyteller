import { buildRootCatalog } from "@/opds/builders"
import { handleOpds, opdsOptions } from "@/opds/respond"

export const dynamic = "force-dynamic"

export const GET = handleOpds(({ userId, version }) =>
  buildRootCatalog({ userId, version }),
)

export const OPTIONS = opdsOptions
