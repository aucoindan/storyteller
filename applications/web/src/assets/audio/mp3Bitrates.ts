/**
 * recreated here from align/src/common/ffmpeg.ts
 * bc cant import that into the browser bundle
 */
export const MP3_CBR_BITRATE_OPTIONS = [
  320, 256, 224, 192, 160, 128, 112, 96, 80, 64,
].map((kbps) => ({ value: `${kbps}k`, kbps }))
