import { describe, expectTypeOf } from "vitest"
import { generateMock } from "@anatine/zod-mock"
import { experiment, comment } from "./data"
import { users } from "~~/tests/helpers/auth"
import type { EndpointResult } from "~~/tests/helpers/utils"
import * as u from "~~/tests/helpers/utils"

import endpoint from "~~/server/api/experiments/[slug]/comments/index.post"

describe("Api Route api/experiments/[slug]/comments/index.post", () => {
  // definitions
  const body = generateMock(experimentCommentCreateSchema)

  const expected: ExperimentComment = comment

  const context = u.getTestContext({
    data: comment,
    expected,
    endpoint,
    params: { slug: experiment.slug },
    body,
    user: users.user,
  })

  // mocks
  u.mockPrismaForSlugOrIdGet({ data: experiment }, "experiment")
  u.mockPrismaForPost(context, "comment")

  // tests
  {
    // type test
    expectTypeOf<EndpointResult<typeof endpoint>>().toEqualTypeOf<typeof expected>()

    u.testSuccess(context)

    u.testZodFailWithEmptyBody(context)

    u.testAuthFail(context, [users.guest, users.unverified])

    it("allows only verified admins to post and reply while locked", async () => {
      u.mockPrismaForSlugOrIdGet({ data: { ...experiment, commentsEnabled: false } }, "experiment")
      for (const user of [users.user, users.mod, { ...users.admin, emailVerified: false }]) {
        await expect(endpoint(u.getEvent({ ...context, user }))).rejects.toMatchObject({ statusCode: 403 })
      }
      for (const parentId of [undefined, comment.id]) {
        const event = u.getEvent({ ...context, user: users.admin, body: { ...body, parentId } })
        await expect(endpoint(event)).resolves.toMatchObject({ id: comment.id })
      }
    })
  }
})
