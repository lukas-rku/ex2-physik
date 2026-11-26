import QRCode from "qrcode"
import prisma from "../../lib/prisma"
import { getUserOrThrowError } from "~~/server/utils/auth"
import { buildOtpauthUrl, generateSecret, pendingTwofaSetup } from "~~/server/utils/twofa"

export default defineEventHandler(async (event) => {
  const runtime = useRuntimeConfig()
  const enabledGlobally = (process.env.TWOFA_ENABLED ?? "true").toLowerCase() !== "false"
  if (!enabledGlobally) {
    throw createError({ statusCode: 404, statusMessage: "Not found" })
  }
  const user = await getUserOrThrowError(event)
  setResponseHeader(event, "Cache-Control", "no-store")
  const pending = await pendingTwofaSetup(event)
  if (pending.data.recoveryCodes?.length) {
    const record = await prisma.user.findUnique({ where: { id: user.id }, select: { twoFactorSecret: true, twoFactorEnabled: true } })
    if (!record?.twoFactorEnabled && record?.twoFactorSecret === pending.data.secret) {
      return { recoveryCodes: pending.data.recoveryCodes }
    }
    await pending.clear()
  }
  const secret = await generateSecret()
  const updated = await prisma.user.updateMany({
    where: { id: user.id, twoFactorEnabled: false },
    data: { twoFactorSecret: secret },
  })
  if (!updated.count) throw createError({ statusCode: 409, statusMessage: "2FA already enabled" })
  const otpauthUrl = buildOtpauthUrl({ secret, accountName: user.email, issuer: runtime.public.appName })
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl)

  return {
    secret,
    otpauthUrl,
    issuer: runtime.public.appName,
    qrDataUrl,
  }
})

defineRouteMeta({
  openAPI: {
    tags: ["Two-Factor Authentication"],
    summary: "Initialize 2FA",
    description: "Generates a TOTP secret and otpauth URL for authenticator apps.",
    responses: {
      200: {
        description: "2FA setup initialized",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                secret: { type: "string", example: "JBSWY3DPEHPK3PXP" },
                otpauthUrl: { type: "string" },
                issuer: { type: "string", example: process.env.APP_IMAGE || "PhyExDB" },
                qrDataUrl: { type: "string" },
              },
            },
          },
        },
      },
      404: { description: "2FA globally disabled" },
    },
  },
})
