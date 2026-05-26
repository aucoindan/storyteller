import type { Database } from "better-sqlite3"
import {
  CamelCasePlugin,
  Kysely,
  ParseJSONResultsPlugin,
  SqliteDialect,
} from "kysely"

import { logger } from "@/logging"

import { BooleanPlugin } from "./plugins/booleanPlugin"
import { DatePlugin } from "./plugins/datePlugin"
import type { DB } from "./schema"

export const BOOLEAN_FIELDS = [
  "bookCreate",
  "bookDelete",
  "bookDownload",
  "bookList",
  "bookProcess",
  "bookRead",
  "bookUpdate",
  "collectionCreate",
  "featured",
  "inviteDelete",
  "inviteList",
  "isDefault",
  "missing",
  "public",
  "settingsUpdate",
  "userCreate",
  "userDelete",
  "userList",
  "userRead",
  "userUpdate",
  "restartPending",
] as const

export function createKyselyDb(sqlite: Database): Kysely<DB> {
  return new Kysely<DB>({
    dialect: new SqliteDialect({ database: sqlite }),
    plugins: [
      new CamelCasePlugin(),
      new ParseJSONResultsPlugin(),
      new DatePlugin(),
      new BooleanPlugin<DB>({ fields: [...BOOLEAN_FIELDS] }),
    ],
    log(event) {
      if (event.level === "error") {
        logger.error(event.query.sql)
        logger.error(event.error)
      }
    },
  })
}
