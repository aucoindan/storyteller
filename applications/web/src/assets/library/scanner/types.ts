import { type BookWithRelations } from "@/database/books"
import {
  type Epub2ImportStrategy,
  type ImportMode,
} from "@/database/settingsTypes"
import { type UUID } from "@/uuid"

export type ScanFormat = "ebook" | "audiobook" | "readaloud"

/**
 * potential book file to be scanned
 */
export type Candidate = {
  folder: string
  format: ScanFormat
  filepath: string
  /**
   * used for uploads, which uuid the book should be created with
   */
  bookUuidHint?: UUID
  /**
   * fallback title when the asset has no usable metadata. uploads pass the
   * user's original filename here so the book isn't titled after the tus
   * random hash. defaults to basename(filepath, .epub) when absent.
   */
  titleHint?: string
  existingBook?: BookWithRelations
  /**
   * which collections newly created books should be added to, through association with import rules
   */
  collections?: UUID[]
  /**
   * import mode for this candidate's source rule. falls back to the scan's
   * default when absent. lets one scan honor different modes per rule.
   */
  importMode?: ImportMode
  /**
   * override for the EPUB 2 import strategy. uploads pass "replace" so the
   * unupgraded original is overwritten in place rather than left behind in
   * UPLOADS_DIR. falls back to the global setting when absent.
   */
  epub2ImportStrategy?: Epub2ImportStrategy
}

export type EpubScanFormat = Extract<ScanFormat, "ebook" | "readaloud">

export type ScanInputBase = {
  bookUuid: UUID
  filepath: string
  book: BookWithRelations
  isNew: boolean
  missing: boolean
  existingFingerprint: string | null
}

export type EbookInput = ScanInputBase & { format: "ebook" }
export type ReadaloudInput = ScanInputBase & { format: "readaloud" }
export type AudiobookInput = ScanInputBase & { format: "audiobook" }

export type ScanInput = EbookInput | ReadaloudInput | AudiobookInput

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}
