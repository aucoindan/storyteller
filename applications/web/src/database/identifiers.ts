import { type Insertable, type Selectable, type Updateable } from "kysely"

import { type UUID } from "@/uuid"

import { db } from "./connection"
import { type DB } from "./schema"

export const IDENTIFIER_KINDS = [
  "doi",
  "asin",
  "isbn-13",
  "hardcover-edition-id",
  "hardcover-book-slug",
] as const
export type IdentifierKind = (typeof IDENTIFIER_KINDS)[number]

export type IdentifierType = Selectable<DB["identifierType"]>
export type NewIdentifierType = Insertable<DB["identifierType"]>
export type IdentifierTypeUpdate = Updateable<DB["identifierType"]>

// export type Identifier = Selectable<DB["identifier"]>
export type NewIdentifier = Insertable<DB["identifier"]>
export type IdentifierUpdate = Updateable<DB["identifier"]>

export async function getIdentifierTypes() {
  return db.selectFrom("identifierType").selectAll().execute()
}

export async function getIdentifierType(uuid: UUID) {
  return db
    .selectFrom("identifierType")
    .selectAll()
    .where("uuid", "=", uuid)
    .executeTakeFirstOrThrow()
}

export async function createIdentifierType(values: NewIdentifierType) {
  return db
    .insertInto("identifierType")
    .values(values)
    .returningAll()
    .executeTakeFirstOrThrow()
}

export async function updateIdentifierType(
  uuid: UUID,
  update: IdentifierTypeUpdate,
) {
  await db
    .updateTable("identifierType")
    .set(update)
    .where("uuid", "=", uuid)
    .execute()
}

export async function deleteIdentifierType(uuid: UUID) {
  await db.deleteFrom("identifierType").where("uuid", "=", uuid).execute()
}

export type Identifier = Awaited<ReturnType<typeof getIdentifiers>>[number]

export async function getIdentifiers(bookUuid: UUID) {
  return db
    .selectFrom("identifier")
    .innerJoin(
      "identifierType",
      "identifier.identifierTypeUuid",
      "identifierType.uuid",
    )
    .select([
      "identifier.uuid",
      "identifier.bookUuid",
      "identifier.identifierTypeUuid",
      "identifier.value",
      "identifier.ebookUuid",
      "identifier.audiobookUuid",
      "identifier.readaloudUuid",
      "identifier.createdAt",
      "identifier.updatedAt",
      "identifierType.name as identifierTypeName",
      "identifierType.urlTemplate",
      "identifierType.externalSourceUuid",
    ])
    .where("identifier.bookUuid", "=", bookUuid)
    .execute()
}

export async function deleteIdentifier(uuid: UUID) {
  await db.deleteFrom("identifier").where("uuid", "=", uuid).execute()
}

export async function updateIdentifier(uuid: UUID, update: IdentifierUpdate) {
  await db
    .updateTable("identifier")
    .set(update)
    .where("uuid", "=", uuid)
    .execute()
}
