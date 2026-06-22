"use client"

import { useTranslations } from "next-intl"
import { Controller, useWatch } from "react-hook-form"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@v3/_/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@v3/_/components/ui/field"
import { Input } from "@v3/_/components/ui/input"
import { Switch } from "@v3/_/components/ui/switch"
import { TabsContent } from "@v3/_/components/ui/tabs"

import {
  LockTooltip,
  SettingsFormField,
  useSettingsForm,
} from "./SettingsFormProvider"
import { SettingsSection, safeUrl } from "./shared"

export function OpdsTab() {
  const { form, lockedSettings } = useSettingsForm()
  const t = useTranslations("SettingsPage.tabs.opds.sections.opds")
  const opdsEnabled = useWatch({ control: form.control, name: "opdsEnabled" })
  const webUrl = useWatch({ control: form.control, name: "webUrl" })

  const opdsUrl = safeUrl(webUrl, "/opds")

  return (
    <TabsContent value="opds" className="space-y-6">
      <SettingsSection tab="opds" section="opds">
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              name="opdsEnabled"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  orientation="horizontal"
                  data-invalid={fieldState.invalid}
                  data-disabled={lockedSettings.has("opdsEnabled")}
                >
                  <Switch
                    id="opdsEnabled"
                    disabled={lockedSettings.has("opdsEnabled")}
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                  <div className="space-y-1">
                    <FieldLabel htmlFor="opdsEnabled">
                      {t("enabled")}
                      {lockedSettings.has("opdsEnabled") && <LockTooltip />}
                    </FieldLabel>
                    <FieldDescription>
                      {t("enabledDescription", { url: opdsUrl })}
                    </FieldDescription>
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {opdsEnabled && (
              <SettingsFormField
                name="opdsPageSize"
                label={t("pageSize")}
                description={t("pageSizeDescription")}
                render={(field, fieldState, isLocked) => (
                  <Input
                    id="opdsPageSize"
                    type="number"
                    min={1}
                    disabled={isLocked}
                    value={field.value ?? 25}
                    onChange={(e) => {
                      field.onChange(parseInt(e.target.value) || null)
                    }}
                    aria-invalid={fieldState.invalid}
                  />
                )}
              />
            )}
          </CardContent>
        </Card>
      </SettingsSection>
    </TabsContent>
  )
}
