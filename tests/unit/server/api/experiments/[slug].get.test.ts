import { describe, expect, expectTypeOf, it } from "vitest"
import { detail, detailDb } from "./data"
import { users } from "~~/tests/helpers/auth"
import type { EndpointResult } from "~~/tests/helpers/utils"
import * as u from "~~/tests/helpers/utils"

import endpoint from "~~/server/api/experiments/[slug].get"

describe("Api Route /api/experiments/[slug].get", () => {
  // definitions
  const data = detailDb
  const expected = detail

  const context = u.getTestContext({
    data, expected, endpoint,

    params: { slug: data.slug },
    user: users.user,
  })

  // mocks
  u.mockPrismaForSlugOrIdGet(context, "experiment")

  // tests
  {
    // type test
    expectTypeOf<EndpointResult<typeof endpoint>>().toEqualTypeOf<typeof expected>()

    u.testSuccessWithSlugAndId(context)

    it("requires an authorized account to read a draft", async () => {
      await expect(endpoint(u.getEvent({ ...context, user: users.admin }))).resolves.toMatchObject({ id: data.id })
      await expect(endpoint(u.getEvent({ ...context, user: null }))).rejects.toMatchObject({ statusCode: 401 })
      await expect(endpoint(u.getEvent({ ...context, user: users.user2 }))).rejects.toMatchObject({ statusCode: 403 })
    })

    u.testSlugFails(context)
  }
})
