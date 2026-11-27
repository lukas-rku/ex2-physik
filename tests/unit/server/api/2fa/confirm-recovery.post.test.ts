import { beforeEach, describe, expect, it, vi } from "vitest"
import endpoint from "~~/server/api/2fa/confirm-recovery.post"
import { verifyRecoveryCode } from "~~/server/utils/twofa"
import { users } from "~~/tests/helpers/auth"
import { getEvent } from "~~/tests/helpers/utils"

const pending = vi.hoisted(() => ({
  data: { secret: "", recoveryCodes: [] as string[] },
  clear: vi.fn(),
}))
const confirmSession = vi.hoisted(() => vi.fn())

vi.mock("~~/server/utils/twofa", async importOriginal => ({
  ...await importOriginal<typeof import("~~/server/utils/twofa")>(),
  pendingTwofaSetup: vi.fn(() => pending),
  confirmTwofaSession: confirmSession,
}))

describe("Confirming saved 2FA recovery codes", () => {
  const code = "ABCDE-12345"
  const event = getEvent({ user: users.user, body: { saved: true } })

  beforeEach(() => {
    vi.clearAllMocks()
    pending.data = { secret: "pending-secret", recoveryCodes: [code] }
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 })
  })

  it("requires consent before enabling 2FA", async () => {
    const unconfirmed = getEvent({ user: users.user, body: { saved: false } })
    await expect(endpoint(unconfirmed)).rejects.toMatchObject({ statusCode: 400 })
    expect(prisma.user.updateMany).not.toHaveBeenCalled()
    expect(confirmSession).not.toHaveBeenCalled()
  })

  it("rejects expired setup data without changing the account", async () => {
    pending.data.recoveryCodes = []
    await expect(endpoint(event)).rejects.toMatchObject({ statusCode: 409 })
    expect(prisma.user.updateMany).not.toHaveBeenCalled()
  })

  it("rejects stale setup data if the pending secret changed", async () => {
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 })
    await expect(endpoint(event)).rejects.toMatchObject({ statusCode: 409 })
    expect(confirmSession).not.toHaveBeenCalled()
  })

  it("stores hashed codes, verifies the current session and clears temporary setup data", async () => {
    await expect(endpoint(event)).resolves.toEqual({ confirmed: true })
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: users.user.id, twoFactorEnabled: false, twoFactorSecret: pending.data.secret },
      data: { twoFactorEnabled: true, twoFactorRecoveryCodes: [expect.any(String)] },
    })
    const [update] = vi.mocked(prisma.user.updateMany).mock.calls[0]!
    const hashes = update?.data.twoFactorRecoveryCodes as string[]
    expect(hashes).not.toContain(code)
    expect(verifyRecoveryCode(code, hashes[0]!)).toBe(true)
    expect(confirmSession).toHaveBeenCalledWith(event, users.user.id)
    expect(pending.clear).toHaveBeenCalledOnce()
  })
})
