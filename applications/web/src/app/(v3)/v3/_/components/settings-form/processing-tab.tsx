"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { Controller, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { MP3_CBR_BITRATE_OPTIONS } from "@/assets/audio/mp3Bitrates"
import { usePermissions } from "@/hooks/usePermissions"
import { useClearBooksCacheMutation } from "@/store/api"

import { Button } from "@v3/_/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@v3/_/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@v3/_/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@v3/_/components/ui/field"
import { Input } from "@v3/_/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@v3/_/components/ui/select"
import { Switch } from "@v3/_/components/ui/switch"
import { TabsContent } from "@v3/_/components/ui/tabs"

import {
  LockTooltip,
  SettingsFormField,
  useSettingsForm,
} from "./SettingsFormProvider"
import { SettingsSection } from "./shared"

export function ProcessingTab() {
  const { form } = useSettingsForm()
  const tt = useTranslations(
    "SettingsPage.tabs.processing.sections.transcription",
  )
  const tp = useTranslations(
    "SettingsPage.tabs.processing.sections.parallelization",
  )
  const ta = useTranslations("SettingsPage.tabs.processing.sections.audio")
  const tr = useTranslations("SettingsPage.tabs.processing.sections.readaloud")

  const transcriptionEngine = useWatch({
    control: form.control,
    name: "transcriptionEngine",
  })
  const codec = useWatch({ control: form.control, name: "codec" })

  const transcriptionEngineOptions = [
    { value: "whisper.cpp", label: tt("whisperCpp") },
    { value: "whisper-server", label: tt("whisperServer") },
    { value: "google-cloud", label: tt("googleCloud") },
    { value: "microsoft-azure", label: tt("microsoftAzure") },
    { value: "amazon-transcribe", label: tt("amazonTranscribe") },
    { value: "openai-cloud", label: tt("openaiCloud") },
    { value: "deepgram", label: tt("deepgram") },
  ]

  const trackLengths = [
    { value: 0.75, label: ta("maxTrackLength45") },
    { value: 1, label: ta("maxTrackLength1") },
    { value: 2, label: ta("maxTrackLength2") },
    { value: 3, label: ta("maxTrackLength3") },
    { value: 4, label: ta("maxTrackLength4") },
  ]

  const codecOptions = [
    { value: "default", label: ta("codecDefault") },
    { value: "libopus", label: ta("codecOpus") },
    { value: "libmp3lame", label: ta("codecMp3") },
    { value: "aac", label: ta("codecAac") },
  ]

  const opusBitrateOptions = [
    { value: "", label: ta("bitrateDefault") },
    { value: "16K", label: "16 Kb/s" },
    { value: "24K", label: "24 Kb/s" },
    { value: "32K", label: "32 Kb/s" },
    { value: "64K", label: "64 Kb/s" },
    { value: "96K", label: "96 Kb/s" },
  ]

  const mp3BitrateOptions = [
    { value: "", label: ta("mp3BitrateDefault") },
    ...MP3_CBR_BITRATE_OPTIONS.map(({ value, kbps }) => ({
      value,
      label: `${kbps} kb/s`,
    })),
  ]

  return (
    <TabsContent value="processing" className="space-y-6">
      <ReadaloudSection tr={tr} />

      <SettingsSection tab="processing" section="transcription">
        <Card>
          <CardHeader>
            <CardTitle>{tt("title")}</CardTitle>
            <CardDescription>{tt("description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingsFormField
              name="transcriptionEngine"
              label={tt("engine")}
              render={(field, fieldState, isLocked) => (
                <Select
                  disabled={isLocked}
                  aria-invalid={fieldState.invalid}
                  items={transcriptionEngineOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {transcriptionEngineOptions.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />

            {transcriptionEngine === "whisper.cpp" && (
              <WhisperSettings t={tt} />
            )}

            {transcriptionEngine === "whisper-server" && (
              <WhisperServerSettings t={tt} />
            )}

            {transcriptionEngine === "google-cloud" && (
              <GoogleCloudSettings t={tt} />
            )}

            {transcriptionEngine === "microsoft-azure" && (
              <AzureSettings t={tt} />
            )}

            {transcriptionEngine === "amazon-transcribe" && (
              <AmazonSettings t={tt} />
            )}

            {transcriptionEngine === "openai-cloud" && (
              <OpenAiSettings t={tt} />
            )}

            {transcriptionEngine === "deepgram" && <DeepgramSettings t={tt} />}
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection tab="processing" section="audio">
        <Card>
          <CardHeader>
            <CardTitle>{ta("title")}</CardTitle>
            <CardDescription>{ta("description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingsFormField
              name="maxTrackLength"
              label={ta("maxTrackLength")}
              description={ta("maxTrackLengthDescription")}
              render={(field, fieldState, isLocked) => (
                <Select
                  disabled={isLocked}
                  aria-invalid={fieldState.invalid}
                  data-disabled={isLocked}
                  value={String(field.value)}
                  onValueChange={(value) => {
                    if (value) {
                      field.onChange(parseFloat(value))
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {trackLengths.find(({ value }) => value === field.value)
                        ?.label ?? ta("maxTrackLength2")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {trackLengths.map(({ value, label }) => (
                      <SelectItem key={value} value={String(value)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />

            <SettingsFormField
              name="codec"
              label={ta("codec")}
              render={(field, fieldState, isLocked) => (
                <Select
                  disabled={isLocked}
                  aria-invalid={fieldState.invalid}
                  data-disabled={isLocked}
                  value={field.value ?? "default"}
                  onValueChange={(value) => {
                    field.onChange(value === "default" ? null : value)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {codecOptions.find(({ value }) => value === field.value)
                        ?.label ?? ta("codecDefault")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {codecOptions.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />

            {codec === "libopus" && (
              <SettingsFormField
                name="bitrate"
                label={ta("bitrate")}
                render={(field, fieldState, isLocked) => (
                  <Select
                    disabled={isLocked}
                    aria-invalid={fieldState.invalid}
                    data-disabled={isLocked}
                    value={field.value ?? ""}
                    onValueChange={(value) => {
                      field.onChange(value || null)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {opusBitrateOptions.find(
                          ({ value }) => value === field.value,
                        )?.label ?? ta("bitrateDefault")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {opusBitrateOptions.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}

            {codec === "libmp3lame" && (
              <SettingsFormField
                name="bitrate"
                label={ta("bitrate")}
                render={(field, fieldState, isLocked) => (
                  <Select
                    disabled={isLocked}
                    aria-invalid={fieldState.invalid}
                    data-disabled={isLocked}
                    value={field.value ?? ""}
                    onValueChange={(value) => {
                      field.onChange(value || null)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {mp3BitrateOptions.find(
                          ({ value }) => value === field.value,
                        )?.label ?? ta("mp3BitrateDefault")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {mp3BitrateOptions.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection tab="processing" section="parallelization">
        <Card>
          <CardHeader>
            <CardTitle>{tp("title")}</CardTitle>
            <CardDescription>{tp("description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingsFormField
              name="parallelTranscodes"
              label={tp("parallelTranscodes")}
              description={tp("parallelTranscodesDescription")}
              render={(field, fieldState, isLocked) => (
                <Input
                  id="parallelTranscodes"
                  type="number"
                  min={1}
                  disabled={isLocked}
                  {...field}
                  onChange={(e) => {
                    field.onChange(parseInt(e.target.value) || 1)
                  }}
                  aria-invalid={fieldState.invalid}
                />
              )}
            />

            <SettingsFormField
              name="parallelTranscribes"
              label={tp("parallelTranscribes")}
              description={tp("parallelTranscribesDescription")}
              render={(field, fieldState, isLocked) => (
                <Input
                  id="parallelTranscribes"
                  type="number"
                  min={1}
                  disabled={isLocked}
                  {...field}
                  onChange={(e) => {
                    field.onChange(parseInt(e.target.value) || 1)
                  }}
                  aria-invalid={fieldState.invalid}
                />
              )}
            />
          </CardContent>
        </Card>
      </SettingsSection>
    </TabsContent>
  )
}

type TranslationFn = ReturnType<
  typeof useTranslations<"SettingsPage.tabs.processing.sections.transcription">
>

function WhisperSettings({ t }: { t: TranslationFn }) {
  const whisperModelOptions = [
    { value: "tiny", label: "tiny" },
    { value: "tiny.en", label: "tiny.en" },
    { value: "tiny-q5_1", label: "tiny-q5_1" },
    { value: "base", label: "base" },
    { value: "base.en", label: "base.en" },
    { value: "base-q5_1", label: "base-q5_1" },
    { value: "small", label: "small" },
    { value: "small.en", label: "small.en" },
    { value: "small-q5_1", label: "small-q5_1" },
    { value: "medium", label: "medium" },
    { value: "medium.en", label: "medium.en" },
    { value: "medium-q5_0", label: "medium-q5_0" },
    { value: "large-v1", label: "large-v1" },
    { value: "large-v2", label: "large-v2" },
    { value: "large-v2-q5_0", label: "large-v2-q5_0" },
    { value: "large-v3", label: "large-v3" },
    { value: "large-v3-q5_0", label: "large-v3-q5_0" },
    { value: "large-v3-turbo", label: "large-v3-turbo" },
    { value: "large-v3-turbo-q5_0", label: "large-v3-turbo-q5_0" },
  ]

  const whisperCpuFallbackOptions = [
    { value: "", label: t("whisperCpuFallbackDefault") },
    { value: "blas", label: t("whisperCpuFallbackBlas") },
    { value: "cpu", label: t("whisperCpuFallbackCpu") },
  ]

  return (
    <>
      <SettingsFormField
        name="whisperModel"
        label={t("whisperModel")}
        description={t("whisperModelDescription")}
        render={(field, fieldState, isLocked) => (
          <Select
            items={whisperModelOptions}
            value={field.value}
            onValueChange={field.onChange}
            disabled={isLocked}
            aria-invalid={fieldState.invalid}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {whisperModelOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      <SettingsFormField
        name="whisperThreads"
        label={t("whisperThreads")}
        description={t("whisperThreadsDescription")}
        render={(field, fieldState, isLocked) => (
          <>
            <Input
              id="whisperThreads"
              type="number"
              min={1}
              max={16}
              disabled={isLocked}
              {...field}
              onChange={(e) => {
                field.onChange(parseInt(e.target.value) || 1)
              }}
              aria-invalid={fieldState.invalid}
            />
            <p className="text-xs opacity-70">
              <span className="font-bold text-orange-600">
                {t("whisperThreadsWarningPrefix")}
              </span>{" "}
              {t("whisperThreadsWarning")}
            </p>
          </>
        )}
      />

      <SettingsFormField
        name="whisperCpuFallback"
        label={t("whisperCpuFallback")}
        description={t("whisperCpuFallbackDescription")}
        render={(field, fieldState, isLocked) => (
          <Select
            items={whisperCpuFallbackOptions}
            value={field.value || ""}
            onValueChange={(val) => {
              field.onChange(val || null)
            }}
            disabled={isLocked}
            aria-invalid={fieldState.invalid}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {whisperCpuFallbackOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </>
  )
}

function WhisperServerSettings({ t }: { t: TranslationFn }) {
  return (
    <>
      <p className="text-muted-foreground text-sm">
        {t("whisperServerDescription")}
      </p>
      <SettingsFormField
        name="whisperServerUrl"
        label={t("whisperServerUrl")}
        description={t("whisperServerUrlDescription")}
        render={(field, fieldState, isLocked) => (
          <Input
            id="whisperServerUrl"
            disabled={isLocked}
            {...field}
            value={field.value || ""}
            aria-invalid={fieldState.invalid}
          />
        )}
      />
      <SettingsFormField
        name="whisperServerApiKey"
        label={t("whisperServerApiKey")}
        description={t("whisperServerApiKeyDescription")}
        render={(field, fieldState, isLocked) => (
          <Input
            id="whisperServerApiKey"
            type="password"
            disabled={isLocked}
            {...field}
            value={field.value || ""}
            aria-invalid={fieldState.invalid}
          />
        )}
      />
    </>
  )
}

function GoogleCloudSettings({ t }: { t: TranslationFn }) {
  return (
    <SettingsFormField
      name="googleCloudApiKey"
      label={t("apiKey")}
      render={(field, fieldState, isLocked) => (
        <Input
          id="googleCloudApiKey"
          type="password"
          disabled={isLocked}
          {...field}
          value={field.value ?? ""}
          aria-invalid={fieldState.invalid}
        />
      )}
    />
  )
}

function AzureSettings({ t }: { t: TranslationFn }) {
  return (
    <>
      <SettingsFormField
        name="azureSubscriptionKey"
        label={t("subscriptionKey")}
        render={(field, fieldState, isLocked) => (
          <Input
            id="azureSubscriptionKey"
            type="password"
            disabled={isLocked}
            {...field}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
          />
        )}
      />
      <SettingsFormField
        name="azureServiceRegion"
        label={t("serviceRegion")}
        render={(field, fieldState, isLocked) => (
          <Input
            id="azureServiceRegion"
            disabled={isLocked}
            {...field}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
          />
        )}
      />
    </>
  )
}

function AmazonSettings({ t }: { t: TranslationFn }) {
  return (
    <>
      <SettingsFormField
        name="amazonTranscribeRegion"
        label={t("region")}
        render={(field, fieldState, isLocked) => (
          <Input
            id="amazonTranscribeRegion"
            disabled={isLocked}
            {...field}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
          />
        )}
      />
      <SettingsFormField
        name="amazonTranscribeBucketName"
        label={t("bucketName")}
        description={t("bucketNameDescription")}
        render={(field, fieldState, isLocked) => (
          <Input
            id="amazonTranscribeBucketName"
            disabled={isLocked}
            {...field}
            value={field.value || ""}
            aria-invalid={fieldState.invalid}
          />
        )}
      />
      <SettingsFormField
        name="amazonTranscribeAccessKeyId"
        label={t("accessKeyId")}
        render={(field, fieldState, isLocked) => (
          <Input
            id="amazonTranscribeAccessKeyId"
            disabled={isLocked}
            {...field}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
          />
        )}
      />
      <SettingsFormField
        name="amazonTranscribeSecretAccessKey"
        label={t("secretAccessKey")}
        render={(field, fieldState, isLocked) => (
          <Input
            id="amazonTranscribeSecretAccessKey"
            type="password"
            disabled={isLocked}
            {...field}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
          />
        )}
      />
    </>
  )
}

function OpenAiSettings({ t }: { t: TranslationFn }) {
  return (
    <>
      <SettingsFormField
        name="openAiApiKey"
        label={t("apiKey")}
        render={(field, fieldState, isLocked) => (
          <Input
            id="openAiApiKey"
            type="password"
            disabled={isLocked}
            {...field}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
          />
        )}
      />
      <SettingsFormField
        name="openAiOrganization"
        label={t("organization")}
        render={(field, fieldState, isLocked) => (
          <Input
            id="openAiOrganization"
            disabled={isLocked}
            {...field}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
          />
        )}
      />
      <SettingsFormField
        name="openAiBaseUrl"
        label={t("baseUrl")}
        description={t("baseUrlDescription")}
        render={(field, fieldState, isLocked) => (
          <Input
            id="openAiBaseUrl"
            disabled={isLocked}
            {...field}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
          />
        )}
      />
      <SettingsFormField
        name="openAiModelName"
        label={t("modelName")}
        description={t("modelNameDescription")}
        render={(field, fieldState, isLocked) => (
          <Input
            id="openAiModelName"
            disabled={isLocked}
            {...field}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
          />
        )}
      />
    </>
  )
}

function DeepgramSettings({ t }: { t: TranslationFn }) {
  return (
    <>
      <SettingsFormField
        name="deepgramApiKey"
        label={t("apiKey")}
        render={(field, fieldState, isLocked) => (
          <Input
            id="deepgramApiKey"
            type="password"
            disabled={isLocked}
            {...field}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
          />
        )}
      />
      <SettingsFormField
        name="deepgramModel"
        label={t("deepgramModel")}
        description={t("deepgramModelDescription")}
        render={(field, fieldState, isLocked) => (
          <Input
            id="deepgramModel"
            disabled={isLocked}
            {...field}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
          />
        )}
      />
    </>
  )
}

type ReadaloudTranslationFn = ReturnType<
  typeof useTranslations<"SettingsPage.tabs.processing.sections.readaloud">
>

function ReadaloudSection({ tr }: { tr: ReadaloudTranslationFn }) {
  const { form, lockedSettings } = useSettingsForm()

  const permissions = usePermissions()
  const [clearBooksCache, { isLoading: isClearingCache }] =
    useClearBooksCacheMutation()
  const [clearCacheConfirmOpen, setClearCacheConfirmOpen] = useState(false)

  const locationType = useWatch({
    control: form.control,
    name: "readaloudLocationType",
  })

  const readaloudLocationOptions = [
    { value: "SUFFIX", label: tr("locationTypeSuffix") },
    { value: "SIBLING_FOLDER", label: tr("locationTypeSiblingFolder") },
    { value: "CUSTOM_FOLDER", label: tr("locationTypeCustomFolder") },
    { value: "INTERNAL", label: tr("locationTypeInternal") },
  ]

  return (
    <SettingsSection tab="processing" section="readaloud">
      <Card>
        <CardHeader>
          <CardTitle>{tr("title")}</CardTitle>
          <CardDescription>{tr("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingsFormField
            name="readaloudLocationType"
            label={tr("locationType")}
            render={(field, _, isLocked) => (
              <Select
                items={readaloudLocationOptions}
                disabled={isLocked}
                value={field.value}
                onValueChange={(value) => {
                  if (!value) return

                  field.onChange(value)
                  switch (value) {
                    case "SUFFIX":
                      form.setValue("readaloudLocation", " (readaloud)")
                      break
                    case "SIBLING_FOLDER":
                      form.setValue("readaloudLocation", "readaloud")
                      break
                    case "CUSTOM_FOLDER":
                      form.setValue("readaloudLocation", "/readalouds")
                      break
                    case "INTERNAL":
                      form.setValue("readaloudLocation", "")
                      break
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {readaloudLocationOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />

          {locationType !== "INTERNAL" && (
            <SettingsFormField
              name="readaloudLocation"
              label={
                locationType === "SUFFIX"
                  ? tr("locationTypeSuffix")
                  : locationType === "SIBLING_FOLDER"
                    ? tr("locationTypeSiblingFolder")
                    : tr("locationTypeCustomFolder")
              }
              render={(field, fieldState, isLocked) => (
                <Input
                  id="readaloudLocation"
                  disabled={isLocked}
                  {...field}
                  aria-invalid={fieldState.invalid}
                />
              )}
            />
          )}

          <Controller
            name="cleanCacheAfterReadaloud"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                orientation="horizontal"
                data-invalid={fieldState.invalid}
                data-disabled={lockedSettings.has("cleanCacheAfterReadaloud")}
              >
                <Switch
                  id="cleanCacheAfterReadaloud"
                  disabled={lockedSettings.has("cleanCacheAfterReadaloud")}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <div className="space-y-1">
                  <FieldLabel htmlFor="cleanCacheAfterReadaloud">
                    {tr("cleanCacheAfterReadaloud")}
                    {lockedSettings.has("cleanCacheAfterReadaloud") && (
                      <LockTooltip />
                    )}
                  </FieldLabel>
                  <FieldDescription>
                    {tr("cleanCacheAfterReadaloudDescription")}
                  </FieldDescription>
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {permissions?.bookProcess && (
            <div className="space-y-1.5">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isClearingCache}
                onClick={() => {
                  setClearCacheConfirmOpen(true)
                }}
              >
                {tr("clearCacheNow")}
              </Button>
              <FieldDescription>
                {tr("clearCacheNowDescription")}
              </FieldDescription>
            </div>
          )}

          <Dialog
            open={clearCacheConfirmOpen}
            onOpenChange={setClearCacheConfirmOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{tr("clearCacheConfirmTitle")}</DialogTitle>
                <DialogDescription>
                  {tr("clearCacheConfirmDescription")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose
                  render={
                    <Button variant="ghost" size="sm">
                      {tr("clearCacheCancel")}
                    </Button>
                  }
                />
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isClearingCache}
                  onClick={() => {
                    void clearBooksCache({})
                      .unwrap()
                      .then(() => {
                        toast.success(tr("clearCacheSuccess"))
                      })
                      .catch(() => {
                        toast.error(tr("clearCacheError"))
                      })
                      .finally(() => {
                        setClearCacheConfirmOpen(false)
                      })
                  }}
                >
                  {tr("clearCacheConfirm")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </SettingsSection>
  )
}
