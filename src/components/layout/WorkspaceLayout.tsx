import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { departmentMap } from '../../data/departments'

export function WorkspaceLayout({ role }: { role: 'contractor' | 'auditor' }) {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const [error, setError] = useState('')
  const title = role === 'contractor' ? 'Contractor workspace' : 'Auditor workspace'
  async function authenticate(action: () => Promise<void>) {
    try { setError(''); await action() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Authentication failed.') }
  }
  if (loading) return <main className="p-8" role="status">Checking access…</main>
  if (!user || user.role !== role) return <main className="max-w-xl mx-auto p-8 space-y-4">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p>{user ? `Your ${user.role} account does not have access to this workspace. Ask your administrator to verify your role and project assignments.` : 'Sign in with your verified contractor or auditor account to continue.'}</p>
    {!user && <button className="bg-blue-600 text-white rounded-lg px-4 py-2" onClick={() => void authenticate(signInWithGoogle)}>Sign in with Google</button>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <Link className="block text-blue-700" to="/">Return to public portal</Link>
  </main>
  return <div className="min-h-screen bg-transparent text-slate-800">
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto p-4 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-bold text-xl">SpadeWork · {title}</h1><p className="text-sm text-slate-600">{user.displayName} · {departmentMap.get(user.departmentId || '')?.name || user.departmentId || 'Department not assigned'}</p>
          {user.isDemoUser && <span className="text-xs text-amber-800">Demo account · Changes stay in this browser</span>}
        </div>
        <div className="flex gap-4 items-center text-sm"><Link to="/" className="text-blue-700">Public portal</Link><button onClick={() => void authenticate(signOut)} className="border rounded-lg px-3 py-2">Sign out</button></div>
      </div>
    </header>
    {error && <p role="alert" className="max-w-6xl mx-auto p-4 text-red-700">{error}</p>}
    <main className="max-w-6xl mx-auto p-4 sm:p-6"><Outlet key={`${user.id}:${user.role}:${user.departmentId}`} /></main>
  </div>
}
