/** Only return internal paths when resuming navigation after authentication. */
export function getRedirectTarget() {
  const redirect = useRoute().query.redirect
  if (typeof redirect !== "string" || !redirect.startsWith("/") || /[\\\s]/.test(redirect) || redirect.startsWith("//")) return "/profile"
  return redirect
}

export function followRedirect() {
  return navigateTo(getRedirectTarget(), { replace: true })
}

/** Keep the requested page through both setup and the normal login challenge. */
export function pendingTwofaRoute(status: { setupRequired: boolean, required: boolean }, redirect: string) {
  const path = status.setupRequired ? "/2fa/setup" : status.required ? "/2fa/challenge" : null
  return path ? { path, query: { redirect } } : null
}

/**
 * Navigates to the specified path while preserving the current route as a redirect query parameter.
 */
export function navigateToWithRedirect(path: string) {
  navigateTo({ path, query: { redirect: useRoute().fullPath } })
}
