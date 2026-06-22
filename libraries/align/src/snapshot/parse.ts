import {
  argument,
  command,
  constant,
  merge,
  message,
  object,
  option,
} from "@optique/core"
import { path } from "@optique/run"

import { loggingParser } from "../common/parse.ts"

export const snapshotParser = object("Snapshot", {
  transcriptions: option(
    "--transcriptions",
    path({ mustExist: true, type: "directory" }),
  ),
  epub: option(
    "--epub",
    path({ mustExist: true, type: "file", extensions: [".epub"] }),
    {
      description: message`Path to an EPUB file to snapshot. This EPUB must have Media Overlays and audio files corresponding to the transcription files passed to --transcriptions.`,
    },
  ),
  output: argument(path({ type: "file", metavar: "OUTPUT_PATH" }), {
    description: message`Path to save the snapshot.`,
  }),
})

export const snapshotCommand = command(
  "snapshot",
  merge(
    object({
      action: constant("snapshot"),
    }),
    snapshotParser,
    loggingParser,
  ),
  {
    description: message`Print a human-readable snapshot of the EPUB’s alignment to a text file.`,
  },
)
