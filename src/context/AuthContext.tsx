// ============================================================
// CivicLens — Authentication & Authorization Context
// Integrates with Supabase Auth when configured,
// and provides a clearly labelled role-switch simulator for testing
// ============================================================
import React, { createContext, useContext, useState, useEffect } from 'react'
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

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  isSupabaseAuth: boolean
  setDemoRole: (role: UserRole, departmentId?: string, displayName?: string) => void
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

// Default initial user for development demo: Department Officer
const DEFAULT_DEMO_USER: AuthUser = {
  id: 'usr-demo-officer',
  email: 'officer.roads@pune.gov.in',
  displayName: 'Rajesh Patil (Roads Department)',
  role: 'officer',
  departmentId: 'dept-roads',
  isDemoUser: true,
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  isSupabaseAuth: false,
  setDemoRole: () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(isSupabaseConfigured() ? null : DEFAULT_DEMO_USER)
  const [loading, setLoading] = useState<boolean>(true)
  const isSupabase = isSupabaseConfigured()

  useEffect(() => {
    async function initAuth() {
      if (!isSupabase || !supabase) {
        setUser(DEFAULT_DEMO_USER)
        setLoading(false)
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          // Fetch user profile from database
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setUser({
            id: session.user.id,
            email: session.user.email,
            displayName: profile?.display_name || session.user.email?.split('@')[0] || 'Authenticated User',
            role: profile?.role === 'department_officer' ? 'officer' : (profile?.role as UserRole) || 'resident',
            departmentId: profile?.department_id,
            isDemoUser: false,
          })
        } else {
          // Not logged in to Supabase auth
          setUser(null)
        }

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            const { data: profile } = await supabase!
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            setUser({
              id: session.user.id,
              email: session.user.email,
              displayName: profile?.display_name || session.user.email?.split('@')[0] || 'User',
              role: profile?.role === 'department_officer' ? 'officer' : (profile?.role as UserRole) || 'resident',
              departmentId: profile?.department_id,
              isDemoUser: false,
            })
          } else {
            setUser(null)
          }
        })

        return () => {
          authListener.subscription.unsubscribe()
        }
      } catch (e) {
        console.warn('Supabase auth initialization fallback:', e)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [isSupabase])

  const setDemoRole = (role: UserRole, departmentId?: string, displayName?: string) => {
    if (isSupabase) return
    const titles: Record<UserRole, string> = {
      officer: displayName || 'Rajesh Patil (Roads Officer)',
      resident: displayName || 'Priya Sharma (Resident - Ward 14)',
      admin: displayName || 'S. Deshmukh (Municipal Commissioner / Admin)',
      public: displayName || 'Anonymous Citizen / Visitor',
    }

    setUser({
      id: `usr-demo-${role}`,
      displayName: titles[role] || 'User',
      role,
      departmentId: role === 'officer' ? (departmentId || 'dept-roads') : undefined,
      isDemoUser: true,
    })
  }

  const signInWithGoogle = async () => {
    try {
      if (!supabase) {
        alert('Supabase client is not initialized.')
        return
      }

      console.log('Initiating Google OAuth via Supabase...')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })

      if (error) {
        console.error('Google OAuth error:', error)
        alert(`Google Sign-In Error: ${error.message}`)
        return
      }

      if (data?.url) {
        console.log('Redirecting to Google OAuth URL:', data.url)
        window.location.href = data.url
      } else {
        alert('Could not retrieve Google OAuth redirect URL from Supabase.')
      }
    } catch (err: any) {
      console.error('Google OAuth exception:', err)
      alert(`OAuth Exception: ${err?.message || err}`)
    }
  }

  const signOut = async () => {
    if (isSupabase && supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSupabaseAuth: isSupabase && user !== null && !user.isDemoUser,
        setDemoRole,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
