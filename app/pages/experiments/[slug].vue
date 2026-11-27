<script lang="ts" setup>
const { data: experiment, error } = await useFetch<ExperimentDetail>(`/api/experiments/${getSlug()}`)

if (error.value?.statusCode === 401) {
  // Private experiments share this page with public ones. Resume this URL after 2FA.
  const status = await useRequestFetch()("/api/2fa/status", { cache: "no-store" })
  const target = pendingTwofaRoute(status, useRoute().fullPath)
  if (!target) throw createError(error.value)
  await navigateTo(target, { replace: true })
} else if (error.value) {
  throw createError(error.value)
} else if (!experiment.value) {
  throw showError({ statusCode: 404, statusMessage: "Versuch nicht gefunden" })
}

useSchemaOrg([
  defineArticle({
    title: experiment.value?.name,
    description: experiment.value?.sections?.[0]?.text,
  }),
])
</script>

<template>
  <ExperimentDetail
    :experiment="experiment"
  />
</template>
