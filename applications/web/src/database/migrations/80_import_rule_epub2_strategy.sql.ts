import { sql } from "kysely"

import { db } from "@/database/connection"

const hasColumn = async (trx: typeof db, table: string, column: string) => {
  const tables = await trx.introspection.getTables()
  const tableMetadata = tables.find((t) => t.name === table)
  if (!tableMetadata) return false

  return tableMetadata.columns.some((col) => col.name === column)
}

export default async function migrate() {
  await db.transaction().execute(async (trx) => {
    if (!(await hasColumn(trx, "import_rule", "epub2_import_strategy"))) {
      await sql`
        ALTER TABLE import_rule
        ADD COLUMN epub2_import_strategy TEXT DEFAULT NULL;
      `.execute(trx)
    }
  })
}
