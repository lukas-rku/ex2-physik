import { describe, expectTypeOf } from "vitest"
import { experiment, comment } from "./data"
import { users } from "~~/tests/helpers/auth"
import type { EndpointResult } from "~~/tests/helpers/utils"
import * as u from "~~/tests/helpers/utils"

import endpoint from "~~/server/api/experiments/[slug]/comments/index.get"

describe("Api Route api/experiments/[slug]/comments/index.get", () => {
  const data = [comment]
  const expected: Page<ExperimentComment> = u.page(data)

  const context = u.getTestContext({
    data, expected, endpoint,
    params: { slug: experiment.slug },
    user: users.user,
  })

  u.mockPrismaForSlugOrIdGet({ data: experiment }, "experiment")
  u.mockPrismaForGetAll(context, "comment")

  {
    expectTypeOf<EndpointResult<typeof endpoint>>().toMatchTypeOf<Page<ExperimentComment> & { commentsEnabled: boolean }>()

    u.testSlugFails({ ...context, data: experiment })
    u.testSuccessWithPagination({
      ...context,
      endpoint: async (event) => {
        const { commentsEnabled, ...page } = await endpoint(event)
        expect(commentsEnabled).toBe(true)
        return page
      },
    }, data)

    it("keeps existing comments visible when the discussion is locked", async () => {
      u.mockPrismaForSlugOrIdGet({ data: { ...experiment, commentsEnabled: false } }, "experiment")
      await expect(endpoint(u.getEvent(context))).resolves.toEqual({ ...expected, commentsEnabled: false })
    })
  }
})
