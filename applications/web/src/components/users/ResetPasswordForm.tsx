"use client"

import { Button, PasswordInput, Stack, Text } from "@mantine/core"
import { useState } from "react"

interface Props {
  action: (formData: FormData) => Promise<void>
}

export function ResetPasswordForm({ action }: Props) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")

  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = password.length > 0 && password === confirm

  return (
    <form action={action}>
      <Stack gap={8}>
        <PasswordInput
          label="New password"
          name="password"
          value={password}
          onChange={(event) => {
            setPassword(event.currentTarget.value)
          }}
          withAsterisk
          required
        />
        <PasswordInput
          label="Confirm new password"
          value={confirm}
          onChange={(event) => {
            setConfirm(event.currentTarget.value)
          }}
          error={mismatch ? "Passwords do not match" : undefined}
          withAsterisk
          required
        />
        {mismatch && <Text c="red">Passwords do not match</Text>}
        <Button className="mt-2 self-start" type="submit" disabled={!canSubmit}>
          Set new password
        </Button>
      </Stack>
    </form>
  )
}
