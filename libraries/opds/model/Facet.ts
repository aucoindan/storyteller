import { Links } from "@readium/shared"

import { type Result, err, ok } from "../result.ts"
import { type OPDSFeed } from "../types/feed.ts"

import { FeedMetadata } from "./FeedMetadata.ts"

type FacetJSON = NonNullable<OPDSFeed["facets"]>[number]

/** a facet re-orders or filters the current list of publications */
export class Facet {
  readonly metadata?: FeedMetadata
  readonly links: Links

  constructor(values: { metadata?: FeedMetadata; links: Links }) {
    this.metadata = values.metadata
    this.links = values.links
  }

  static deserialize(json: FacetJSON, path: string): Result<Facet> {
    const links = Links.deserialize(json.links)
    if (!links) {
      return err([
        {
          path: `${path}/links`,
          message: "invalid links",
          keyword: "construct",
        },
      ])
    }
    return ok(
      new Facet({
        metadata: json.metadata
          ? FeedMetadata.deserialize(json.metadata)
          : undefined,
        links,
      }),
    )
  }

  serialize(): FacetJSON {
    const json = {
      links: this.links.serialize() as FacetJSON["links"],
    } as FacetJSON
    if (this.metadata) json.metadata = this.metadata.serialize()
    return json
  }
}
