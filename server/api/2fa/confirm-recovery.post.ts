import prisma from "../../lib/prisma"
import { getUserOrThrowError } from "~~/server/utils/auth"
import { confirmTwofaSession, hashRecoveryCode, pendingTwofaSetup } from "~~/server/utils/twofa"

export default defineEventHandler(async (event) => {
  const user = await getUserOrThrowError(event)
  const body = await readBody(event)
  if (body?.saved !== true) throw createError({ statusCode: 400, statusMessage: "Confirmation required" })
  const pending = await pendingTwofaSetup(event)
  const { secret, recoveryCodes } = pending.data
  if (!secret || !recoveryCodes?.length) throw createError({ statusCode: 409, statusMessage: "Setup expired" })
  const result = await prisma.user.updateMany({
    where: { id: user.id, twoFactorEnabled: false, twoFactorSecret: secret },
    data: { twoFactorEnabled: true, twoFactorRecoveryCodes: recoveryCodes.map(hashRecoveryCode) },
  })
  if (!result.count) throw createError({ statusCode: 409, statusMessage: "Setup changed" })
  confirmTwofaSession(event, user.id)
  await pending.clear()
  return { confirmed: true }
})
