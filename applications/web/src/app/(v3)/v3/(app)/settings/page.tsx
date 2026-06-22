import { type Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getMessages, getTranslations } from "next-intl/server"

import { nextAuth } from "@/auth/auth"
import { getImportRules } from "@/database/importRules"
import { getConfigLockedKeys, getSettings } from "@/database/settings"
import { getCurrentVersion } from "@/versions"

import { SettingsForm } from "@v3/_/components/settings-form/settings-form"
import {
  type SectionKeywords,
  settingsFormTabs,
} from "@v3/_/components/settings-form/tabs"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SettingsPage")
  return {
    title: t("title"),
  }
}

function extractKeywords(obj: Record<string, unknown>): string[] {
  const keywords: string[] = []
  for (const value of Object.values(obj)) {
    if (typeof value === "string") {
      keywords.push(value)
    } else if (typeof value === "object" && value !== null) {
      keywords.push(...extractKeywords(value as Record<string, unknown>))
    }
  }
  return keywords
}

function generateSectionKeywords(
  tabsMessages: Record<string, { sections: Record<string, unknown> }>,
): SectionKeywords {
  const result: SectionKeywords = {} as SectionKeywords

  for (const tab of settingsFormTabs) {
    result[tab] = {}

    const tabData = tabsMessages[tab]
    if (!tabData) {
      continue
    }

    for (const [sectionKey, sectionData] of Object.entries(tabData.sections)) {
      result[tab][sectionKey] = extractKeywords(
        sectionData as Record<string, unknown>,
      )
    }
  }

  return result
}

// in a follow up PR i will do this in a more consolidated way
export default async function SettingsPage() {
  const auth = await nextAuth.auth()
  if (!auth) {
    redirect("/login")
  }

  if (!auth.user.permissions?.settingsUpdate) {
    notFound()
  }

  const [settings, messages, configLockedKeys, allRules] = await Promise.all([
    getSettings(),
    getMessages(),
    getConfigLockedKeys(),
    getImportRules(),
  ])

  const settingsMessages = messages.SettingsPage as {
    tabs: Record<string, { sections: Record<string, unknown> }>
  }
  const sectionKeywords = generateSectionKeywords(settingsMessages.tabs)

  const currentVersion = getCurrentVersion()

  const editableRules = allRules.filter(
    (r) => r.source === "user" || r.source === "config",
  )
  const autoIgnoreRules = allRules.filter(
    (r) => r.source !== "user" && r.source !== "config" && r.kind === "ignore",
  )

  const settingsWithRules = {
    ...settings,
    importRules: editableRules.map((r) => ({
      uuid: r.uuid,
      kind: r.kind,
      path: r.path,
      importMode: r.importMode,
      epub2ImportStrategy: r.epub2ImportStrategy,
      collectionUuids: r.collections.map((c) => c.uuid),
      source: r.source,
    })),
    autoIgnoreRules: autoIgnoreRules.map((r) => ({
      uuid: r.uuid,
      path: r.path,
      source: r.source,
      bookTitle: r.bookTitle,
    })),
  }

  return (
    <SettingsForm
      settings={settingsWithRules}
      sectionKeywords={sectionKeywords}
      configLockedKeys={Array.from(configLockedKeys)}
      currentVersion={currentVersion}
    />
  )
}
