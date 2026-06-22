/**
 * Pluggable storage backend for an Epub instance
 *
 * Built-in adapters:
 *  - {@link TmpFsAdapter} extracts the archive to a tmp directory and
 *    supports the full read/write/save/upgrade
 *  - {@link MemoryAdapter} keeps an in-memory zip handle and supports
 *    reads only
 */
export type EpubStorageKind = "tmp-dir" | "in-memory" | (string & {})

export interface EpubStorageCapabilities {
  /** when false, the Epub class refuses every mutation method at runtime */
  readonly writable: boolean
}

export interface EpubListEntry {
  /** absolute path under {@link EpubStorageAdapter.rootPath} */
  absolutePath: string
  /** path relative to {@link EpubStorageAdapter.rootPath}, slash-separated */
  relativePath: string
}

export interface EpubStorageAdapter {
  /**
   * Opaque path prefix used by `resolveInternalHref` to anchor absolute
   * paths within the archive. For TmpFsAdapter this is the tmp dir;
   * for MemoryAdapter it's a virtual prefix that's never written to disk
   */
  readonly rootPath: string

  read(path: string): Promise<Uint8Array>
  read(path: string, encoding: "utf-8"): Promise<string>

  /**
   * Length of an entry in bytes, for the readium page-count heuristic
   * which expects compressed size when available
   */
  archiveLength(path: string): Promise<number>

  /** Required for any mutation method on Epub */
  write?(path: string, data: Uint8Array): Promise<void>
  write?(path: string, data: string, encoding: "utf-8"): Promise<void>

  /** Required for removeManifestItem / setCoverImage replacement */
  remove?(path: string): Promise<void>

  /** Required for Epub.saveAndClose to walk the contents */
  list?(): AsyncIterable<EpubListEntry>

  /** Required for Epub.copy */
  duplicate?(): Promise<EpubStorageAdapter>

  /** Required for Epub.saveAndClose */
  serialize?(targetPath: string): Promise<void>

  /** Always called on close or error */
  dispose(): void | Promise<void>
}

export interface EpubStorageAdapterClass<Opts extends object = object> {
  readonly kind: EpubStorageKind
  readonly capabilities: EpubStorageCapabilities

  /**
   * Open an archive from a path or buffer. The returned adapter is
   * ready to read; the Epub class will assert it's a valid EPUB 3
   * afterwards.
   */
  init(source: string | Uint8Array, opts?: Opts): Promise<EpubStorageAdapter>

  /**
   * Initialize an empty extract root for {@link Epub.create}.
   *
   * Optional — adapters that can't be written to from scratch
   * (e.g. read-only zip handles) should leave this off, and
   * `Epub.using(...).create(...)` will throw.
   */
  initEmpty?(opts?: Opts): Promise<EpubStorageAdapter>
}

export type AdapterOptions<A> =
  A extends EpubStorageAdapterClass<infer Opts> ? Opts : object
