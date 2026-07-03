import { Title } from "@mantine/core"
import { type Metadata } from "next"
import { redirect } from "next/navigation"

import { hashPassword } from "@/auth/auth"
import { ResetPasswordForm } from "@/components/users/ResetPasswordForm"
import { updateUserByEmail } from "@/database/users"
import { consumePasswordResetToken } from "@/passwordReset"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{
    token: string
  }>
}

export const metadata: Metadata = {
  title: "Reset Password",
}

export default async function ResetPasswordPage(props: Props) {
  const { token } = await props.params

  async function resetPassword(data: FormData) {
    "use server"

    const password = data.get("password")?.valueOf() as string | undefined
    if (!password) return

    // Consume the token on submit (not at render), so merely opening the link
    // doesn't burn it.
    const result = await consumePasswordResetToken(token)
    if (!result) redirect("/login?error=reset-invalid")

    const hashedPassword = await hashPassword(password)
    await updateUserByEmail(result.email, { hashedPassword })

    redirect("/login?reset=success")
  }

  return (
    <>
      <header>
        <Title order={2}>Reset Password</Title>
      </header>
      <ResetPasswordForm action={resetPassword} />
    </>
  )
}
