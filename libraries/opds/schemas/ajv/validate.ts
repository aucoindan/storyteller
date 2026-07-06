import { Ajv } from "ajv"
import addFormats from "ajv-formats"

import { type OPDSAuthenticationDocument } from "../../types/authentication.ts"
import { type OPDSFeed } from "../../types/feed.ts"
import { type OPDSProgressionDocument } from "../../types/progression.ts"
import { allSchemas } from "../registry.generated.ts"
import { roots } from "../roots.generated.ts"

/**
 * a single AJV instance with every vendored schema registered
 */
export const ajv = new Ajv({
  allowUnionTypes: true,
  code: {
    esm: true,
    source: true,
    optimize: true,
  },
})

addFormats.default(ajv)
ajv.addSchema(allSchemas)

const getValidator = <T>(id: string) => {
  const fn = ajv.getSchema<T>(id)
  if (!fn) throw new Error(`schema not registered: ${id}`)
  return fn
}

export const validateFeed = getValidator<OPDSFeed>(roots.feed)

export const validateAuth = getValidator<OPDSAuthenticationDocument>(
  roots.authentication,
)

export const validateProgression = getValidator<OPDSProgressionDocument>(
  roots.progression,
)

/** @deprecated use {@link validateFeed}, kept for back-compat */
export const validate = validateFeed
