/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Represents a sequence of ordered mutations to a piece of
 * content. The content must be addressable by a flat integer
 * position system (e.g. a string).
 *
 * Once constructed, a cursor can be produced for mapping through
 * the changes via mapping.cursor(). cursor.map() can be used to
 * determine how the content at a given position was moved by the
 * mutations used to construct the map.
 */
export class Mapping {
  private compiledStarts = new Int32Array()
  /** Accumulated offset before each mutation */
  private compiledOffsets = new Int32Array()
  private compiledOldSizes = new Int32Array()
  private compiledNewSizes = new Int32Array()
  private totalOffset = 0

  private starts: number[] = []
  private oldSizes: number[] = []
  private newSizes: number[] = []

  private dirty = true

  private inverted: Mapping | null = null

  /**
   * Insert a map representation a mutation starting at
   * `start` in the original document, which mutated the
   * proceeding `oldSize` positions, resulting in content
   * of size `newSize`.
   */
  insertMap(start: number, oldSize: number, newSize: number) {
    const diff = newSize - oldSize
    if (diff === 0) return

    this.dirty = true
    this.inverted = null

    const last = this.starts.at(-1)
    if (last == undefined || last < start) {
      this.starts.push(start)
      this.oldSizes.push(oldSize)
      this.newSizes.push(newSize)
      return
    }

    const i = lowerBound(start, this.starts)

    const existing = this.starts[i]
    if (existing === start) {
      if (this.oldSizes[i] === newSize) {
        this.starts.splice(i, 1)
        this.oldSizes.splice(i, 1)
        this.newSizes.splice(i, 1)
        return
      }
      this.newSizes[i] = newSize
      return
    }

    this.starts.splice(i, 0, start)
    this.oldSizes.splice(i, 0, oldSize)
    this.newSizes.splice(i, 0, newSize)
  }

  private *entries() {
    for (let i = 0; i < this.starts.length; i++) {
      yield {
        start: this.starts[i]!,
        oldSize: this.oldSizes[i]!,
        newSize: this.newSizes[i]!,
      }
    }
  }

  /**
   * Appends each mutation in `mapping` in order.
   *
   * Assumes that the input mapping is based on
   * the current mapping's output position space.
   */
  appendMapping(mapping: Mapping) {
    const inverted = this.invert().cursor()

    // Rebase each incoming mutation from `mapping`'s input space (this
    // mapping's output space) back into the original position space.
    const rebasedStarts: number[] = []
    const rebasedOldSizes: number[] = []
    const rebasedNewSizes: number[] = []
    for (const { start, oldSize, newSize } of mapping.entries()) {
      const origStart = inverted.map(start)
      const origEnd = inverted.map(start + oldSize)
      rebasedStarts.push(origStart)
      rebasedOldSizes.push(origEnd - origStart)
      rebasedNewSizes.push(newSize)
    }

    // Merge the existing entries with the rebased incoming entries into a
    // single sorted, non-overlapping list. A rebased incoming entry describes
    // original -> final directly, so it supersedes any existing entry whose
    // original span it overlaps; overlapping spans are coalesced into one
    // entry (keeping the mapping monotonic).
    const starts: number[] = []
    const oldSizes: number[] = []
    const newSizes: number[] = []
    let i = 0
    let j = 0
    while (i < this.starts.length || j < rebasedStarts.length) {
      const takeExisting =
        j >= rebasedStarts.length ||
        (i < this.starts.length && this.starts[i]! < rebasedStarts[j]!)

      if (takeExisting) {
        starts.push(this.starts[i]!)
        oldSizes.push(this.oldSizes[i]!)
        newSizes.push(this.newSizes[i]!)
        i++
        continue
      }

      let start = rebasedStarts[j]!
      let end = start + rebasedOldSizes[j]!
      const newSize = rebasedNewSizes[j]!
      j++

      // Coalesce any already-emitted entry that overlaps from the left.
      while (
        starts.length > 0 &&
        starts[starts.length - 1]! + oldSizes[oldSizes.length - 1]! > start
      ) {
        start = Math.min(start, starts[starts.length - 1]!)
        end = Math.max(
          end,
          starts[starts.length - 1]! + oldSizes[oldSizes.length - 1]!,
        )
        starts.pop()
        oldSizes.pop()
        newSizes.pop()
      }

      // Coalesce existing entries whose span this incoming entry overlaps.
      while (i < this.starts.length && this.starts[i]! < end) {
        end = Math.max(end, this.starts[i]! + this.oldSizes[i]!)
        i++
      }

      const oldSize = end - start
      // Drop entries that collapse to a no-op after coalescing.
      if (oldSize !== newSize) {
        starts.push(start)
        oldSizes.push(oldSize)
        newSizes.push(newSize)
      }
    }

    this.starts = starts
    this.oldSizes = oldSizes
    this.newSizes = newSizes
    this.dirty = true
    this.inverted = null
  }

  private compile() {
    if (!this.dirty) return

    const entryCounts = this.starts.length

    this.compiledOffsets = new Int32Array(entryCounts)

    let total = 0
    let i = 0
    let prevEnd = -1
    for (const { start, oldSize, newSize } of this.entries()) {
      // Entries must be sorted and non-overlapping; overlapping entries
      // would make map() non-monotonic and silently corrupt positions.
      if (start < prevEnd) {
        throw new Error(
          `Mapping has overlapping entries: entry starting at ${start} overlaps previous entry ending at ${prevEnd}`,
        )
      }
      prevEnd = start + oldSize

      this.compiledOffsets[i++] = total

      const diff = newSize - oldSize

      total += diff
    }

    this.compiledStarts = Int32Array.from(this.starts)
    this.compiledOldSizes = Int32Array.from(this.oldSizes)
    this.compiledNewSizes = Int32Array.from(this.newSizes)
    this.totalOffset = total

    this.dirty = false
  }

  /**
   * Produces a cursor for mapping positions through the
   * mapping.
   *
   * For optimal performance, call cursor.map() with positions
   * in ascending order.
   */
  cursor() {
    this.compile()
    let cursor = 0
    const {
      compiledStarts: starts,
      compiledOffsets: offsets,
      compiledOldSizes: oldSizes,
      compiledNewSizes: newSizes,
      totalOffset,
    } = this
    return {
      map(position: number, assoc: "start" | "end" = "start") {
        const n = starts.length
        let i = cursor

        if (i < n && starts[i]! < position) {
          do {
            i++
          } while (i < n && starts[i]! < position)
        } else if (i > 0 && starts[i - 1]! >= position) {
          i = lowerBound(position, starts)
        }

        cursor = i

        // If the position falls inside the previous entry's span AND that
        // entry shrank its content (old > new), clamp it into the entry's
        // result region so the mapping stays monotonic (e.g. a word's end
        // offset landing on a deleted separator). For entries that grew
        // (old <= new, e.g. a character expanded to multi-char pinyin),
        // interior positions must instead distribute across the result, which
        // the fall-through below handles via the following entry's offset.
        if (
          i > 0 &&
          oldSizes[i - 1]! > newSizes[i - 1]! &&
          position < starts[i - 1]! + oldSizes[i - 1]!
        ) {
          const clamped = starts[i - 1]! + offsets[i - 1]!
          return clamped + (assoc === "start" ? 0 : newSizes[i - 1]!)
        }

        if (i === n) return position + totalOffset

        const start = starts[i]!
        const offset = offsets[i]!
        const insertion = oldSizes[i]! === 0

        if (!insertion || position < start) return position + offset

        return position + offset + (assoc === "start" ? 0 : newSizes[i]!)
      },
      /**
       * Produces the current cursor value. Can be used as
       * a snapshot to reset the cursor.
       */
      value() {
        return cursor
      },
      /**
       * Reset the cursor to a specific value.
       *
       * Can be used in conjunction with cursor.value()
       * to check the mapping on the same range of positions
       * twice without affecting performance.
       */
      reset(value: number) {
        cursor = value
      },
    }
  }

  /**
   * Produce a new mapping that maps positions from after
   * the tracked mutations back to the original content.
   */
  invert() {
    if (this.inverted) return this.inverted

    this.compile()
    const inverted = new Mapping()

    for (let i = 0; i < this.starts.length; i++) {
      const position = this.compiledStarts[i]!
      const offset = this.compiledOffsets[i]!
      const oldSize = this.compiledOldSizes[i]!
      const newSize = this.compiledNewSizes[i]!

      const invertedPos = position + offset

      const last = inverted.starts.at(-1)
      if (last === invertedPos) {
        const existingNewSize = inverted.newSizes.at(-1)!
        const existingOldSize = inverted.oldSizes.at(-1)!

        // Stack inverted deletions that resolve
        // to the same position
        if (existingOldSize === 0 && newSize === 0) {
          inverted.oldSizes[inverted.oldSizes.length - 1] = 0
          inverted.newSizes[inverted.newSizes.length - 1] =
            oldSize + existingNewSize
          continue
        }
      }

      inverted.starts.push(invertedPos)
      inverted.oldSizes.push(newSize)
      inverted.newSizes.push(oldSize)
    }

    this.inverted = inverted

    return inverted
  }
}

function lowerBound(position: number, starts: number[] | Int32Array) {
  let low = 0
  let high = starts.length
  while (low < high) {
    const mid = (low + high) >>> 1
    if (starts[mid]! < position) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  return low
}
