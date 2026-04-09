import assert from "node:assert"
import { describe, it } from "node:test"

import {
  FootnoteNode,
  Mark,
  Node,
  NoterefNode,
  Root,
  TextNode,
} from "../model.ts"
import {
  addMark,
  inlineFootnotes,
  liftText,
  replaceFootnotes,
} from "../transform.ts"

void describe("addMark", () => {
  void it("should add a mark", () => {
    const result = addMark(
      new Root([new Node("p", {}, [new TextNode("Hello, world!")])]),
      1,
      14,
      new Mark("span", { id: "test" }),
    )

    assert.deepStrictEqual(
      result,
      new Root([
        new Node("p", {}, [
          new TextNode("Hello, world!", [new Mark("span", { id: "test" })]),
        ]),
      ]),
    )
  })

  void it("should add a mark at the start of a text node", () => {
    const result = addMark(
      new Root([new Node("p", {}, [new TextNode("Hello, world!")])]),
      1,
      7,
      new Mark("span", { id: "test" }),
    )

    assert.deepStrictEqual(
      result,
      new Root([
        new Node("p", {}, [
          new TextNode("Hello,", [new Mark("span", { id: "test" })]),
          new TextNode(" world!"),
        ]),
      ]),
    )
  })

  void it("should add a mark at the end of a text node", () => {
    const result = addMark(
      new Root([new Node("p", {}, [new TextNode("Hello, world!")])]),
      7,
      14,
      new Mark("span", { id: "test" }),
    )

    assert.deepStrictEqual(
      result,
      new Root([
        new Node("p", {}, [
          new TextNode("Hello,"),
          new TextNode(" world!", [new Mark("span", { id: "test" })]),
        ]),
      ]),
    )
  })

  void it("should add a mark within a text node", () => {
    const result = addMark(
      new Root([new Node("p", {}, [new TextNode("Hello, world!")])]),
      4,
      10,
      new Mark("span", { id: "test" }),
    )

    assert.deepStrictEqual(
      result,
      new Root([
        new Node("p", {}, [
          new TextNode("Hel"),
          new TextNode("lo, wo", [new Mark("span", { id: "test" })]),
          new TextNode("rld!"),
        ]),
      ]),
    )
  })

  void it("should preserve existing marks", () => {
    const result = addMark(
      new Root([
        new Node("p", {}, [
          new TextNode("Hello, world!", [new Mark("span", { class: "red" })]),
        ]),
      ]),
      4,
      10,
      new Mark("span", { id: "test" }),
    )

    assert.deepStrictEqual(
      result,
      new Root([
        new Node("p", {}, [
          new TextNode("Hel", [new Mark("span", { class: "red" })]),
          new TextNode("lo, wo", [
            new Mark("span", { id: "test" }),
            new Mark("span", { class: "red" }),
          ]),
          new TextNode("rld!", [new Mark("span", { class: "red" })]),
        ]),
      ]),
    )
  })
})

void describe("liftText", () => {
  void it("should insert newlines with trailing atoms", () => {
    const { result } = liftText(
      new Root([
        new Node("h1", {}, [
          new TextNode("Chapter 1."),
          new Node("br"),
          new Node("img", { src: "../images/cn.png" }),
        ]),
      ]),
    )

    assert.deepStrictEqual(result, "Chapter 1.\n")
  })
})

void describe("inlineFootnotes/replaceFootnotes", () => {
  void it("should handle a round trip", () => {
    const original = new Root([
      new Node("h1", {}, [new TextNode("Chapter 1.")]),
      new Node("p", {}, [
        new TextNode("Hello, world!"),
        new NoterefNode(
          "a",
          {
            "epub:type": "noteref",
            href: "#footnote",
          },
          [new TextNode("1")],
        ),
      ]),
      new Node("p", {}, [new TextNode("Goodbye, world!")]),
      new FootnoteNode("aside", { "epub:type": "footnote", id: "footnote" }, [
        new Node("p", {}, [new TextNode("Footnote content")]),
      ]),
    ])

    const inlined = inlineFootnotes(original)

    assert.deepStrictEqual(
      inlined.root,
      new Root([
        new Node("h1", {}, [new TextNode("Chapter 1.")]),
        new Node("p", {}, [
          new TextNode("Hello, world!"),
          new FootnoteNode(
            "aside",
            { "epub:type": "footnote", id: "footnote" },
            [new Node("p", {}, [new TextNode("Footnote content")])],
          ),
        ]),
        new Node("p", {}, [new TextNode("Goodbye, world!")]),
        new Node("aside"),
      ]),
    )

    const replaced = replaceFootnotes(
      original,
      inlined.root,
      inlined.footnotePairs,
      inlined.mapping,
    )

    assert.deepStrictEqual(replaced, original)
  })

  void it("should handle multiple footnotes", () => {
    const original = new Root([
      new Node("h1", {}, [new TextNode("Chapter 1.")]),
      new Node("p", {}, [
        new TextNode("Hello, world!"),
        new NoterefNode(
          "a",
          {
            "epub:type": "noteref",
            href: "#footnote1",
          },
          [new TextNode("1")],
        ),
      ]),
      new Node("p", {}, [
        new TextNode("Goodbye, world!"),
        new NoterefNode(
          "a",
          {
            "epub:type": "noteref",
            href: "#footnote2",
          },
          [new TextNode("2")],
        ),
      ]),
      new Node("div", { "epub:type": "footnotes" }, [
        new FootnoteNode("div", { "epub:type": "footnote", id: "footnote1" }, [
          new Node("p", {}, [new TextNode("Footnote one")]),
        ]),
        new FootnoteNode("div", { "epub:type": "footnote", id: "footnote2" }, [
          new Node("p", {}, [new TextNode("Footnote two")]),
        ]),
      ]),
    ])

    const inlined = inlineFootnotes(original)

    assert.deepStrictEqual(
      inlined.root,
      new Root([
        new Node("h1", {}, [new TextNode("Chapter 1.")]),
        new Node("p", {}, [
          new TextNode("Hello, world!"),
          new FootnoteNode(
            "div",
            { "epub:type": "footnote", id: "footnote1" },
            [new Node("p", {}, [new TextNode("Footnote one")])],
          ),
        ]),
        new Node("p", {}, [
          new TextNode("Goodbye, world!"),
          new FootnoteNode(
            "div",
            { "epub:type": "footnote", id: "footnote2" },
            [new Node("p", {}, [new TextNode("Footnote two")])],
          ),
        ]),
        new Node("div", { "epub:type": "footnotes" }, [
          new Node("div"),
          new Node("div"),
        ]),
      ]),
    )

    const replaced = replaceFootnotes(
      original,
      inlined.root,
      inlined.footnotePairs,
      inlined.mapping,
    )

    assert.deepStrictEqual(replaced, original)
  })
})
