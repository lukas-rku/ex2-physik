import prisma from "~~/server/lib/prisma"
import { authorizeUser } from "~~/server/utils/authorization"
import { userAbilities } from "~~/shared/utils/abilities"
import { getIdPrismaWhereClause } from "~~/server/utils/prisma"

export default defineEventHandler(async (event) => {
  const admin = await authorizeUser(event, userAbilities.put)
  const { id } = getIdPrismaWhereClause(event)
  if (id === admin.id) throw createError({ statusCode: 403, statusMessage: "Cannot reset own 2FA" })

  await prisma.$transaction(async (tx) => {
    const result = await tx.user.updateMany({
      where: { id, role: { in: ["USER", "MODERATOR"] } },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: [] },
    })
    if (!result.count) {
      const target = await tx.user.findUnique({ where: { id }, select: { id: true } })
      if (!target) throw createError({ statusCode: 404, statusMessage: "User not found" })
      throw createError({ statusCode: 403, statusMessage: "Cannot reset administrator 2FA" })
    }
    await tx.session.deleteMany({ where: { userId: id } })
  })
  return { reset: true }
})
