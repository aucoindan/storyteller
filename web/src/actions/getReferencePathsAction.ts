"use server"

import { pathBelongsTo } from "@/assets/library/scanner/folder"
import { hasPermission, nextAuth } from "@/auth/auth"
import { ASSETS_DIR } from "@/directories"

/**
 * Returns the subset of paths that live outside ASSETS_DIR (reference
 * imports), i.e. the ones `deleteAssets` leaves on disk.
 */
export async function getReferencePathsAction(
  paths: string[],
): Promise<string[]> {
  const session = await nextAuth.auth()
  if (!hasPermission("bookDelete", session?.user)) {
    throw new Error("Forbidden")
  }
  return paths.filter((p) => !pathBelongsTo(ASSETS_DIR, p))
}
