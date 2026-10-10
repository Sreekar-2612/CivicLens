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
    {!user && <button className="bg-[#021217] hover:bg-[#172a30] text-[#f1f3d8] hover:text-[#11e852] border border-[#e2c09c] font-bold rounded-lg px-4 py-2 transition-colors cursor-pointer" onClick={() => void authenticate(signInWithGoogle)}>Sign in with Google</button>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <Link className="block text-[#021217] hover:text-[#11e852] font-semibold" to="/">Return to public portal</Link>
  </main>
  return <div className="min-h-screen bg-transparent text-[#021217]">
    <header className="bg-white/95 backdrop-blur-md border-b border-[#e2c09c]/40">
      <div className="max-w-6xl mx-auto p-4 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-bold text-xl text-[#021217]">QuickSort · {title}</h1><p className="text-sm text-[#536267]">{user.displayName} · {departmentMap.get(user.departmentId || '')?.name || user.departmentId || 'Department not assigned'}</p>
          {user.isDemoUser && <span className="text-xs text-amber-800">Demo account · Changes stay in this browser</span>}
        </div>
        <div className="flex gap-4 items-center text-sm"><Link to="/" className="text-[#021217] hover:text-[#11e852] font-semibold">Public portal</Link><button onClick={() => void authenticate(signOut)} className="border border-[#CBD5E1] rounded-lg px-3 py-2 hover:bg-[#FAF7F0] cursor-pointer">Sign out</button></div>
      </div>
    </header>
    {error && <p role="alert" className="max-w-6xl mx-auto p-4 text-red-700">{error}</p>}
    <main className="relative z-10 max-w-6xl mx-auto p-4 sm:p-6"><Outlet key={`${user.id}:${user.role}:${user.departmentId}`} /></main>
  </div>
}
