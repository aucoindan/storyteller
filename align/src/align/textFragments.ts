import { enumerate, min } from "itertools"
import { runes } from "runes2"

export class TextFragmentTrie {
  private root = new Node(null, "")
  private spans: string[]

  constructor(casedSpans: string[], locale = new Intl.Locale("en-Latn-US")) {
    this.spans = casedSpans.map((span) => span.toLocaleLowerCase(locale))

    for (const [i, span] of enumerate(this.spans)) {
      const parents = [this.root]
      for (const [j, char] of enumerate(runes(span))) {
        for (const [k, parent] of enumerate(parents)) {
          const newNode = new Node(parent, char, { span: i, pos: j })
          let node = parent.children.find((child) => child.eq(newNode))

          if (!node) {
            node = newNode
            parent.children.push(node)
          } else {
            node.indices.push({ span: i, pos: j })
          }

          parents[k] = node
        }

        parents.push(this.root)
      }
    }
  }

  findMinimalFragment(spanIndex: number): string {
    let node = this.root

    while (node.children.length) {
      const candidates = node.children.filter((child) =>
        child.indices.some(
          ({ span: childSpanIndex }) => childSpanIndex === spanIndex,
        ),
      )

      const child = min(
        candidates,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (c) => c.indices.find((i) => i.span === spanIndex)!.pos,
      )

      if (!child) {
        return this.nodeToFragment(node, spanIndex, true)
      }

      if (child.indices.length === 1) {
        return this.nodeToFragment(child, spanIndex)
      }

      node = child
    }

    // Note: This is not a unique node!
    return this.nodeToFragment(node, spanIndex, true)
  }

  nodeToFragment(node: Node, spanIndex: number, findPrefix?: boolean): string {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const span = this.spans[spanIndex]!

    let fragment = ":~:text="

    let prefix = ""
    if (findPrefix) {
      const prev = this.spans[spanIndex - 1]
      if (prev) {
        const prefixes = node.indices
          .filter(({ span: s }) => s !== spanIndex)
          .map(({ span: spanIndex, pos }) => {
            let startNode: Node = node
            let startPos = pos
            while (startNode.parent && startNode.parent !== this.root) {
              startPos -= startNode.value.length
              startNode = startNode.parent
            }

            const prev = this.spans[spanIndex - 1]
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const span = this.spans[spanIndex]!
            return (prev ?? "") + span.slice(0, startPos)
          })

        const reversedPrefixes = prefixes.map((p) => runes(p).toReversed())

        for (const [i, char] of enumerate(runes(prev).toReversed())) {
          prefix = char + prefix
          for (const [j, p] of enumerate([...reversedPrefixes.toReversed()])) {
            if (p[i] !== char) {
              reversedPrefixes.splice(reversedPrefixes.length - 1 - j, 1)
            }
          }
          if (reversedPrefixes.length === 0) {
            break
          }
        }
      }
    }

    if (prefix) {
      fragment += `${encodeTextFragmentPart(prefix)}-,`
    }

    let startNode: Node | null = node
    let start = ""
    while (startNode) {
      start = startNode.value + start
      startNode = startNode.parent
    }

    fragment += encodeTextFragmentPart(start)

    const remainingSentence = span.slice(start.length + node.value.length)

    let end = ""
    let i = remainingSentence.length - 1
    while (remainingSentence.indexOf(end) !== i + 1 && i >= node.value.length) {
      end = remainingSentence.slice(i)
      i--
    }

    if (end) {
      fragment += `,${encodeTextFragmentPart(end)}`
    }

    return fragment
  }
}

function encodeTextFragmentPart(part: string) {
  return encodeURIComponent(part)
    .replaceAll(/-/g, "%2d")
    .replaceAll(/,/g, "%2c")
}

class Node {
  public children: Node[] = []
  public indices: { span: number; pos: number }[] = []

  constructor(
    public parent: Node | null,
    public value: string,
    firstIndex?: { span: number; pos: number },
  ) {
    if (firstIndex !== undefined) {
      this.indices.push(firstIndex)
    }
  }

  eq(other: Node) {
    return this.value === other.value
  }
}
