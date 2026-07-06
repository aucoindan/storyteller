export const ATOM_NAV =
  "application/atom+xml;profile=opds-catalog;kind=navigation" as const
export const ATOM_ACQ =
  "application/atom+xml;profile=opds-catalog;kind=acquisition" as const
export const OPDS_JSON = "application/opds+json" as const
export const OPDS_PUBLICATION_JSON = "application/opds-publication+json"

/**
 * all valid acquisition rels as an "enum"
 */
export const ACQUISITION_RELS = {
  acquisition: "http://opds-spec.org/acquisition",
  buy: "http://opds-spec.org/acquisition/buy",
  borrow: "http://opds-spec.org/acquisition/borrow",
  download: "http://opds-spec.org/acquisition/open-access",
  preview: "http://opds-spec.org/acquisition/sample",
  subscribe: "http://opds-spec.org/acquisition/subscribe",
} as const

/**
 * all valid acquisition rels as an array
 */
export const ACQUISITION_RELS_ARRAY = [
  ...Object.keys(ACQUISITION_RELS),
  ...Object.values(ACQUISITION_RELS),
]

export const THUMBNAIL_REL = "http://opds-spec.org/image/thumbnail" as const
