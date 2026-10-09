import { useState } from 'react'
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'
import {
  MapPin, Search, BarChart3, FileText, Menu, X,
  Shield, Building2, MessageSquare, ChevronRight
} from 'lucide-react'

const navItems = [
  { to: '/projects', label: 'Projects', icon: MapPin },
  { to: '/scorecard', label: 'Scorecard', icon: BarChart3 },
  { to: '/report', label: 'Report Issue', icon: FileText },
  { to: '/reports/track', label: 'Track Report', icon: Search },
]

export function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[var(--navy-900)] text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 text-white no-underline hover:text-white">
              <div className="w-8 h-8 rounded-lg bg-[var(--teal-500)] flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight">CivicLens</span>
                <span className="hidden sm:inline text-xs text-slate-400 ml-2 font-normal">Public Works Transparency</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors no-underline ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
              <div className="w-px h-6 bg-slate-600 mx-2" />
              <Link
                to="/officer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors no-underline"
              >
                <Building2 className="w-4 h-4" />
                Officer Portal
              </Link>
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-700 bg-[var(--navy-800)]">
            <nav className="px-4 py-3 space-y-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors no-underline ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                </NavLink>
              ))}
              <div className="border-t border-slate-700 my-2" />
              <Link
                to="/officer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors no-underline"
              >
                <Building2 className="w-4 h-4" />
                Officer Portal
                <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
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

      {/* Footer */}
      <footer className="bg-[var(--navy-900)] text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-[var(--teal-500)] flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-semibold">CivicLens</span>
              </div>
              <p className="text-sm leading-relaxed">
                Improving transparency and coordination in public works projects.
                A civic-tech initiative for accountable infrastructure.
              </p>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm list-none">
                <li><Link to="/projects" className="hover:text-white transition-colors text-slate-400 no-underline">Project Explorer</Link></li>
                <li><Link to="/scorecard" className="hover:text-white transition-colors text-slate-400 no-underline">Accountability Scorecard</Link></li>
                <li><Link to="/report" className="hover:text-white transition-colors text-slate-400 no-underline">Report an Issue</Link></li>
                <li><Link to="/reports/track" className="hover:text-white transition-colors text-slate-400 no-underline">Track Your Report</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold mb-3">About This Platform</h4>
              <p className="text-sm leading-relaxed">
                CivicLens is a hackathon prototype demonstrating how shared infrastructure registries
                and proactive coordination can reduce wasteful repeat excavation and improve civic accountability.
              </p>
              <div className="demo-badge mt-3">
                Demonstration Data — Not Official Records
              </div>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
            <span>© 2026 CivicLens. Hackathon Project.</span>
            <span>Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white no-underline">OpenStreetMap</a> contributors</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
