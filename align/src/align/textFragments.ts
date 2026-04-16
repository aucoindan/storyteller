import { enumerate } from "itertools"
import { runes } from "runes2"

export class TextFragmentFactory {
  private runes: string[]
  private spans: string[]
  private spanStarts: number[]
  private charPositions: Map<string, number[]>

  constructor(casedSpans: string[], locale = new Intl.Locale("en-Latn-US")) {
    this.spans = casedSpans.map((span) => span.toLocaleLowerCase(locale))
    this.runes = runes(this.spans.join(""))
    this.spanStarts = []
    let start = 0
    for (const span of this.spans) {
      this.spanStarts.push(start)
      start += span.length
    }

    this.charPositions = new Map()
    for (const [i, char] of enumerate(this.runes)) {
      const positions = this.charPositions.get(char) ?? []
      positions.push(i)
      this.charPositions.set(char, positions)
    }
  }

  findMinimalFragment(spanIndex: number): string {
    const span = this.spans[spanIndex]
    if (!span) throw new RangeError(`Span index ${spanIndex} out of bounds`)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const startPos = this.spanStarts[spanIndex]!

    const chars = runes(span)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const firstChar = chars[0]!
    const candidates =
      this.charPositions.get(firstChar)?.filter((pos) => pos < startPos) ?? []

    let i = 1
    while (i < chars.length && candidates.length) {
      const toRemove: number[] = []

      const char = chars[i]
      for (let j = 0; j < candidates.length; j++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const candidate = candidates[j]!
        if (this.runes[candidate + i] !== char) {
          toRemove.push(j)
        }
      }
      toRemove.toReversed().map((r) => candidates.splice(r, 1))

      i++
    }

    let fragment = ""

    const start = chars.slice(0, i).join("")
    fragment += encodeTextFragmentPart(start)

    const remainingSpan = span.slice(i)
    let end = ""
    let e = remainingSpan.length - 1
    // Almost (?) every block span will end with a newline, but those
    // aren't really in the text so we can't include them in the fragments
    if (remainingSpan.at(-1) === "\n") e--
    while (remainingSpan.indexOf(end) !== e + 1 && e >= 0) {
      end = remainingSpan.slice(e)
      e--
    }

    // TODO: End might not be sufficient, check for suffix
    if (end) {
      fragment += `,${encodeTextFragmentPart(end)}`
    }

    // We didn't eliminate all candidates, so we start looking at prefixes
    if (candidates.length) {
      let p = 1
      while (p < startPos) {
        const toRemove: number[] = []
        const char = this.runes[startPos - p]
        for (let j = 0; j < candidates.length; j++) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const candidate = candidates[j]!
          if (this.runes[candidate - p] !== char) {
            toRemove.push(j)
          }
        }
        toRemove.toReversed().map((r) => candidates.splice(r, 1))

        p++

        if (!candidates.length) break
      }

      const prefix = this.runes.slice(startPos - p + 1, startPos).join("")

      fragment = `${encodeTextFragmentPart(prefix)}-,${fragment}`
    }

    return `:~:text=${fragment}`
  }
}

function encodeTextFragmentPart(part: string) {
  return encodeURIComponent(part)
    .replaceAll(/-/g, "%2d")
    .replaceAll(/,/g, "%2c")
}
