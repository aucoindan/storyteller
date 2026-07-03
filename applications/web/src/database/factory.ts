import type { Database } from "better-sqlite3"
import {
  CamelCasePlugin,
  Kysely,
  ParseJSONResultsPlugin,
  SqliteDialect,
} from "kysely"

import { env } from "@/env"
import { logger } from "@/logging"

import { BooleanPlugin } from "./plugins/booleanPlugin"
import { DatePlugin } from "./plugins/datePlugin"
import type { DB } from "./schema"

export function createKyselyDb(sqlite: Database): Kysely<DB> {
  return new Kysely<DB>({
    dialect: new SqliteDialect({ database: sqlite }),
    plugins: [
      new CamelCasePlugin(),
      new ParseJSONResultsPlugin(),
      new DatePlugin(),
      new BooleanPlugin<DB>({
        fields: {
          bookCreate: true,
          bookDelete: true,
          bookDownload: true,
          bookList: true,
          bookProcess: true,
          bookRead: true,
          bookUpdate: true,
          collectionCreate: true,
          featured: true,
          inviteDelete: true,
          inviteList: true,
          isDefault: true,
          missing: true,
          public: true,
          settingsUpdate: true,
          userCreate: true,
          userDelete: true,
          userList: true,
          userPasswordReset: true,
          userRead: true,
          userUpdate: true,
          isEpub2: true,
        },
      }),
    ],
    log(event) {
      if (event.level === "error") {
        logger.error(event.query.sql)
        logger.error(event.error)
      }
      if (
        env.STORYTELLER_LOG_LEVEL === "trace" &&
        event.queryDurationMillis > 10
      ) {
        logger.trace(event.query.sql)
        logger.trace(event.query.parameters)
        logger.trace(`Completed in ${event.queryDurationMillis}ms`)
      }
    },
  })
}
