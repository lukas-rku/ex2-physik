import { beforeEach, describe, expect, it, vi } from "vitest"
import endpoint from "~~/server/api/users/[id]/reset-2fa.post"
import { users } from "~~/tests/helpers/auth"
import * as u from "~~/tests/helpers/utils"

describe("Admin 2FA reset", () => {
  const context = u.getTestContext({
    endpoint,
    data: users.user,
    expected: { reset: true },
    user: users.admin,
    params: { id: users.user.id },
  })
  const tx = {
    user: { updateMany: vi.fn(), findUnique: vi.fn() },
    session: { deleteMany: vi.fn() },
  }
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.$transaction = vi.fn(callback => callback(tx))
    tx.user.updateMany.mockResolvedValue({ count: 1 })
  })

  it.each([users.guest, users.user, users.mod])("rejects a non-admin caller", async (user) => {
    await expect(endpoint(u.getEvent({ ...context, user }))).rejects.toMatchObject({
      statusCode: user ? 403 : 401,
    })
    expect(tx.user.updateMany).not.toHaveBeenCalled()
  })

  it("clears enrollment and revokes all target sessions", async () => {
    await expect(endpoint(u.getEvent(context))).resolves.toEqual({ reset: true })
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: users.user.id, role: { in: ["USER", "MODERATOR"] } },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: [] },
    })
    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: users.user.id } })
  })

  it("rejects resetting the acting administrator", async () => {
    const event = u.getEvent({ ...context, params: { id: users.admin.id } })
    await expect(endpoint(event)).rejects.toThrow("Cannot reset own 2FA")
    expect(tx.user.updateMany).not.toHaveBeenCalled()
  })

  it("rejects resetting another administrator", async () => {
    const id = "other-admin"
    tx.user.updateMany.mockResolvedValueOnce({ count: 0 })
    tx.user.findUnique.mockResolvedValueOnce({ id })
    const event = u.getEvent({ ...context, params: { id } })
    await expect(endpoint(event)).rejects.toMatchObject({ statusCode: 403 })
    expect(tx.session.deleteMany).not.toHaveBeenCalled()
  })
})
