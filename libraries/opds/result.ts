/**
 * a deserialize result that, unlike @readium/shared's `T | undefined`, says
 * what went wrong and where. paths are JSON pointers into the source document
 */
export interface OPDSError {
  /** JSON pointer to the offending value, e.g. "/publications/3/links/0/href" */
  path: string
  message: string
  /** the failing rule, e.g. "required" | "type" | "format" */
  keyword: string
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; errors: OPDSError[] }

export const ok = <T>(value: T): Result<T> => ({ ok: true, value })

export const err = (errors: OPDSError[]): Result<never> => ({
  ok: false,
  errors,
})

/** the shape of an ajv error object, typed structurally so the core never imports ajv */
export interface AjvErrorLike {
  instancePath?: string
  message?: string
  keyword?: string
}

export const toOPDSError = (e: AjvErrorLike): OPDSError => ({
  path: e.instancePath && e.instancePath.length > 0 ? e.instancePath : "/",
  message: e.message ?? "invalid",
  keyword: e.keyword ?? "",
})
