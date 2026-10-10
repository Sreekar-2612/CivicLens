import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../services/supabaseClient'
import type { UserRole } from '../types'

export interface AuthUser {
  id: string
  email?: string
  displayName: string
  role: UserRole
  departmentId?: string
  isDemoUser: boolean
}
export function roleFromProfile(value: unknown): UserRole {
  if (value === 'department_officer') return 'officer'
  return ['resident', 'contractor', 'auditor', 'admin'].includes(String(value)) ? value as UserRole : 'resident'
}
interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  authError: string | null
  isSupabaseAuth: boolean
  setDemoRole: (role: UserRole, departmentId?: string, displayName?: string) => void
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}
const DEFAULT_DEMO_USER: AuthUser = {
  id: 'usr-demo-officer', displayName: 'Rajesh Patil (Roads Department)',
  role: 'officer', departmentId: 'dept-roads', isDemoUser: true,
}
const AuthContext = createContext<AuthContextType>({
  user: null, loading: true, authError: null, isSupabaseAuth: false,
  setDemoRole: () => {}, signInWithGoogle: async () => {}, signOut: async () => {},
})
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isSupabase = isSupabaseConfigured()
  const [user, setUser] = useState<AuthUser | null>(isSupabase ? null : DEFAULT_DEMO_USER)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  useEffect(() => {
    const client = supabase
    if (!isSupabase || !client) { setUser(DEFAULT_DEMO_USER); setLoading(false); return }
    let active = true
    let requestVersion = 0
    async function loadIdentity(identity: { id: string; email?: string } | null) {
      const version = ++requestVersion
      setLoading(true)
      setUser(null)
      setAuthError(null)
      if (!identity) { setLoading(false); return }
      try {
        const { data: profile, error } = await client!.from('profiles')
          .select('display_name, role, department_id').eq('id', identity.id).single()
        if (error || !profile) throw new Error('Your account profile could not be loaded. Please sign in again or contact the administrator.')
        if (!active || version !== requestVersion) return
        setUser({
          id: identity.id, email: identity.email,
          displayName: profile.display_name || identity.email?.split('@')[0] || 'User',
          role: roleFromProfile(profile.role), departmentId: profile.department_id || undefined, isDemoUser: false,
        })
      } catch (error) {
        if (active && version === requestVersion) {
          setUser(null)
          setAuthError(error instanceof Error ? error.message : 'Could not load your account.')
        }
      } finally { if (active && version === requestVersion) setLoading(false) }
    }
    // Run profile queries outside the callback to avoid locking the auth client.
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => { if (active) void loadIdentity(session?.user || null) })
    })
    const initialVersion = requestVersion
    void client.auth.getSession().then(({ data, error }) => {
      if (!active || requestVersion !== initialVersion) return
      if (error) { setAuthError('Could not restore your session. Please sign in again.'); setLoading(false); return }
      void loadIdentity(data.session?.user || null)
    }).catch(() => {
      if (active && requestVersion === initialVersion) { setAuthError('Could not restore your session. Please sign in again.'); setLoading(false) }
    })
    return () => { active = false; requestVersion++; listener.subscription.unsubscribe() }
  }, [isSupabase])
  const setDemoRole = (role: UserRole, departmentId?: string, displayName?: string) => {
    if (isSupabase) return
    const titles: Record<UserRole, string> = {
      officer: 'Rajesh Patil (Roads Officer)', resident: 'Priya Sharma (Resident)',
      contractor: 'Roads Contractor', auditor: 'Roads Auditor', admin: 'Municipal Administrator', public: 'Public Visitor',
    }
    setUser({
      id: `usr-demo-${role}`, displayName: displayName || titles[role], role,
      departmentId: ['officer', 'contractor', 'auditor'].includes(role) ? departmentId || 'dept-roads' : undefined, isDemoUser: true,
    })
    setAuthError(null); setLoading(false)
  }
  const signInWithGoogle = async () => {
    setAuthError(null)
    if (!supabase) { setAuthError('Google sign-in requires a configured Supabase connection.'); return }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: `${window.location.origin}/` },
      })
      if (error) throw error
    } catch (error) { setAuthError(error instanceof Error ? error.message : 'Google sign-in failed.') }
  }
  const signOut = async () => {
    try {
      if (isSupabase && supabase) {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      }
      setUser(null); setAuthError(null)
    } catch (error) { setAuthError(error instanceof Error ? error.message : 'Sign-out failed.') }
  }
  return <AuthContext.Provider value={{ user, loading, authError,
    isSupabaseAuth: isSupabase && user !== null && !user.isDemoUser,
    setDemoRole, signInWithGoogle, signOut }}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
