import { useState } from 'react'
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FolderPlus, Layers, MessageSquare,
  Shield, Menu, X, ChevronRight, ArrowLeft, Building2
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { dataRepository } from '../../services/dataRepository'

const officerNavItems = [
  { to: '/officer', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/officer/projects/new', label: 'New Project', icon: FolderPlus },
  { to: '/officer/coordination', label: 'Coordination', icon: Layers },
  { to: '/officer/reports', label: 'Reports Inbox', icon: MessageSquare },
]

export function OfficerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { user, setDemoRole } = useAuth()

  return (
    <div className="min-h-screen flex flex-col bg-[var(--neutral-100)]">
      {/* Top bar */}
      <header className="bg-[var(--navy-800)] text-white sticky top-0 z-50 shadow-lg">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Link to="/officer" className="flex items-center gap-2 text-white no-underline hover:text-white">
                <div className="w-7 h-7 rounded bg-[var(--teal-500)] flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-base">CivicLens</span>
                <span className="hidden sm:inline text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                  Officer Portal
                </span>
              </Link>
            </div>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors no-underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Public View</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky lg:top-14 inset-y-0 left-0 z-40 w-64 bg-white border-r border-[var(--neutral-200)] shadow-lg lg:shadow-none transform transition-transform lg:transform-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
          style={{ top: sidebarOpen ? '56px' : undefined, height: sidebarOpen ? 'calc(100vh - 56px)' : 'calc(100vh - 56px)' }}
        >
          <nav className="p-4 space-y-1">
            <div className="px-3 py-2 text-xs font-semibold text-[var(--neutral-400)] uppercase tracking-wider">
              Department Tools
            </div>
            {officerNavItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors no-underline ${
                    isActive
                      ? 'bg-teal-50 text-[var(--teal-700)] border-l-3 border-[var(--teal-500)]'
                      : 'text-[var(--navy-600)] hover:bg-[var(--neutral-100)] hover:text-[var(--navy-800)]'
                  }`
                }
              >
                <item.icon className="w-4.5 h-4.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Auth & Demo Role Switcher */}
          <div className="absolute bottom-4 left-3 right-3 space-y-2">
            <div className="p-3 rounded-xl bg-slate-900 text-white text-xs space-y-2 shadow-sm border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Active Identity</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 uppercase">
                  {user?.role || 'Officer'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate">{user?.displayName}</p>
              
              <div className="pt-1.5 border-t border-slate-800">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Test Role Switcher
                </label>
                <select
                  value={user?.role || 'officer'}
                  onChange={(e) => {
                    const r = e.target.value as any;
                    if (r === 'officer') setDemoRole('officer', 'dept-roads', 'Rajesh Patil (Roads Officer)');
                    else if (r === 'resident') setDemoRole('resident', undefined, 'Priya Sharma (Resident)');
                    else if (r === 'admin') setDemoRole('admin', undefined, 'S. Deshmukh (Admin)');
                  }}
                  className="w-full text-xs rounded-lg bg-slate-800 border border-slate-700 text-white px-2 py-1"
                >
                  <option value="officer">Department Officer (Roads)</option>
                  <option value="resident">Resident (Citizen - Read Only)</option>
                  <option value="admin">Administrator (Cross-Dept)</option>
                </select>
              </div>

              <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Storage Engine:</span>
                <span className={`font-semibold ${dataRepository.getDataSourceMode().isSupabase ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {dataRepository.getDataSourceMode().isSupabase ? 'Supabase DB' : 'Fallback Seed'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            style={{ top: '56px' }}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="page-enter p-4 sm:p-6 lg:p-8" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
