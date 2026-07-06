import { cp, mkdir } from "node:fs/promises"

import { defaultOptions } from "@storyteller-platform/tsup"
import { defineConfig } from "tsup"

export default defineConfig({
  ...defaultOptions,
  tsconfig: "./tsconfig.json",
  clean: true,
  format: ["esm", "cjs"],
  entry: [
    "./**/*.ts",
    "!node_modules",
    "!./**/*.test.ts",
    "!./**/*.d.ts",
    "!tsup.config.ts",
    // build-time / dev-only: the live `./validate/ajv` path resolves to source,
    // so its modules (and the vendored schemas they import) never ship.
    "!./schemas/ajv/compile.ts",
    "!./schemas/ajv/validate.ts",
    "!./schemas/sync.ts",
    "!./schemas/registry.generated.ts",
    "!./schemas/roots.generated.ts",
    "!./test-catalog.json.ts",
  ],
  // the precompiled standalone validator is plain CJS that esbuild can't
  // retarget, so it is not a tsup entry. copy it into dist so the built
  // ./validate entry can load it. its types are inlined into validate/index.d.ts
  // by the dts pass, so only the runtime .cjs needs to ship.
  onSuccess: async () => {
    await mkdir("dist/schemas/ajv", { recursive: true })
    await cp("schemas/ajv/standalone.cjs", "dist/schemas/ajv/standalone.cjs")
  },
})
