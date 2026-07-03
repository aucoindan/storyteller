"use client"

import { Anchor, Button, Stack, Text, TextInput } from "@mantine/core"
import Link from "next/link"
import { useState } from "react"

interface Props {
  action: (formData: FormData) => Promise<void>
}

export function ForgotPasswordForm({ action }: Props) {
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <Stack className="gap-4">
        <Text>
          If an account matches, a password reset link has been sent to its
          email.
        </Text>
        <Anchor component={Link} href="/login" className="self-center">
          Back to login
        </Anchor>
      </Stack>
    )
  }

  return (
    <form
      action={async (formData) => {
        // Always show the same confirmation, regardless of whether the account
        // exists, to avoid revealing valid usernames/emails.
        await action(formData)
        setSubmitted(true)
      }}
    >
      <Stack className="gap-6">
        <TextInput
          required
          name="usernameOrEmail"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Email or username"
        />
        <Button type="submit" className="mt-3 w-full">
          Send reset link
        </Button>
        <Anchor component={Link} href="/login" className="self-center">
          Back to login
        </Anchor>
      </Stack>
    </form>
  )
}
