export default defineEventHandler(async (event) => {
  await authorize(event, experimentCommentAbilities.getAll)

  const experiment = await nullTo404(async () =>
    await prisma.experiment.findFirst({
      where: getSlugOrIdPrismaWhereClause(event),
    }),
  )
  const user = await authorize(event, experimentAbilities.get, experiment)

  const where = { experimentId: experiment.id, parentId: null }

  const total = await prisma.comment.count({ where })
  const pageMeta = getPageMeta(event, total)

  const result = await prisma.comment.findMany({
    ...getPaginationPrismaParam(pageMeta),
    where,
    include: {
      user: { select: { id: true, name: true } },
      _count: { select: { votes: true } },
      votes: user
        ? {
            where: { userId: user.id },
            select: { userId: true },
          }
        : false,
      children: {
        include: {
          user: { select: { id: true, name: true } },
          _count: { select: { votes: true } },
          votes: user
            ? {
                where: { userId: user.id },
                select: { userId: true },
              }
            : false,
        },
      },
    },
    orderBy: [
      { votes: { _count: "desc" } },
      { createdAt: "desc" },
    ],
  })

  const items = result.map(({ votes, _count, children, ...comment }) => ({
    ...comment,
    upvotesCount: _count?.votes ?? 0,
    userHasVoted: !!votes?.length,
    children: (children ?? []).map(({ votes: cVotes, _count: cCount, ...child }) => ({
      ...child,
      upvotesCount: cCount?.votes ?? 0,
      userHasVoted: !!cVotes?.length,
      children: [],
    })),
  }))

  return {
    // A lock closes the discussion for new posts but keeps its history visible.
    commentsEnabled: experiment.commentsEnabled,
    items: items as ExperimentComment[],
    pagination: pageMeta,
  }
})

defineRouteMeta({
  openAPI: {
    description: "Get comments of an experiment (Two-level depth)",
    tags: ["ExperimentComment"],
    parameters: [
      {
        name: "slug",
        in: "path",
        required: true,
        description: "The slug of the experiment",
        schema: {
          type: "string",
          format: "uuid",
        },
      },
    ],
    responses: {
      200: {
        description: "Successfully retrieved comments",
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["commentsEnabled", "items", "pagination"],
              properties: {
                commentsEnabled: { type: "boolean" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["id", "text", "user", "upvotesCount", "userHasVoted", "children"],
                    properties: {
                      id: { type: "string", format: "uuid" },
                      text: { type: "string" },
                      createdAt: { type: "string", format: "date-time" },
                      upvotesCount: { type: "integer" },
                      userHasVoted: { type: "boolean" },
                      user: {
                        type: "object",
                        properties: { id: { type: "string" }, name: { type: "string" } },
                      },
                      children: {
                        type: "array",
                        items: {
                          type: "object",
                          required: ["id", "text", "user", "upvotesCount", "userHasVoted"],
                          properties: {
                            id: { type: "string", format: "uuid" },
                            text: { type: "string" },
                            createdAt: { type: "string", format: "date-time" },
                            upvotesCount: { type: "integer" },
                            userHasVoted: { type: "boolean" },
                            user: {
                              type: "object",
                              properties: { id: { type: "string" }, name: { type: "string" } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                pagination: {
                  type: "object",
                  properties: {
                    page: { type: "integer" },
                    pageSize: { type: "integer" },
                    total: { type: "integer" },
                    totalPages: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
      400: {
        description: "Invalid slug",
      },
      401: {
        description: "No user is logged in",
      },
      403: {
        description: "Unauthorized",
      },
      404: {
        description: "Experiment not found",
      },
    },
  },
})
