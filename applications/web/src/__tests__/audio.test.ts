import assert from "node:assert"
import { join } from "node:path"
import { describe, it } from "node:test"

import { getTrackDuration, isAudioFile, isZipArchive } from "@/audio"

void describe("getTrackInfo", () => {
  void it("can get track duration from an mp3 file", async () => {
    const duration = await getTrackDuration(
      join("src", "__fixtures__", "mp3", "mobydick_001_002_melville.mp3"),
    )
    assert.strictEqual(Math.floor(duration), 1436)
  })

  void it("can get track info from an mp4 file", async () => {
    const duration = await getTrackDuration(
      join(
        "src",
        "__fixtures__",
        "mpeg4",
        "MobyDickOrTheWhalePart1_librivox.m4b",
      ),
    )
    assert.strictEqual(Math.floor(duration), 18742)
  })
})

void describe("isAudioFile", () => {
  void it("recognizes mp3, mp4, and opus formats", () => {
    assert.ok(isAudioFile(".mp3"))
    assert.ok(isAudioFile(".m4a"))
    assert.ok(isAudioFile(".m4b"))
    assert.ok(isAudioFile(".mp4"))
    assert.ok(isAudioFile(".aac"))
    assert.ok(isAudioFile(".ogg"))
    assert.ok(isAudioFile(".oga"))
    assert.ok(isAudioFile(".opus"))
  })

  void it("recognizes file formats we don't use", () => {
    assert.ok(isAudioFile(".flac"))
    assert.ok(isAudioFile(".wav"))
  })

  void it("does not recognize other formats", () => {
    assert.ok(!isAudioFile(".json"))
    assert.ok(!isAudioFile(".epub"))
    assert.ok(!isAudioFile(".html"))
    assert.ok(!isAudioFile(".zip"))
    assert.ok(!isAudioFile(".txt"))
  })

  void it("works with full file names", () => {
    assert.ok(isAudioFile("somefile.m4b"))
    assert.ok(isAudioFile("audiobook/chapter 1.mp3"))
    assert.ok(isAudioFile("audio.book/chapter.1.flac"))
    assert.ok(!isAudioFile("cover.png"))
    assert.ok(!isAudioFile("A Book.epub"))
    assert.ok(!isAudioFile("README.txt"))
  })

  void it("ignores extension casing, which rips from older tools vary", () => {
    // "Track 01.MP3" is the same audio as "Track 01.mp3"; a case-sensitive
    // check silently dropped every track of an uppercase rip, so the book
    // imported with no audio at all.
    assert.ok(isAudioFile("Track 01.MP3"))
    assert.ok(isAudioFile("Track 01.Mp3"))
    assert.ok(isAudioFile("book.M4B"))
    assert.ok(isAudioFile(".FLAC"))
    assert.ok(!isAudioFile("README.TXT"))
  })
})

void describe("isZipArchive", () => {
  void it("accepts .zip regardless of casing", () => {
    assert.ok(isZipArchive("book.zip"))
    assert.ok(isZipArchive("book.ZIP"))
    assert.ok(!isZipArchive("book.epub"))
  })
})
