import { readFileSync } from "node:fs"

import { ZodError, z } from "zod"

import { getScheduler } from "@/assets/library/scanner/triggers/scheduler"
import { env } from "@/env"
import { logger } from "@/logging"

import { db } from "./connection"
import {
  ConfigFileSchema,
  type ImportMode,
  ImportRuleSchema,
  type Settings,
} from "./settingsTypes"

export function formatTranscriptionEngineDetails(settings: Settings) {
  let details = settings.transcriptionEngine ?? "whisper.cpp"
  if (settings.transcriptionEngine === "whisper.cpp") {
    details += `:${settings.whisperModel ?? "tiny"}`
  }
  if (
    settings.transcriptionEngine === "openai-cloud" &&
    settings.openAiModelName
  ) {
    details += `:${settings.openAiModelName}`
  }
  if (settings.transcriptionEngine === "deepgram" && settings.deepgramModel) {
    details += `:${settings.deepgramModel}`
  }
  return details
}

export type ConfigImportRuleEntry = {
  kind: "watch" | "ignore"
  path: string
  importMode: ImportMode | null
}

type ConfigFileCache = {
  settings: Partial<Settings>
  keys: Set<keyof Settings>
  importRules: ConfigImportRuleEntry[]
}

// globalThis to survive Next.js module re-imports (see distributor.ts)
declare global {
  // eslint-disable-next-line no-var
  var configFileCache: ConfigFileCache | undefined
}

/** Recursively resolve _file references in an object */
function resolveFileReferences(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj
  if (Array.isArray(obj)) return obj.map(resolveFileReferences)
  const input = obj as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (key.endsWith("_file") && typeof value === "string") {
      // Replace foo_file with foo containing file contents
      const targetKey = key.slice(0, -5)
      try {
        result[targetKey] = readFileSync(value, "utf-8").trim()
      } catch (err) {
        throw new Error(
          `Failed to read secret file for "${targetKey}" from "${value}": ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    } else if (!(`${key}_file` in input)) {
      // Keep the key unless it will be overwritten by a _file variant
      result[key] = resolveFileReferences(value)
    }
  }
  return result
}

function loadConfigFile(): ConfigFileCache {
  if (globalThis.configFileCache) return globalThis.configFileCache

  const configPath = env.STORYTELLER_CONFIG

  if (!configPath) {
    globalThis.configFileCache = {
      settings: {},
      keys: new Set(),
      importRules: [],
    }
    return globalThis.configFileCache
  }

  let rawConfig: unknown
  try {
    rawConfig = JSON.parse(readFileSync(configPath, "utf-8")) as unknown
  } catch (err) {
    throw new Error(
      `Failed to read config file "${configPath}": ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  const resolved = resolveFileReferences(rawConfig)

  const configObj = resolved as Record<string, unknown>
  const {
    importRules: rawImportRules,
    importPath: rawImportPath,
    ...rawSettings
  } = configObj

  let settings: Partial<Settings>
  try {
    settings = ConfigFileSchema.parse(rawSettings) as Partial<Settings>
  } catch (err) {
    if (err instanceof ZodError) {
      throw new Error(`Invalid config file "${configPath}": ${err.message}`)
    }
    throw err
  }

  // validate and collect explicit importRules
  const explicitRules = rawImportRules
    ? z.array(ImportRuleSchema).parse(rawImportRules)
    : []

  // convert deprecated importPath to watch rules
  let legacyRules: ConfigImportRuleEntry[] = []

  if (rawImportPath !== undefined) {
    logger.warn(
      "config file contains 'importPath' which is deprecated; " +
        "please migrate to 'importRules' instead.",
    )

    const importPathSchema = z.union([z.string(), z.array(ImportRuleSchema)])
    const parsed = importPathSchema.parse(rawImportPath)

    const entries = Array.isArray(parsed) ? parsed : [{ path: parsed }]

    legacyRules = entries.map((e) => ({
      kind: "watch" as const,
      path: e.path,
      importMode: ("importMode" in e ? e.importMode : null) ?? null,
    }))
  }

  // explicit importRules take precedence over legacy importPath
  const seen = new Set<string>()
  const allRules: ConfigImportRuleEntry[] = []

  for (const rule of [...explicitRules, ...legacyRules]) {
    const key = `${rule.kind}:${rule.path}`
    if (seen.has(key)) continue

    seen.add(key)
    allRules.push({
      kind: rule.kind,
      path: rule.path,
      importMode: rule.importMode ?? null,
    })
  }

  const keys = new Set(Object.keys(settings) as (keyof Settings)[])

  globalThis.configFileCache = { settings, keys, importRules: allRules }
  return globalThis.configFileCache
}

/** Returns the set of setting keys that are locked by the config file */
export function getConfigLockedKeys(): Set<keyof Settings> {
  return loadConfigFile().keys
}

export async function getSetting<Name extends keyof Settings>(name: Name) {
  const { settings: configSettings, keys } = loadConfigFile()

  if (keys.has(name)) {
    return configSettings[name] as Settings[Name]
  }

  const { valueJson } = await db
    .selectFrom("settings")
    .select(["value as valueJson"])
    .where("name", "=", name)
    .orderBy("createdAt", "desc")
    .executeTakeFirstOrThrow()

  const parsed: unknown =
    typeof valueJson === "string" ? JSON.parse(valueJson) : valueJson

  return parsed as Settings[Name]
}

export async function getSettings(): Promise<Settings> {
  const rows = await db
    .selectFrom("settings")
    .select(["name", "value"])
    .execute()

  const dbDesttings = rows.reduce((acc, row) => {
    const name = row.name
    const parsed =
      typeof row.value === "string"
        ? (JSON.parse(row.value) as Settings[keyof Settings])
        : row.value
    return {
      ...acc,
      [name]: parsed,
    }
  }, {}) as Settings

  const { settings: configSettings } = loadConfigFile()

  const result = {
    ...dbDesttings,
    smtpSsl: dbDesttings.smtpSsl ?? true,
    smtpRejectUnauthorized: dbDesttings.smtpRejectUnauthorized ?? true,
  }

  return { ...result, ...configSettings }
}

export async function updateSettings(settings: Settings) {
  const lockedKeys = getConfigLockedKeys()
  const existingSettings = await getSettings()

  for (const [settingName, value] of Object.entries(settings)) {
    if (lockedKeys.has(settingName as keyof Settings)) continue

    const unchanged =
      JSON.stringify(existingSettings[settingName as keyof Settings]) ===
      JSON.stringify(value)

    if (unchanged) continue

    await db
      .insertInto("settings")
      .values({
        name: settingName as keyof Settings,
        value: JSON.stringify(value),
      })
      .onConflict((oc) =>
        oc.column("name").doUpdateSet({ value: JSON.stringify(value) }),
      )
      .execute()
  }

  await getScheduler().refresh()
}

// validate and cache config file on startup (never re-read after this)
loadConfigFile()

export function getConfigImportRules(): ConfigImportRuleEntry[] {
  return loadConfigFile().importRules
}
