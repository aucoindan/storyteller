import { type OPDSMetadata } from "../types/feed.ts"

/**
 * Feed-level metadata
 *
 * See {@link https://specs.opds.io/schema/feed-metadata.schema.json}
 */
export class FeedMetadata {
  readonly title: OPDSMetadata["title"]
  readonly identifier?: string
  readonly type?: string
  readonly subtitle?: OPDSMetadata["subtitle"]
  readonly modified?: string
  readonly description?: string
  readonly itemsPerPage?: number
  readonly currentPage?: number
  readonly numberOfItems?: number
  /** any properties outside the known set, preserved on round-trip */
  readonly extra?: Record<string, unknown>

  constructor(values: {
    title: OPDSMetadata["title"]
    identifier?: string
    type?: string
    subtitle?: OPDSMetadata["subtitle"]
    modified?: string
    description?: string
    itemsPerPage?: number
    currentPage?: number
    numberOfItems?: number
    extra?: Record<string, unknown>
  }) {
    this.title = values.title
    this.identifier = values.identifier
    this.type = values.type
    this.subtitle = values.subtitle
    this.modified = values.modified
    this.description = values.description
    this.itemsPerPage = values.itemsPerPage
    this.currentPage = values.currentPage
    this.numberOfItems = values.numberOfItems
    this.extra = values.extra
  }

  static deserialize(json: OPDSMetadata): FeedMetadata {
    const {
      title,
      identifier,
      "@type": type,
      subtitle,
      modified,
      description,
      itemsPerPage,
      currentPage,
      numberOfItems,
      ...extra
    } = json
    return new FeedMetadata({
      title,
      identifier,
      type,
      subtitle,
      modified,
      description,
      itemsPerPage,
      currentPage,
      numberOfItems,
      extra: Object.keys(extra).length > 0 ? extra : undefined,
    })
  }

  serialize(): OPDSMetadata {
    return {
      ...this.extra,
      title: this.title,
      ...(this.identifier !== undefined && { identifier: this.identifier }),
      ...(this.type !== undefined && { "@type": this.type }),
      ...(this.subtitle !== undefined && { subtitle: this.subtitle }),
      ...(this.modified !== undefined && { modified: this.modified }),
      ...(this.description !== undefined && { description: this.description }),
      ...(this.itemsPerPage !== undefined && {
        itemsPerPage: this.itemsPerPage,
      }),
      ...(this.currentPage !== undefined && { currentPage: this.currentPage }),
      ...(this.numberOfItems !== undefined && {
        numberOfItems: this.numberOfItems,
      }),
    }
  }
}
