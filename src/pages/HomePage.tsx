import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, MapPin, AlertTriangle, CheckCircle2, Clock,
  ArrowRight, BarChart3, FileText, Layers, TrendingUp,
  Building2, ChevronRight, Shield, Sparkles, HardHat
} from 'lucide-react'
import { dataRepository } from '../services/dataRepository'
import type { Project, SummaryStats, Department } from '../types'
import { ProjectCard } from '../components/ui/ProjectCard'
import { DepthCarousel } from '../components/ui/DepthCarousel'
import { WeightHoverText } from '../components/hero/WeightHoverText'

import { geocodeCity } from '../config/regionConfig'

export function HomePage() {
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const [s, p, d] = await Promise.all([
        dataRepository.getSummaryStats(),
        dataRepository.getProjects(),
        dataRepository.getDepartments(),
      ])
      setStats(s)
      setRecentProjects(p.slice(0, 6))
      setDepartments(d)
    }
    load()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    setIsSearching(true)
    try {
      const geo = await geocodeCity(query)
      if (geo) {
        navigate(`/projects?city=${encodeURIComponent(query)}&lat=${geo.lat}&lng=${geo.lng}`)
      } else {
        navigate(`/projects?search=${encodeURIComponent(query)}`)
      }
    } catch {
      navigate(`/projects?search=${encodeURIComponent(query)}`)
    } finally {
      setIsSearching(false)
    }
  }

  const deptMap = new Map(departments.map(d => [d.id, d]))

  return (
    <div className="bg-transparent text-[#1E293B]">
      {/* Light Hero Section showcasing Global Map Background & Mosaic Trail */}
      <section className="relative min-h-[500px] lg:min-h-[560px] flex items-center bg-transparent text-[#1E293B] overflow-hidden">
        {/* Content Area with High Readability */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 pointer-events-auto">
          <div className="max-w-3xl">
            {/* Top Brand Tag */}
            <div className="inline-flex items-center gap-2 bg-[#FAF7F0]/90 text-[#021217] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mb-4 border border-[#E5D8C5] shadow-2xs backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-[#11e852] animate-pulse" />
              <span className="text-[11px] font-bold tracking-wide">
                MUNICIPAL WORKS OBSERVATORY
              </span>
            </div>

            {/* Headline */}
            <h1 className="weight-hover-trigger font-['Plus_Jakarta_Sans',sans-serif] text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] text-[#1E293B] tracking-tight mb-5">
              <WeightHoverText text="Know What's Happening" />{' '}
              <br />
              <WeightHoverText text="on Your Streets." fromWeight={650} className="weight-hover-accent" />
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg text-[#64748B] leading-relaxed mb-8 max-w-2xl font-normal">
              <WeightHoverText
                text="Track public works. Prevent repeated digging. Hold projects accountable."
                fromWeight={400}
                toWeight={500}
                staggerDuration={6}
              />
            </p>

            {/* Call To Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 mb-8">
              <Link
                to="/projects"
                className="btn-primary text-sm py-3 px-6 shadow-lg shadow-[#021217]/20 whitespace-nowrap inline-flex items-center gap-2 text-[#f1f3d8] font-bold rounded-xl no-underline hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                <MapPin className="w-4 h-4 text-[#11e852]" />
                <span>Explore Projects</span>
                <ArrowRight className="w-4 h-4 text-[#11e852]" />
              </Link>
              <Link
                to="/report"
                className="text-sm py-3 px-6 bg-white/90 hover:bg-[#FAF7F0] text-[#021217] border border-[#E5D8C5] font-bold rounded-xl shadow-2xs backdrop-blur-xs whitespace-nowrap inline-flex items-center gap-2 no-underline transition-all hover:border-[#8B6F55]/50"
              >
                <FileText className="w-4 h-4 text-[#8B6F55]" />
                <span>Report an Issue</span>
              </Link>
            </div>

            {/* Prominent Search bar */}
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 max-w-xl">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B6F55]" />
                <input
                  type="text"
                  placeholder="Search any city or road (e.g. Guntur, Bengaluru, FC Road)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/95 border border-[#e2c09c] text-[#021217] placeholder-[#94A3B8] text-xs font-medium focus:outline-none focus:bg-white focus:border-[#11e852] focus:ring-3 focus:ring-[#11e852]/20 transition-all shadow-2xs backdrop-blur-xs"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="bg-[#021217] hover:bg-[#172a30] text-[#f1f3d8] hover:text-[#11e852] border border-[#e2c09c] font-bold text-xs py-3 px-6 rounded-xl shadow-md whitespace-nowrap disabled:opacity-75 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSearching ? 'Locating City...' : 'Search Works'}
              </button>
            </form>

            {/* Quick links */}
            <div className="flex flex-wrap gap-4 mt-6 text-xs font-semibold text-[#536267]">
              <Link to="/projects" className="flex items-center gap-1.5 hover:text-[#088c2e] transition-colors no-underline">
                <MapPin className="w-3.5 h-3.5 text-[#021217]" /> Interactive Map
                <ChevronRight className="w-3 h-3 opacity-60" />
              </Link>
              <Link to="/scorecard" className="flex items-center gap-1.5 hover:text-[#088c2e] transition-colors no-underline">
                <BarChart3 className="w-3.5 h-3.5 text-[#021217]" /> Agency Scorecards
                <ChevronRight className="w-3 h-3 opacity-60" />
              </Link>
              <Link to="/reports/track" className="flex items-center gap-1.5 hover:text-[#088c2e] transition-colors no-underline">
                <Search className="w-3.5 h-3.5 text-[#021217]" /> Track Grievance
                <ChevronRight className="w-3 h-3 opacity-60" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Fresh Civic 4 KPI Telemetry Cards */}
      {stats && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Active Projects */}
            <div className="bg-white border border-[#E3EAF2] rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                  Active Works
                </span>
                <span className="badge ongoing text-[10px] py-0 px-1.5">
                  In Execution
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#1E293B]">
                  {stats.activeProjects}
                </span>
                <span className="text-[11px] text-[#64748B]">work orders</span>
              </div>
              <p className="text-[10px] text-[#64748B] mt-1 border-t border-[#F1F5F9] pt-1">
                Planned or underway
              </p>
            </div>

            {/* Delayed Projects */}
            <div className="bg-white border border-[#E3EAF2] rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                  Delayed
                </span>
                <span className="badge delayed text-[10px] py-0 px-1.5">
                  Overdue
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#D13B41]">
                  {stats.delayedProjects}
                </span>
                <span className="text-[11px] text-[#64748B]">breached</span>
              </div>
              <p className="text-[10px] text-[#64748B] mt-1 border-t border-[#F1F5F9] pt-1">
                Past locked baseline date
              </p>
            </div>

            {/* Coordination Alerts */}
            <div className="bg-white border border-[#E3EAF2] rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#C41F4F] uppercase tracking-wider">
                  Clash Alerts
                </span>
                <span className="badge clash text-[10px] py-0 px-1.5">
                  Review Needed
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#C41F4F]">
                  {stats.potentialConflicts}
                </span>
                <span className="text-[11px] text-[#64748B]">corridors</span>
              </div>
              <p className="text-[10px] text-[#64748B] mt-1 border-t border-[#F1F5F9] pt-1">
                Cross-agency digging clashes
              </p>
            </div>

            {/* Completed Projects */}
            <div className="bg-white border border-[#E3EAF2] rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                  Delivered
                </span>
                <span className="badge completed text-[10px] py-0 px-1.5">
                  Verified
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#0E7A55]">
                  {stats.completedProjects}
                </span>
                <span className="text-[11px] text-[#64748B]">completed</span>
              </div>
              <p className="text-[10px] text-[#64748B] mt-1 border-t border-[#F1F5F9] pt-1">
                View completion dates on corridor timelines
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Objectives */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-[#088c2e] uppercase tracking-wider">
            Inter-Agency Coordination
          </span>
          <h2 className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl font-extrabold text-[#021217] mt-1">
            Coordinated Infrastructure. Zero Surprise Digging.
          </h2>
          <p className="text-xs sm:text-sm text-[#536267] max-w-xl mx-auto mt-2">
            Bringing road works and utility permits into a unified spatial registry to align schedules and prevent repeat road cutting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-[#E3EAF2] rounded-xl p-5 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-[#e2c09c]/30 text-[#021217] border border-[#e2c09c]/50 flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5 text-[#021217]" />
            </div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#021217] mb-1.5">
              Unified Spatial Registry
            </h3>
            <p className="text-xs text-[#536267] leading-relaxed">
              Every road, water, and telecom permit mapped with verified corridor boundaries and contractor details.
            </p>
          </div>

          <div className="bg-white border border-[#E3EAF2] rounded-xl p-5 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-[#FFE6EE] text-[#C41F4F] flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#021217] mb-1.5">
              Proactive Clash Detection
            </h3>
            <p className="text-xs text-[#536267] leading-relaxed">
              Automated alerts when separate utility agencies schedule excavations on the same corridor within 365 days of paving.
            </p>
          </div>

          <div className="bg-white border border-[#E3EAF2] rounded-xl p-5 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-[#E3F7F5] text-[#088c2e] flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#021217] mb-1.5">
              Verified Milestones
            </h3>
            <p className="text-xs text-[#536267] leading-relaxed">
              Lock original completion targets and enforce independent engineering audit sign-offs before work orders close.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Projects Grid */}
      <section className="bg-white/80 backdrop-blur-xs border-t border-[#e2c09c]/40 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-xl sm:text-2xl font-bold text-[#021217]">
                Active Municipal Work Orders &amp; Permits
              </h2>
              <p className="text-xs text-[#536267] mt-0.5">
                Real-time permits under municipal monitoring
              </p>
            </div>
            <Link
              to="/projects"
              className="text-xs font-bold text-[#021217] hover:text-[#11e852] hover:underline flex items-center gap-1 no-underline"
            >
              <span>View All Registered Permits</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentProjects.length > 0 && (
            <DepthCarousel
              projects={recentProjects}
              departmentMap={deptMap}
            />
          )}
        </div>
      </section>

      {/* Clean Call to Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-[#faf7f0] border border-[#e2c09c] rounded-2xl p-8 text-center shadow-xs">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[#021217] text-[#11e852] border border-[#e2c09c] flex items-center justify-center shadow-xs">
            <Shield className="w-5 h-5 text-[#11e852]" />
          </div>
          <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#021217] mb-2">
            Civic Transparency in Action
          </h2>
          <p className="text-xs sm:text-sm text-[#536267] max-w-lg mx-auto mb-5 leading-relaxed">
            Monitor active excavation permits in your ward or report stalled trenches directly to municipal officers.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/projects" className="btn-primary text-xs py-2.5 px-5 no-underline">
              <MapPin className="w-4 h-4 text-[#11e852]" />
              <span>Explore Map</span>
            </Link>
            <Link
              to="/report"
              className="bg-white hover:bg-[#FAF7F0] text-[#021217] border border-[#e2c09c] text-xs font-bold py-2.5 px-5 rounded-xl transition-colors no-underline shadow-2xs flex items-center gap-1.5 hover:border-[#11e852]"
            >
              <FileText className="w-4 h-4 text-[#021217]" />
              <span>Report Issue</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
