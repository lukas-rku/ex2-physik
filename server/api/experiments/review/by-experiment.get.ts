export default defineEventHandler(async (event) => {
  const experimentId = getQuery(event).experimentId as string
  if (!experimentId) throw createError({ statusCode: 400, statusMessage: "experimentId missing" })

  const user = await getUserOrThrowError(event)
  const experiment = await prisma.experiment.findUnique({ where: { id: experimentId }, select: { userId: true } })
  if (!experiment) throw createError({ statusCode: 404, statusMessage: "Experiment not found" })
  if (experiment.userId !== user.id) await authorizeUser(event, experimentAbilities.review)

  return prisma.review.findMany({
    where: { experimentId },
    orderBy: { createdAt: "desc" },
    include: {
      reviewer: { select: { name: true, image: true } },
      sectionsCritiques: {
        include: { sectionContent: { include: { experimentSection: true } } },
      },
    },
  })
})
