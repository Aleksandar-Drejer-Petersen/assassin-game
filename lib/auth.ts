import { cookies } from "next/headers"
import { createHash } from "crypto"

const COOKIE_NAME = "assassins_admin"

function expectedToken() {
  const password = process.env.ADMIN_PASSWORD ?? ""
  // Derive a stable, non-reversible token from the password so the raw
  // password is never stored in the browser cookie.
  return createHash("sha256").update(`assassins::${password}`).digest("hex")
}

export function checkPassword(input: string) {
  const password = process.env.ADMIN_PASSWORD ?? ""
  return password.length > 0 && input === password
}

export async function createSession() {
  const store = await cookies()
  store.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export async function destroySession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function isAuthenticated() {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  return !!token && token === expectedToken()
}
