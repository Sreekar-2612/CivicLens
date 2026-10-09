import { useState } from 'react'
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
import {
  MapPin, Search, BarChart3, FileText, Menu, X,
  Shield, Building2, ChevronRight, Layers, Sparkles
} from 'lucide-react'

const navItems = [
  { to: '/projects', label: 'Projects Explorer', icon: MapPin },
  { to: '/scorecard', label: 'Scorecard', icon: BarChart3 },
  { to: '/report', label: 'Report Issue', icon: FileText },
  { to: '/reports/track', label: 'Track Report', icon: Search },
]

export function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F9FC] text-[#1E293B] font-['Inter',sans-serif]">
      {/* Header with 3px Electric Blue bottom border */}
      <header className="bg-white border-b-3 border-[#2F6BFF] sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 text-[#1E293B] no-underline hover:text-[#1E293B]">
              <div className="w-9 h-9 rounded-xl bg-[#2F6BFF] flex items-center justify-center shadow-xs">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-lg tracking-tight text-[#1E293B]">
                    CivicLens
                  </span>
                  <span className="bg-[#E3F7F5] text-[#12B5A6] text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider border border-[#12B5A6]/20">
                    PMC LIVE
                  </span>
                </div>
                <span className="hidden sm:inline text-xs text-[#64748B] font-medium">
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
                        ? 'bg-[#EAF1FF] text-[#2F6BFF] font-bold shadow-2xs'
                        : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F6F9FC]'
                    }`
                  }
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </NavLink>
              ))}

              <div className="w-px h-5 bg-[#E3EAF2] mx-2" />

              <Link
                to="/officer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1E293B] bg-[#F6F9FC] hover:bg-[#EAF1FF] hover:text-[#2F6BFF] border border-[#E3EAF2] transition-colors no-underline shadow-2xs"
              >
                <Building2 className="w-3.5 h-3.5 text-[#2F6BFF]" />
                <span>Officer Portal</span>
              </Link>
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
                        ? 'bg-[#EAF1FF] text-[#2F6BFF] font-bold'
                        : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F6F9FC]'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
                </NavLink>
              ))}
              <div className="border-t border-[#E3EAF2] my-2" />
              <Link
                to="/officer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#2F6BFF] bg-[#EAF1FF] hover:bg-[#D5E4FF] transition-colors no-underline"
              >
                <Building2 className="w-4 h-4" />
                <span>Officer Portal</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="page-enter" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      {/* Fresh Civic Light Footer */}
      <footer className="bg-white border-t border-[#E3EAF2] text-[#64748B] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-[#2F6BFF] flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#1E293B]">CivicLens</span>
              </div>
              <p className="text-xs leading-relaxed text-[#64748B]">
                Improving transparency and coordination in public works projects.
                A civic-tech initiative for accountable infrastructure and repeat-digging prevention.
              </p>
            </div>
            <div>
              <h4 className="font-['Plus_Jakarta_Sans'] text-xs font-bold text-[#1E293B] uppercase tracking-wider mb-3">
                Quick Navigation
              </h4>
              <ul className="space-y-2 text-xs list-none">
                <li><Link to="/projects" className="hover:text-[#2F6BFF] transition-colors text-[#64748B] no-underline">Projects Explorer</Link></li>
                <li><Link to="/scorecard" className="hover:text-[#2F6BFF] transition-colors text-[#64748B] no-underline">Accountability Scorecard</Link></li>
                <li><Link to="/report" className="hover:text-[#2F6BFF] transition-colors text-[#64748B] no-underline">Report Civic Hazard</Link></li>
                <li><Link to="/reports/track" className="hover:text-[#2F6BFF] transition-colors text-[#64748B] no-underline">Track Grievance</Link></li>
                <li><Link to="/mock-preview" className="hover:text-[#2F6BFF] transition-colors text-[#2F6BFF] font-semibold no-underline">Interactive Fresh Civic Mock</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-['Plus_Jakarta_Sans'] text-xs font-bold text-[#1E293B] uppercase tracking-wider mb-3">
                Demonstration Notice
              </h4>
              <p className="text-xs leading-relaxed text-[#64748B]">
                CivicLens is a civic hackathon prototype demonstrating inter-agency coordination,
                immutable contractual milestones, and public auditability for Pune Municipal Corporation corridors.
              </p>
              <div className="inline-block mt-2.5 px-2.5 py-1 rounded bg-[#EAF1FF] text-[#2F6BFF] text-[11px] font-semibold border border-[#2F6BFF]/20">
                Demonstration Data — Simulated PMC Work Orders
              </div>
            </div>
          </div>
          <div className="border-t border-[#E3EAF2] mt-8 pt-5 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-[#94A3B8]">
            <span>© 2026 CivicLens • Built for Municipal Transparency</span>
            <span>Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-[#64748B] hover:text-[#2F6BFF] no-underline">OpenStreetMap</a> &amp; Esri</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
