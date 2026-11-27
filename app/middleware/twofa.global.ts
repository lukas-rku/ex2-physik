// Public pages render with guest permissions while 2FA is pending. The API checks experiment visibility.
const publicPages = new Set(["index", "experiments", "experiments-slug", "legal-slug", "login", "register", "reset-password"])

export default defineNuxtRouteMiddleware(async (to) => {
  if (publicPages.has(String(to.name))) return
  const status = await useRequestFetch()("/api/2fa/status", { cache: "no-store" })
  const onTwofaPage = to.path === "/2fa/setup" || to.path === "/2fa/challenge"
  const target = pendingTwofaRoute(status, onTwofaPage ? "/profile" : to.fullPath)
  if (target) {
    if (to.path !== target.path) return navigateTo(target, { replace: true })
  } else if (onTwofaPage) {
    return navigateTo(status.enabled ? "/profile" : "/login", { replace: true })
  }
})
