/** types for the generated AJV standalone validators (see compile.ts). */
import { type AjvErrorLike } from "../../result.ts"

export interface StandaloneValidator {
  (data: unknown): boolean
  errors?: AjvErrorLike[] | null
}

export const validateFeed: StandaloneValidator
export const validateAuth: StandaloneValidator
