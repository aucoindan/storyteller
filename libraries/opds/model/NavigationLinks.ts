import { Link, Links } from "@readium/shared"

/**
 * A collection of {@link NavigationLink}s
 * Since this extends {@link Links}, it does not follow the same Result pattern as other models.
 */
export class NavigationLinks extends Links {
  constructor(public links: NavigationLink[]) {
    super(links)
  }
  static override deserialize(json: unknown): NavigationLinks | undefined {
    if (!Array.isArray(json)) {
      throw new Error("links must be an array")
    }
    return new NavigationLinks(
      json.map((link: unknown) => {
        const navLink = NavigationLink.deserialize(link)
        if (!navLink) {
          throw new Error("invalid link")
        }
        return navLink
      }),
    )
  }
}

/**
 * Same as {@link Link} but with a required title
 * Since this extends {@link Link}, it does not follow the same Result pattern as other models.
 */
export class NavigationLink extends Link {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(
    values: Omit<ConstructorParameters<typeof Link>[0], "title"> & {
      title: string
    },
  ) {
    super(values)
  }

  static override deserialize(json: unknown): NavigationLink | undefined {
    if (typeof json !== "object" || json === null || !("title" in json)) {
      throw new Error("title is required")
    }
    return super.deserialize(json)
  }
}
