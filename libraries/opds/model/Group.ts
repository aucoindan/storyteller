import { Links } from "@readium/shared"

import { type Result, ok } from "../result.ts"
import { type OPDSFeed } from "../types/feed.ts"

import { FeedMetadata } from "./FeedMetadata.ts"
import { OPDSPublication } from "./OPDSPublication.ts"

type GroupJSON = NonNullable<OPDSFeed["groups"]>[number]

/**
 * A Group curates publications or navigation links under a shared heading
 */
export class Group {
  readonly metadata: FeedMetadata
  readonly links?: Links
  readonly publications?: OPDSPublication[]
  readonly navigation?: Links

  constructor(values: {
    metadata: FeedMetadata
    links?: Links
    publications?: OPDSPublication[]
    navigation?: Links
  }) {
    this.metadata = values.metadata
    this.links = values.links
    this.publications = values.publications
    this.navigation = values.navigation
  }

  static deserialize(json: GroupJSON, path: string = ""): Result<Group> {
    let publications: OPDSPublication[] | undefined
    if (json.publications) {
      publications = []
      for (const [i, pub] of json.publications.entries()) {
        const result = OPDSPublication.deserialize(
          pub,
          `${path}/publications/${i}`,
        )
        if (!result.ok) return result
        publications.push(result.value)
      }
    }

    return ok(
      new Group({
        metadata: FeedMetadata.deserialize(json.metadata),
        links: json.links ? Links.deserialize(json.links) : undefined,
        publications,
        navigation: json.navigation
          ? Links.deserialize(json.navigation)
          : undefined,
      }),
    )
  }

  serialize(): GroupJSON {
    const json = { metadata: this.metadata.serialize() } as GroupJSON
    if (this.links) json.links = this.links.serialize() as GroupJSON["links"]
    if (this.publications) {
      json.publications = this.publications.map((p) =>
        p.serialize(),
      ) as GroupJSON["publications"]
    }
    if (this.navigation) {
      json.navigation = this.navigation.serialize() as GroupJSON["navigation"]
    }
    return json
  }
}
