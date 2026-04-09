import { Epub, type ParsedXml, type XmlNode } from "@storyteller-platform/epub"

import {
  FootnoteNode,
  Mark,
  Node,
  NoterefNode,
  Root,
  TextNode,
  descendants,
} from "./model.ts"
import { BLOCKS } from "./semantics.ts"

export function parseDom(xml: ParsedXml) {
  const parser = new Parser()
  return parser.parseDom(xml)
}

const FOOTNOTE_ROLES = ["footnote", "rearnote", "endnote", "note"]

class Parser {
  parseDom(xml: ParsedXml) {
    const children = this.parseDomChildren(xml)
    return new Root(children)
  }

  parseDomChildren(xml: ParsedXml, pos = 0) {
    const children: (Node | TextNode)[] = []
    for (const child of xml) {
      const result = this.parseDomNode(child, pos)
      const nodes = Array.isArray(result) ? result : [result]
      children.push(...nodes)
      pos += nodes.reduce((acc, node) => acc + node.nodeSize, 0)
    }

    return children
  }

  parseDomNode(
    xmlNode: XmlNode,
    pos: number,
    marks?: Mark[],
  ): Node | TextNode | (Node | TextNode)[] {
    if (Epub.isXmlTextNode(xmlNode)) {
      return new TextNode(xmlNode["#text"], marks)
    }

    const tagName = Epub.getXmlElementName(xmlNode)
    const attrs = Epub.getXmlAttributes(xmlNode)
    const blockChildren = this.parseDomChildren(
      Epub.getXmlChildren(xmlNode),
      pos + 1,
    )

    if (tagName === "a" && attrs["epub:type"] === "noteref") {
      const node = new NoterefNode(tagName, attrs, blockChildren, marks)
      return node
    }

    if (FOOTNOTE_ROLES.includes(attrs["epub:type"] ?? "") && attrs["id"]) {
      const footnoteNode = new FootnoteNode(
        tagName,
        attrs,
        blockChildren,
        marks,
      )

      return footnoteNode
    }

    if (BLOCKS.includes(tagName)) {
      return new Node(tagName, attrs, blockChildren, marks)
    }

    if (!Epub.getXmlChildren(xmlNode).length) {
      return new Node(tagName, Epub.getXmlAttributes(xmlNode), [], marks)
    }

    return Epub.getXmlChildren(xmlNode).flatMap((child) =>
      this.parseDomNode(child, pos, [
        ...(marks ?? []),
        new Mark(tagName, Epub.getXmlAttributes(xmlNode)),
      ]),
    )
  }
}

export function findFootnotePairs(root: Root | Node) {
  const noterefs = new Map<string, number>()
  const pairs = new Map<number, number>()

  descendants(root, (node, pos) => {
    if (node instanceof NoterefNode) {
      const id = node.attrs["href"]?.slice(1)
      if (id) {
        noterefs.set(id, pos)
      }
      return false
    }

    if (node instanceof FootnoteNode) {
      const id = node.attrs["id"]
      if (id) {
        const noterefPos = noterefs.get(id)
        if (noterefPos !== undefined) {
          pairs.set(noterefPos, pos)
        }
      }
      return false
    }

    return true
  })

  return pairs
}
