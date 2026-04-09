import {
  type SegmentationResult,
  segmentText,
} from "@echogarden/text-segmentation"

export async function segmentChapter(
  text: string,
  options: { primaryLocale?: Intl.Locale | null | undefined },
): Promise<SegmentationResult["sentences"]> {
  const result = await segmentText(text, {
    ...(options.primaryLocale && {
      language: options.primaryLocale.language,
    }),
    enableEastAsianPostprocessing: true,
  })

  return result.sentences
}
