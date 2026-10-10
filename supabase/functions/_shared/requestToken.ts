// This classification grants public access only. User access still requires auth.getUser.
export function isUserAccessToken(token: string | undefined, anonymousKey: string): boolean {
  if (!token || token === anonymousKey || token.startsWith('sb_publishable_')) return false
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')))
    if (claims.role === 'anon') return false
  } catch { /* Invalid user credentials must still fail authenticated verification. */ }
  return true
}
