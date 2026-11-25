import type { H3Event } from "h3"
import prisma from "../lib/prisma"
import { getUserOrThrowError } from "~~/server/utils/auth"
import { verifyRecoveryCode, verifyTotp, isTwofaGloballyEnabled } from "~~/server/utils/twofa"

export async function getTwofaUserRecord(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorRecoveryCodes: true,
    },
  })
}

export async function verifyTwofaInput(event: unknown) {
  if (typeof event !== "object" || event === null) {
    throw createError({ statusCode: 400, statusMessage: "Invalid Event" })
  }

  const body = await readBody<{ code?: string }>(event as H3Event)
  if (!body?.code) {
    throw createError({ statusCode: 400, statusMessage: "Code required" })
  }

  const user = await getUserOrThrowError(event as H3Event)
  const record = await getTwofaUserRecord(user.id)

  if (!record) {
    throw createError({ statusCode: 404, statusMessage: "User not found" })
  }

  let ok = false
  const input = body.code.trim()

  if (/^\d+$/.test(input) && record.twoFactorSecret) {
    ok = await verifyTotp(input, record.twoFactorSecret)
  }

  // if not totp -> check for recovery code
  if (!ok && record.twoFactorRecoveryCodes?.length) {
    const idx = record.twoFactorRecoveryCodes.findIndex(stored =>
      verifyRecoveryCode(input, stored),
    )
    if (idx !== -1) {
      // Remove used recovery code
      const updatedCodes = [...record.twoFactorRecoveryCodes]
      updatedCodes.splice(idx, 1)
      const consumed = await prisma.user.updateMany({
        where: { id: user.id, twoFactorRecoveryCodes: { equals: record.twoFactorRecoveryCodes } },
        data: { twoFactorRecoveryCodes: updatedCodes },
      })
      ok = consumed.count === 1
    }
  }

  return { ok, user, record }
}

export function ensure2faEnabledGlobally() {
  const enabledGlobally = isTwofaGloballyEnabled()
  if (!enabledGlobally) {
    throw createError({ statusCode: 404, statusMessage: "Not found" })
  }
}
