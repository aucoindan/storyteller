import assert from "node:assert"
import { describe, it } from "node:test"

import { quotePath } from "@/shell"

void describe("quotePath", () => {
  void it("escapes shell variable expansion in paths", () => {
    assert.strictEqual(
      quotePath("/data/assets/$100M Offers/audio/100m-offers.mp3"),
      '"/data/assets/\\$100M Offers/audio/100m-offers.mp3"',
    )
  })

  void it("escapes double quotes in paths", () => {
    assert.strictEqual(
      quotePath('/data/assets/A "Quoted" Book/audio.mp3'),
      '"/data/assets/A \\"Quoted\\" Book/audio.mp3"',
    )
  })
})
