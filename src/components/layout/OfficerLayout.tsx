import { useState } from 'react'
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FolderPlus, Layers, MessageSquare,
  Shield, Menu, X, ChevronRight, ArrowLeft, Building2, Bell
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { dataRepository } from '../../services/dataRepository'

const officerNavItems = [
  { to: '/officer', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/officer/projects/new', label: 'New Work Order', icon: FolderPlus },
  { to: '/officer/coordination', label: 'Clash Coordination', icon: Layers },
  { to: '/officer/reports', label: 'Grievance Inbox', icon: MessageSquare },
  { to: '/officer/notifications', label: 'Notifications', icon: Bell },
]

export function OfficerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { user, loading, setDemoRole } = useAuth()

  if (loading) return <p role="status" className="p-8">Loading your account...</p>
  if (!user || !['officer', 'admin'].includes(user.role)) return <div className="p-8 space-y-4"><h1 className="text-xl font-bold">Department access required</h1><p>This workspace is available to department officers and administrators.</p><Link to="/">Return to public portal</Link></div>

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[#021217] font-['Inter',sans-serif]">
      {/* Top bar with 3px warm champagne accent */}
      <header className="bg-white/95 backdrop-blur-md border-b-3 border-[#e2c09c] text-[#021217] sticky top-0 z-50 shadow-xs">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-1.5 rounded-lg text-[#536267] hover:text-[#021217] hover:bg-[#f1f3d8] transition-colors border border-[#e2c09c]/40 bg-white cursor-pointer"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Link to="/officer" className="flex items-center gap-2 text-[#021217] no-underline hover:text-[#021217]">
                <div className="w-7 h-7 rounded-lg bg-[#021217] border border-[#e2c09c] flex items-center justify-center text-[#e2c09c] shadow-xs">
                  <Shield className="w-4 h-4 text-[#e2c09c]" />
                </div>
                <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-base tracking-tight">QuickSort</span>
                <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-[#e5fce9] text-[#088c2e] font-bold border border-[#11e852]/30">
                  Officer Desk
                </span>
              </Link>
            </div>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#536267] hover:text-[#021217] transition-colors no-underline bg-white hover:bg-[#faf3eb] px-2.5 py-1.5 rounded-lg border border-[#e2c09c]/40"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Portal</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky lg:top-14 inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#e2c09c]/40 shadow-sm lg:shadow-none transform transition-transform lg:transform-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
          style={{ top: sidebarOpen ? '56px' : undefined, height: sidebarOpen ? 'calc(100vh - 56px)' : 'calc(100vh - 56px)' }}
        >
          <nav className="p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-[#536267] uppercase tracking-wider">
              Department Operations
            </div>
            {officerNavItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors no-underline ${
                    isActive
                      ? 'bg-[#e2c09c]/35 text-[#021217] font-bold border border-[#e2c09c] shadow-2xs'
                      : 'text-[#536267] hover:bg-[#faf3eb] hover:text-[#021217]'
                  }`
                }
              >
                <item.icon className="w-4 h-4 text-[#021217]" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Auth & Demo Role Switcher */}
          <div className="absolute bottom-4 left-3 right-3 space-y-2">
            <div className="p-3 rounded-xl bg-[#faf3eb] text-[#021217] text-xs space-y-2 border border-[#e2c09c]/40 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-[#536267] uppercase">Active Identity</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e5fce9] text-[#088c2e] uppercase">
                  {user?.role || 'Officer'}
                </span>
              </div>
              <p className="text-xs text-[#1E293B] font-semibold truncate">{user?.displayName}</p>
              
              {!dataRepository.getDataSourceMode().isSupabase && <div className="pt-2 border-t border-[#E3EAF2]">
                <label className="block text-[10px] uppercase font-bold text-[#64748B] mb-1">
                  Testing Role Switcher
                </label>
                <select
                  value={user?.role || 'officer'}
                  onChange={(e) => {
                    const r = e.target.value as any;
                    if (r === 'officer') setDemoRole('officer', 'dept-roads', 'Rajesh Patil (Roads Officer)');
                    else if (r === 'resident') setDemoRole('resident', undefined, 'Priya Sharma (Resident)');
                    else if (r === 'admin') setDemoRole('admin', undefined, 'S. Deshmukh (Admin)');
                    else if (r === 'contractor' || r === 'auditor') setDemoRole(r, 'dept-roads');
                  }}
                  className="w-full text-xs rounded-lg bg-white border border-[#CBD5E1] text-[#1E293B] px-2 py-1 font-medium focus:border-[#021217] focus:outline-none"
                >
                  <option value="officer">Department Officer (Roads)</option>
                  <option value="resident">Resident (Citizen - Read Only)</option>
                  <option value="admin">Administrator (Cross-Dept)</option>
                  <option value="contractor">Contractor (Roads)</option>
                  <option value="auditor">Auditor (Roads)</option>
                </select>
              </div>}

              <div className="pt-1 text-[10px] text-[#64748B] flex items-center justify-between">
                <span>Database:</span>
                <span className={`font-semibold ${dataRepository.getDataSourceMode().isSupabase ? 'text-[#12B5A6]' : 'text-[#FFB020]'}`}>
                  {dataRepository.getDataSourceMode().isSupabase ? 'Supabase PostgreSQL' : 'Local Seed Mode'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            style={{ top: '56px' }}
          />
        )}

        {/* Main content */}
        <main className="relative z-10 flex-1 min-w-0">
          <div className="page-enter p-4 sm:p-6 lg:p-8" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
