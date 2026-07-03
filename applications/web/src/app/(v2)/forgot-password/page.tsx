import { Center, Image, Paper, Stack, Text, Title } from "@mantine/core"
import { type Metadata } from "next"
import NextImage from "next/image"
import { redirect } from "next/navigation"

import { ForgotPasswordForm } from "@/components/login/ForgotPasswordForm"
import { getSettings } from "@/database/settings"
import { env } from "@/env"
import { requestPasswordReset } from "@/passwordReset"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Forgot Password",
}

export default async function ForgotPasswordPage() {
  const settings = await getSettings()

  // Self-service reset is only available when email delivery and password login
  // are both enabled; otherwise the admin flow is the only option.
  if (!settings.smtpHost || settings.disablePasswordLogin) {
    redirect("/login")
  }

  async function requestReset(data: FormData) {
    "use server"

    if (env.STORYTELLER_DEMO_MODE) return

    const usernameOrEmail = data.get("usernameOrEmail")?.valueOf() as
      | string
      | undefined
    if (!usernameOrEmail) return

    const currentSettings = await getSettings()
    if (!currentSettings.smtpHost || currentSettings.disablePasswordLogin) {
      return
    }

    await requestPasswordReset(usernameOrEmail)
  }

  return (
    <Center className="min-h-screen pb-36">
      <Paper className="w-[450px] p-8">
        <Stack className="items-stretch justify-start gap-0">
          <Stack className="items-center gap-0 pb-8">
            <Image
              component={NextImage}
              h={100}
              w={100}
              height={100}
              width={100}
              src="/Storyteller_Logo.png"
              alt="Storyteller Logo"
              aria-hidden
              className="-m-3"
            />
            <Title order={1}>Reset your password</Title>
            <Text>Enter your username or email to get a reset link</Text>
          </Stack>
          <ForgotPasswordForm action={requestReset} />
        </Stack>
      </Paper>
    </Center>
  )
}
