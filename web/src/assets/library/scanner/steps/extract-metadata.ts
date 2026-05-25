import { defineStep } from "@/assets/library/scanner/step"
import { type Prettify } from "@/assets/library/scanner/types"
import {
  getMetadataFromAudiobook,
  getMetadataFromEpub,
} from "@/assets/metadata"
import { type BookRelationsUpdate, type BookUpdate } from "@/database/books"

import { type OpenedAudiobook, type OpenedEpub } from "./open"

export const extractEpubMetadataStep = defineStep(
  "extract-epub-metadata",
  async (input: OpenedEpub, _ctx) => {
    const { update, relations } = await getMetadataFromEpub(input.epub)
    return {
      ...input,
      extractedMetadata: update,
      extractedRelations: relations,
    }
  },
)

export type ExtractedEpubMetadata = Prettify<
  OpenedEpub & {
    extractedMetadata: BookUpdate | null
    extractedRelations: BookRelationsUpdate
  }
>

export const extractAudiobookMetadataStep = defineStep(
  "extract-audiobook-metadata",
  async (input: OpenedAudiobook, _ctx) => {
    const { update, relations } = await getMetadataFromAudiobook(
      input.audiobook,
    )
    return {
      ...input,
      extractedMetadata: update,
      extractedRelations: relations,
    }
  },
)

export type ExtractedAudiobookMetadata = OpenedAudiobook & {
  extractedMetadata: BookUpdate | null
  extractedRelations: BookRelationsUpdate
}
