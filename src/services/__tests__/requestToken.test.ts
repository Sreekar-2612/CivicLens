import { describe, expect, it } from 'vitest'
import { isUserAccessToken } from '../../../supabase/functions/_shared/requestToken'

describe('public report authentication classification', () => {
  it('recognizes public keys across rotations without granting authenticated access', () => {
    const anonJwt = `header.${btoa(JSON.stringify({ role: 'anon' }))}.signature`
    expect(isUserAccessToken(anonJwt, 'different-current-key')).toBe(false)
    expect(isUserAccessToken('sb_publishable_example', 'current-key')).toBe(false)
    expect(isUserAccessToken(undefined, 'current-key')).toBe(false)
  })
  it('requires verification for every user token, including invalid credentials', () => {
    const jwt = `header.${btoa(JSON.stringify({ role: 'authenticated' }))}.signature`
    expect(isUserAccessToken(jwt, 'public-key')).toBe(true)
    expect(isUserAccessToken('malformed-user-token', 'public-key')).toBe(true)
  })
})
