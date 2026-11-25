export default defineNuxtRouteMiddleware(async (to) => {
  const status = await useRequestFetch()("/api/2fa/status", { cache: "no-store" })
  if (status.setupRequired) {
    if (to.path !== "/2fa/setup") return navigateTo("/2fa/setup", { replace: true })
  } else if (status.required) {
    if (to.path !== "/2fa/challenge") return navigateTo("/2fa/challenge", { replace: true })
  } else if (to.path === "/2fa/setup" || to.path === "/2fa/challenge") {
    return navigateTo(status.enabled ? "/profile" : "/login", { replace: true })
  }
})
