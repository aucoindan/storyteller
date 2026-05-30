import { type Insertable, type Selectable, type Updateable } from "kysely"

import { type UUID } from "@/uuid"

import { db } from "./connection"
import { type DB } from "./schema"

export type UserBookRating = Selectable<DB["userBookRating"]>
export type NewUserBookRating = Insertable<DB["userBookRating"]>
export type UserBookRatingUpdate = Updateable<DB["userBookRating"]>

export async function getUserBookRating(userId: UUID, bookUuid: UUID) {
  return db
    .selectFrom("userBookRating")
    .selectAll()
    .where("userId", "=", userId)
    .where("bookUuid", "=", bookUuid)
    .executeTakeFirst()
}

export async function getUserRatings(userId: UUID) {
  return db
    .selectFrom("userBookRating")
    .selectAll()
    .where("userId", "=", userId)
    .execute()
}

export async function setUserBookRating(
  userId: UUID,
  bookUuid: UUID,
  values: { rating?: number | null; review?: string | null },
) {
  return db
    .insertInto("userBookRating")
    .values({ userId, bookUuid, ...values })
    .onConflict((oc) => oc.columns(["userId", "bookUuid"]).doUpdateSet(values))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export async function deleteUserBookRating(userId: UUID, bookUuid: UUID) {
  await db
    .deleteFrom("userBookRating")
    .where("userId", "=", userId)
    .where("bookUuid", "=", bookUuid)
    .execute()
}
