import { useState } from 'react'
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
import {
  MapPin, Search, BarChart3, FileText, Menu, X,
  Shield, Building2, ChevronRight, Layers, Sparkles, LogOut, User
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/projects', label: 'Projects Explorer', icon: MapPin },
  { to: '/scorecard', label: 'Scorecard', icon: BarChart3 },
  { to: '/report', label: 'Report Issue', icon: FileText },
  { to: '/reports/track', label: 'Track Report', icon: Search },
]

export function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { user, loading, authError, signInWithGoogle, signOut, setDemoRole } = useAuth()
  const workspacePath = user?.role === 'admin' ? '/admin' : user?.role === 'contractor' ? '/contractor' : user?.role === 'auditor' ? '/auditor' : '/officer'
  const workspaceLabel = user?.role === 'admin' ? 'Admin Portal' : user?.role === 'contractor' ? 'Contractor Portal' : user?.role === 'auditor' ? 'Auditor Portal' : 'Officer Portal'

  const isExcluded = location.pathname.startsWith('/report') || 
    location.pathname === '/admin/assign' ||
    location.pathname === '/admin/roles' ||
    (location.pathname === '/admin' && (location.search.includes('tab=assignment') || location.hash === '#assignment'))

  return (
    <div className={`min-h-screen flex flex-col ${isExcluded ? 'bg-[#f1f3d8]' : 'bg-transparent'} text-[#021217] font-['Inter',sans-serif]`}>
      {/* Header with 3px warm champagne bottom border */}
      <header className="bg-white/95 backdrop-blur-md border-b-3 border-[#e2c09c] sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 text-[#021217] no-underline hover:text-[#021217]">
              <div className="w-9 h-9 rounded-xl bg-[#021217] border border-[#e2c09c] flex items-center justify-center shadow-xs">
                <Shield className="w-5 h-5 text-[#e2c09c]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-lg tracking-tight text-[#021217]">
                    QuickSort
                  </span>
                  <span className="font-bungee bg-[#e5fce9] text-[#088c2e] text-[9px] font-normal px-2 py-0.5 rounded-full uppercase tracking-wider border border-[#11e852]/30">
                    CIVIC LIVE
                  </span>
                </div>
                <span className="hidden sm:inline text-xs text-[#536267] font-medium">
                  Public Works Transparency &amp; Coordination
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1.5">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors no-underline ${
                      isActive
                        ? 'bg-[#e2c09c]/35 text-[#021217] border border-[#e2c09c] font-bold shadow-2xs'
                        : 'text-[#536267] hover:text-[#021217] hover:bg-[#f1f3d8]/60'
                    }`
                  }
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </NavLink>
              ))}

              <div className="w-px h-5 bg-[#e2c09c]/40 mx-2" />

              <Link
                to={workspacePath}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#021217] bg-[#f1f3d8]/80 hover:bg-[#e2c09c]/30 hover:text-[#021217] border border-[#e2c09c]/60 transition-colors no-underline shadow-2xs"
              >
                <Building2 className="w-3.5 h-3.5 text-[#021217]" />
                <span>{workspaceLabel}</span>
              </Link>

              {user && !user.isDemoUser ? (
                <div className="flex items-center gap-2 border-l border-[#e2c09c]/40 pl-2 ml-1">
                  <div className="flex items-center gap-1.5 bg-white border border-[#e2c09c]/60 px-2.5 py-1 rounded-lg">
                    <User className="w-3.5 h-3.5 text-[#088c2e]" />
                    <span className="text-xs font-semibold text-[#021217] max-w-[120px] truncate">{user.displayName}</span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signInWithGoogle()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#f1f3d8] bg-[#021217] hover:bg-[#172a30] border border-[#e2c09c] transition-all shadow-xs cursor-pointer ml-1"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#F6F9FC] transition-colors border border-[#E3EAF2] bg-white cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E3EAF2] bg-white shadow-md">
            <nav className="px-4 py-3 space-y-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors no-underline ${
                      isActive
                        ? 'bg-[#e2c09c]/35 text-[#021217] border border-[#e2c09c] font-bold'
                        : 'text-[#536267] hover:text-[#021217] hover:bg-[#FAF7F0]'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 text-[#088c2e]" />
                  {item.label}
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
                </NavLink>
              ))}
              <div className="border-t border-[#E3EAF2] my-2" />
              <Link
                to={workspacePath}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#021217] bg-[#e2c09c]/30 hover:bg-[#e2c09c]/50 border border-[#e2c09c] transition-colors no-underline"
              >
                <Building2 className="w-4 h-4 text-[#088c2e]" />
                <span>{workspaceLabel}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
              </Link>
              {!user || user.isDemoUser ? <button type="button" onClick={() => { void signInWithGoogle(); setMobileMenuOpen(false) }} className="px-3 py-2 text-sm text-[#021217] font-bold hover:text-[#11e852] cursor-pointer">Sign in with Google</button> : <button type="button" onClick={() => { void signOut(); setMobileMenuOpen(false) }} className="px-3 py-2 text-sm text-rose-600 cursor-pointer">Sign out ({user.displayName})</button>}
            </nav>
          </div>
        )}
      </header>

      {authError && <p role="alert" className="mx-auto w-full max-w-7xl p-4 text-sm text-red-700">{authError}</p>}
      {user && !loading && ['contractor', 'auditor', 'officer', 'admin'].includes(user.role) && <div className="max-w-7xl mx-auto w-full px-4 py-2 text-sm"><Link to={user.role === 'admin' ? '/admin' : workspacePath} className="text-[#021217] font-bold hover:text-[#11e852] hover:underline">Open your {user.role} workspace</Link></div>}
      {user?.isDemoUser && <div className="max-w-7xl mx-auto w-full px-4 py-2 flex flex-wrap items-center gap-3 text-sm">
        <label htmlFor="public-demo-role">Local demo role</label>
        <select id="public-demo-role" value={user.role} onChange={event => setDemoRole(event.target.value as typeof user.role)} className="border rounded-lg p-2">
          <option value="resident">Resident</option><option value="officer">Department officer</option><option value="contractor">Contractor</option><option value="auditor">Auditor</option><option value="admin">Administrator</option>
        </select><span className="text-[#64748B]">Demo identities apply only in this browser.</span>
      </div>}

      {/* Main content */}
      <main className="relative z-10 flex-1">
        <div className="page-enter" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      {/* Fresh Civic Light Footer */}
      <footer className="relative z-10 bg-white/95 backdrop-blur-md border-t border-[#E3EAF2] text-[#64748B] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-[#021217] flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-[#11e852]" />
                </div>
                <span className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#1E293B]">QuickSort</span>
              </div>
              <p className="text-xs leading-relaxed text-[#64748B]">
                Improving transparency and coordination in public works projects.
                A civic-tech initiative for accountable infrastructure and repeat-digging prevention.
              </p>
            </div>
            <div>
              <h4 className="font-['Plus_Jakarta_Sans'] text-xs font-bold text-[#021217] uppercase tracking-wider mb-3">
                Quick Navigation
              </h4>
              <ul className="space-y-2 text-xs list-none">
                <li><Link to="/projects" className="hover:text-[#088c2e] transition-colors text-[#536267] no-underline">Projects Explorer</Link></li>
                <li><Link to="/scorecard" className="hover:text-[#088c2e] transition-colors text-[#536267] no-underline">Accountability Scorecard</Link></li>
                <li><Link to="/report" className="hover:text-[#088c2e] transition-colors text-[#536267] no-underline">Report Civic Issue</Link></li>
                <li><Link to="/reports/track" className="hover:text-[#088c2e] transition-colors text-[#536267] no-underline">Track Grievance</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-['Plus_Jakarta_Sans'] text-xs font-bold text-[#021217] uppercase tracking-wider mb-3">
                Municipal Oversight
              </h4>
              <p className="text-xs leading-relaxed text-[#536267]">
                A unified spatial registry connecting municipal departments, contractors, and independent auditors to coordinate street excavations and prevent repeat road cutting.
              </p>
            </div>
          </div>
          <div className="border-t border-[#E3EAF2] mt-8 pt-5 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-[#94A3B8]">
            <span>© 2026 QuickSort • Municipal Public Works Platform</span>
            <span>Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-[#64748B] hover:text-[#088c2e] no-underline">OpenStreetMap</a> &amp; Esri</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
