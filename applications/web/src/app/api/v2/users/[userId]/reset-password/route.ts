import { NextResponse } from "next/server"

import { withHasPermission } from "@/auth/auth"
import { getUser } from "@/database/users"
import { env } from "@/env"
import { logger } from "@/logging"
import { createPasswordResetToken, sendPasswordReset } from "@/passwordReset"
import { type UUID } from "@/uuid"

export const dynamic = "force-dynamic"

type Params = Promise<{
  userId: UUID
}>

/**
 * @summary Send a password reset link to a user
 * @desc Generates a single-use, expiring reset token and emails the user a
 *       link to set a new password.
 */
export const POST = withHasPermission<Params>("userPasswordReset")(async (
  _request,
  context,
) => {
  if (env.STORYTELLER_DEMO_MODE) {
    return new Response(null, { status: 403 })
  }

  const { userId } = await context.params

  const user = await getUser(userId)
  if (!user?.email) return new Response(null, { status: 404 })

  const token = await createPasswordResetToken(user.email)

  try {
    await sendPasswordReset(user.email, token)
  } catch (e) {
    logger.error("Failed to send password reset email")
    logger.error(e)
  }

  return new NextResponse(null, { status: 204 })
})
