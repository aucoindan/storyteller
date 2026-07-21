import assert from "node:assert"
import { describe, it } from "node:test"

import { seedBooks, setupTestDb } from "@/__tests__/harness/testDb"
import { getBook, updateBook } from "@/database/books"
import { type UUID } from "@/uuid"

void describe("extracted identifiers", () => {
  void it("links identifiers from a file to the book's format row via updateBook", async () => {
    using ctx = setupTestDb()
    const [bookUuid] = seedBooks(ctx, [
      { title: "Book", ebook: "/tmp/book.epub" },
    ]) as UUID[]

    await updateBook(bookUuid!, null, {
      extractedIdentifiers: {
        format: "ebook",
        entries: [
          { scheme: "goodreads", value: "223855250" },
          { scheme: "isbn-13", value: "9781685891664" },
        ],
      },
    })

    const book = await getBook(bookUuid!)
    assert.ok(book?.ebook)

    // linked to the ebook, not at book level
    assert.strictEqual(book.identifiers.length, 0)

    const ebookIds = book.ebook.identifiers
    assert.strictEqual(ebookIds.length, 2)
    // unknown scheme -> auto-created type named after the scheme
    assert.ok(
      ebookIds.some((i) => i.value === "223855250" && i.name === "Goodreads"),
    )
    assert.ok(ebookIds.some((i) => i.value === "9781685891664"))
  })

  void it("is idempotent and additive across re-scans", async () => {
    using ctx = setupTestDb()
    const [bookUuid] = seedBooks(ctx, [
      { title: "Book", ebook: "/tmp/book.epub" },
    ]) as UUID[]

    const link = (entries: { scheme: string; value: string }[]) =>
      updateBook(bookUuid!, null, {
        extractedIdentifiers: { format: "ebook", entries },
      })

    await link([{ scheme: "goodreads", value: "223855250" }])
    // re-linking the same identifier does not duplicate it
    await link([{ scheme: "goodreads", value: "223855250" }])
    // a new identifier is added alongside the existing one
    await link([{ scheme: "amazon", value: "B0DTN2CKDR" }])

    const book = await getBook(bookUuid!)
    const values = book?.ebook?.identifiers.map((i) => i.value).sort()
    assert.deepStrictEqual(values, ["223855250", "B0DTN2CKDR"])
  })

  void it("does not touch another format's identifiers", async () => {
    using ctx = setupTestDb()
    const [bookUuid] = seedBooks(ctx, [
      { title: "Book", ebook: "/tmp/book.epub", audiobook: "/tmp/audio" },
    ]) as UUID[]

    await updateBook(bookUuid!, null, {
      extractedIdentifiers: {
        format: "ebook",
        entries: [{ scheme: "goodreads", value: "111" }],
      },
    })
    await updateBook(bookUuid!, null, {
      extractedIdentifiers: {
        format: "audiobook",
        entries: [{ scheme: "audible", value: "B007FGF3P4" }],
      },
    })

    const book = await getBook(bookUuid!)
    assert.ok(book?.ebook && book.audiobook)
    assert.deepStrictEqual(
      book.ebook.identifiers.map((i) => i.value),
      ["111"],
    )
    assert.deepStrictEqual(
      book.audiobook.identifiers.map((i) => i.value),
      ["B007FGF3P4"],
    )
  })
})
