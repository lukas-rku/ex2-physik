import { auth, getSessionUser, getUserOrThrowError } from "~~/server/utils/auth"

// These authentication flows must work before a user has verified a second factor.
const publicAuthRoutes = new Set([
  "POST /sign-in/email", "POST /sign-up/email", "POST /sign-out",
  "POST /forget-password", "POST /reset-password", "GET /verify-email",
])

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event)
  const path = new URL(request.url).pathname.slice("/api/auth".length).replace(/\/$/, "")
  const route = `${event.method} ${path}`

  if (route === "GET /get-session") {
    const response = await auth.handler(request)
    if (!response.ok) return response
    // Better Auth can return an empty body if the request has no active session.
    const body = await response.clone().text()
    const session = body ? JSON.parse(body) : null
    if (!body || (session && !await getSessionUser(event, session))) {
      // Return a consistent guest response while preserving Better Auth's cookies.
      const headers = new Headers({ "Cache-Control": "no-store" })
      for (const cookie of response.headers.getSetCookie()) headers.append("Set-Cookie", cookie)
      return Response.json(null, { headers })
    }
    return response
  } else if (!publicAuthRoutes.has(route) && !(event.method === "GET" && /^\/reset-password\/[^/]+$/.test(path))) {
    await getUserOrThrowError(event)
  }

  const response = await auth.handler(request)
  if (route === "POST /sign-out" && response.ok) {
    // Expire the HTTP-only proof alongside Better Auth's session cookie.
    deleteCookie(event, "twofa_verified", { path: "/" })
  }
  return response
})
