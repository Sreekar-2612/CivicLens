import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, MapPin, ArrowRight, BarChart3, FileText, Layers, TrendingUp,
  Building2, ChevronRight, Shield, HardHat, Calendar, CheckCircle2, AlertTriangle
} from 'lucide-react'
import { dataRepository } from '../services/dataRepository'
import type { Project, SummaryStats, Department } from '../types'
import { DepthCarousel } from '../components/ui/DepthCarousel'
import { WeightHoverText } from '../components/hero/WeightHoverText'
import { StatusBadge } from '../components/ui/StatusBadge'
import { geocodeCity } from '../config/regionConfig'

export function HomePage() {
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [dbProjects, setDbProjects] = useState<Project[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [activeProjectIdx, setActiveProjectIdx] = useState(0)
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
      setDbProjects(p)
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
  const activeHeroProject = dbProjects[activeProjectIdx] || dbProjects[0]
  const activeHeroDept = activeHeroProject ? deptMap.get(activeHeroProject.departmentId) : undefined

  return (
    <div className="bg-transparent text-[#021217]">
      {/* Light Hero Section with Split Database Showcase */}
      <section className="relative min-h-[580px] lg:min-h-[640px] flex items-center bg-transparent text-[#021217] overflow-hidden">
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 pointer-events-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Headlines, Search & Actions */}
            <div className="lg:col-span-7 max-w-2xl">
              {/* Top Brand Tag */}
              <div className="inline-flex items-center gap-2 bg-white/90 text-[#021217] text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-5 border border-[#e2c09c] shadow-2xs backdrop-blur-xs">
                <span className="w-2 h-2 rounded-full bg-[#11e852] animate-pulse" />
                <span className="text-[11px] font-extrabold tracking-wide text-[#021217]">
                  MUNICIPAL WORKS OBSERVATORY · LIVE REGISTRY
                </span>
              </div>

              {/* Headline */}
              <h1 className="weight-hover-trigger font-['Plus_Jakarta_Sans',sans-serif] text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] text-[#021217] tracking-tight mb-5">
                <WeightHoverText text="Know What's Happening" />{' '}
                <br />
                <WeightHoverText text="on Your Streets." fromWeight={650} className="weight-hover-accent" />
              </h1>

              {/* Supporting Text */}
              <p className="text-base sm:text-lg text-[#536267] leading-relaxed mb-8 max-w-xl font-normal">
                <WeightHoverText
                  text="Track public works. Prevent repeated digging. Hold projects accountable."
                  fromWeight={400}
                  toWeight={500}
                  staggerDuration={6}
                />
              </p>

              {/* Call To Action Buttons with Rich Hover Effects */}
              <div className="flex flex-wrap items-center gap-3.5 mb-8">
                <Link
                  to="/projects"
                  className="btn-primary text-sm py-3 px-6 shadow-md shadow-[#021217]/15 whitespace-nowrap inline-flex items-center gap-2 text-[#f1f3d8] font-bold rounded-xl no-underline hover:scale-[1.03] hover:shadow-xl hover:border-[#11e852] active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-[#11e852]" />
                  <span>Explore Projects</span>
                  <ArrowRight className="w-4 h-4 text-[#11e852] transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/report"
                  className="text-sm py-3 px-6 bg-white/95 hover:bg-[#faf7f0] text-[#021217] border border-[#e2c09c] hover:border-[#021217] font-bold rounded-xl shadow-2xs hover:shadow-md hover:scale-[1.03] active:scale-[0.98] backdrop-blur-xs whitespace-nowrap inline-flex items-center gap-2 no-underline transition-all duration-200 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#021217]" />
                  <span>Report an Issue</span>
                </Link>
              </div>

              {/* Prominent Search bar */}
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 max-w-xl">
                <div className="flex-1 relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#536267] group-focus-within:text-[#021217] transition-colors" />
                  <input
                    type="text"
                    placeholder="Search road or ward in database (e.g. MG Road, Karve Road, FC Road)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/95 border border-[#e2c09c] text-[#021217] placeholder-[#94A3B8] text-xs font-medium focus:outline-none focus:bg-white focus:border-[#11e852] focus:ring-3 focus:ring-[#11e852]/20 hover:border-[#021217]/50 transition-all shadow-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="bg-[#021217] hover:bg-[#021217]/90 text-[#f1f3d8] hover:text-[#11e852] border border-[#e2c09c] font-bold text-xs py-3 px-6 rounded-xl shadow-xs hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap disabled:opacity-75 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSearching ? 'Locating...' : 'Search Works'}
                </button>
              </form>

              {/* Quick Navigation Links */}
              <div className="flex flex-wrap gap-4 mt-6 text-xs font-semibold text-[#536267]">
                <Link to="/projects" className="flex items-center gap-1.5 hover:text-[#088c2e] hover:translate-x-0.5 transition-all no-underline">
                  <MapPin className="w-3.5 h-3.5 text-[#021217]" /> Interactive Map
                  <ChevronRight className="w-3 h-3 opacity-60" />
                </Link>
                <Link to="/scorecard" className="flex items-center gap-1.5 hover:text-[#088c2e] hover:translate-x-0.5 transition-all no-underline">
                  <BarChart3 className="w-3.5 h-3.5 text-[#021217]" /> Agency Scorecards
                  <ChevronRight className="w-3 h-3 opacity-60" />
                </Link>
                <Link to="/reports/track" className="flex items-center gap-1.5 hover:text-[#088c2e] hover:translate-x-0.5 transition-all no-underline">
                  <Search className="w-3.5 h-3.5 text-[#021217]" /> Track Grievance
                  <ChevronRight className="w-3 h-3 opacity-60" />
                </Link>
              </div>
            </div>

            {/* Right Column: Hero Real Database Project Showcase with Visual Effects */}
            {activeHeroProject && (
              <div className="lg:col-span-5">
                <div className="relative group bg-white/95 backdrop-blur-md border border-[#e2c09c] hover:border-[#11e852] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500">
                  
                  {/* Photo Container with Depth & Cinematic Zoom Effects */}
                  <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-[#021217]">
                    <img
                      src={activeHeroProject.photoUrl || '/images/works/asphalt-resurfacing.png'}
                      alt={activeHeroProject.title}
                      className="w-full h-full object-cover group-hover:scale-108 group-hover:brightness-105 transition-all duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#021217] via-[#021217]/30 to-black/30" />
                    
                    {/* Top Floating Badges */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                      <span className="text-xs font-mono font-extrabold text-[#f1f3d8] bg-[#021217]/85 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-xs">
                        DB ID: {activeHeroProject.id.toUpperCase()}
                      </span>
                      <StatusBadge status={activeHeroProject.status} />
                    </div>

                    {/* Bottom Photo Title Overlay */}
                    <div className="absolute bottom-4 left-4 right-4 space-y-1">
                      <div className="flex items-center gap-2">
                        {activeHeroDept && (
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white shadow-xs"
                            style={{ backgroundColor: activeHeroDept.color }}
                          >
                            {activeHeroDept.shortName}
                          </span>
                        )}
                        <span className="text-[11px] font-semibold text-[#f1f3d8]/90 bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-full">
                          {activeHeroProject.locality} · {activeHeroProject.ward}
                        </span>
                      </div>
                      <h2 className="font-['Plus_Jakarta_Sans'] font-extrabold text-lg sm:text-xl text-white leading-tight drop-shadow-md">
                        {activeHeroProject.title}
                      </h2>
                    </div>
                  </div>

                  {/* Card Body with Exact Database Metrics */}
                  <div className="p-5 space-y-4 bg-white/90">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#faf7f0] border border-[#e2c09c]/40">
                        <span className="text-[10px] font-bold text-[#536267] uppercase tracking-wider block">
                          Contractor
                        </span>
                        <span className="font-bold text-[#021217] truncate block mt-0.5">
                          {activeHeroProject.contractor}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#faf7f0] border border-[#e2c09c]/40">
                        <span className="text-[10px] font-bold text-[#536267] uppercase tracking-wider block">
                          Sanctioned Budget
                        </span>
                        <span className="font-bold text-[#021217] block mt-0.5">
                          ₹{activeHeroProject.budgetLakhs} Lakhs
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar with Exact DB Percent */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-[#536267] flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-[#11e852]" />
                          Database Progress
                        </span>
                        <span className="font-extrabold text-[#021217]">
                          {activeHeroProject.progressPercent}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#f1f3d8] rounded-full overflow-hidden border border-[#e2c09c]/40">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            activeHeroProject.status === 'delayed' ? 'bg-[#ff0000]' : 'bg-[#11e852]'
                          }`}
                          style={{ width: `${activeHeroProject.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Link to Full Project Details */}
                    <div className="pt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-[#536267]">
                        <Calendar className="w-3.5 h-3.5 text-[#021217]" />
                        <span>Deadline: {activeHeroProject.revisedEndDate || activeHeroProject.originalEndDate}</span>
                      </div>
                      <Link
                        to={`/projects/${activeHeroProject.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#021217] hover:text-[#088c2e] hover:underline"
                      >
                        <span>Inspect Dossier</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Interactive Database Record Switcher with Hover Thumbnails */}
                    {dbProjects.length > 1 && (
                      <div className="pt-3 border-t border-[#e2c09c]/40">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-extrabold text-[#536267] uppercase tracking-wider">
                            Database Live Records ({dbProjects.length} Verified)
                          </span>
                          <span className="text-[10px] text-[#536267]">
                            Click road to inspect
                          </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {dbProjects.slice(0, 5).map((p, idx) => (
                            <button
                              key={p.id}
                              onClick={() => setActiveProjectIdx(idx)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                                idx === activeProjectIdx
                                  ? 'bg-[#021217] text-[#f1f3d8] shadow-xs scale-102 border border-[#11e852]'
                                  : 'bg-white hover:bg-[#faf7f0] text-[#021217] border border-[#e2c09c]/50 hover:border-[#021217]'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#11e852]" />
                              <span>{p.road}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* 4 KPI Telemetry Cards with Hover Elevate Effects */}
      {stats && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Active Projects */}
            <div className="bg-white/95 backdrop-blur-xs border border-[#e2c09c]/60 hover:border-[#11e852] rounded-2xl p-4 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#536267] uppercase tracking-wider">
                  Active Works
                </span>
                <span className="badge ongoing text-[10px] py-0 px-2 rounded-full font-bold">
                  In Execution
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl font-extrabold text-[#021217] group-hover:text-[#088c2e] transition-colors">
                  {stats.activeProjects}
                </span>
                <span className="text-[11px] text-[#536267] font-medium">work orders</span>
              </div>
              <p className="text-[10px] text-[#536267] mt-1.5 border-t border-[#e2c09c]/30 pt-1.5">
                Under municipal execution
              </p>
            </div>

            {/* Delayed Projects */}
            <div className="bg-white/95 backdrop-blur-xs border border-[#e2c09c]/60 hover:border-[#ff0000] rounded-2xl p-4 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#536267] uppercase tracking-wider">
                  Delayed
                </span>
                <span className="badge delayed text-[10px] py-0 px-2 rounded-full font-bold">
                  Overdue
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl font-extrabold text-[#ff0000] group-hover:scale-105 transition-transform">
                  {stats.delayedProjects}
                </span>
                <span className="text-[11px] text-[#536267] font-medium">breached</span>
              </div>
              <p className="text-[10px] text-[#536267] mt-1.5 border-t border-[#e2c09c]/30 pt-1.5">
                Past locked baseline date
              </p>
            </div>

            {/* Coordination Alerts */}
            <div className="bg-white/95 backdrop-blur-xs border border-[#e2c09c]/60 hover:border-[#ff0000] rounded-2xl p-4 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#536267] uppercase tracking-wider">
                  Clash Alerts
                </span>
                <span className="badge clash text-[10px] py-0 px-2 rounded-full font-bold">
                  Review Needed
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl font-extrabold text-[#ff0000] group-hover:scale-105 transition-transform">
                  {stats.potentialConflicts}
                </span>
                <span className="text-[11px] text-[#536267] font-medium">corridors</span>
              </div>
              <p className="text-[10px] text-[#536267] mt-1.5 border-t border-[#e2c09c]/30 pt-1.5">
                Cross-agency digging clashes
              </p>
            </div>

            {/* Completed Projects */}
            <div className="bg-white/95 backdrop-blur-xs border border-[#e2c09c]/60 hover:border-[#11e852] rounded-2xl p-4 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#536267] uppercase tracking-wider">
                  Delivered
                </span>
                <span className="badge completed text-[10px] py-0 px-2 rounded-full font-bold">
                  Verified
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl font-extrabold text-[#088c2e] group-hover:scale-105 transition-transform">
                  {stats.completedProjects}
                </span>
                <span className="text-[11px] text-[#536267] font-medium">completed</span>
              </div>
              <p className="text-[10px] text-[#536267] mt-1.5 border-t border-[#e2c09c]/30 pt-1.5">
                Engineering audits closed
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Inter-Agency Objectives */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center mb-10">
          <span className="text-xs font-extrabold text-[#088c2e] uppercase tracking-wider">
            Inter-Agency Coordination Engine
          </span>
          <h2 className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl font-extrabold text-[#021217] mt-1.5">
            Coordinated Infrastructure. Zero Surprise Digging.
          </h2>
          <p className="text-xs sm:text-sm text-[#536267] max-w-xl mx-auto mt-2 leading-relaxed">
            Bringing road works and utility permits into a unified spatial registry to align schedules and prevent repeat road cutting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/90 backdrop-blur-xs border border-[#e2c09c]/60 hover:border-[#11e852] rounded-2xl p-6 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-default">
            <div className="w-11 h-11 rounded-2xl bg-[#021217] text-[#11e852] border border-[#e2c09c] flex items-center justify-center mb-4 shadow-xs group-hover:scale-110 transition-transform">
              <MapPin className="w-5 h-5 text-[#11e852]" />
            </div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#021217] mb-2 group-hover:text-[#088c2e] transition-colors">
              Unified Spatial Registry
            </h3>
            <p className="text-xs text-[#536267] leading-relaxed">
              Every road, water, and telecom permit mapped with verified corridor boundaries and contractor details.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-xs border border-[#e2c09c]/60 hover:border-[#ff0000] rounded-2xl p-6 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-default">
            <div className="w-11 h-11 rounded-2xl bg-[#ff0000]/10 text-[#ff0000] border border-[#ff0000]/30 flex items-center justify-center mb-4 shadow-xs group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#021217] mb-2 group-hover:text-[#ff0000] transition-colors">
              Proactive Clash Detection
            </h3>
            <p className="text-xs text-[#536267] leading-relaxed">
              Automated alerts when separate utility agencies schedule excavations on the same corridor within 365 days of paving.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-xs border border-[#e2c09c]/60 hover:border-[#11e852] rounded-2xl p-6 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-default">
            <div className="w-11 h-11 rounded-2xl bg-[#021217] text-[#e2c09c] border border-[#e2c09c] flex items-center justify-center mb-4 shadow-xs group-hover:scale-110 transition-transform">
              <BarChart3 className="w-5 h-5 text-[#e2c09c]" />
            </div>
            <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#021217] mb-2 group-hover:text-[#088c2e] transition-colors">
              Verified Milestones
            </h3>
            <p className="text-xs text-[#536267] leading-relaxed">
              Lock original completion targets and enforce independent engineering audit sign-offs before work orders close.
            </p>
          </div>
        </div>
      </section>

      {/* Live Active Database Projects in 3D Depth Carousel */}
      <section className="bg-white/80 backdrop-blur-xs border-t border-[#e2c09c]/40 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#11e852] animate-pulse" />
                <span className="text-[11px] font-bold text-[#088c2e] uppercase tracking-wider">
                  Live Database Entries ({dbProjects.length} Verified Records)
                </span>
              </div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl font-extrabold text-[#021217]">
                Active Municipal Work Orders &amp; Permits
              </h2>
              <p className="text-xs sm:text-sm text-[#536267] mt-1">
                Verified work permits currently logged in the central infrastructure database
              </p>
            </div>
            <Link
              to="/projects"
              className="text-xs font-bold text-[#021217] hover:text-[#088c2e] flex items-center gap-1.5 no-underline bg-white hover:bg-[#faf7f0] border border-[#e2c09c] px-4 py-2.5 rounded-xl shadow-2xs hover:shadow-md transition-all self-start sm:self-auto"
            >
              <span>View All Registered Permits</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#021217]" />
            </Link>
          </div>

          {dbProjects.length > 0 && (
            <DepthCarousel
              projects={dbProjects}
              departmentMap={deptMap}
            />
          )}
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="bg-white/95 border border-[#e2c09c] rounded-3xl p-8 sm:p-12 text-center shadow-md">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-[#021217] text-[#11e852] border border-[#e2c09c] flex items-center justify-center shadow-xs">
            <Shield className="w-6 h-6 text-[#11e852]" />
          </div>
          <h2 className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl font-extrabold text-[#021217] mb-3">
            Civic Transparency in Action
          </h2>
          <p className="text-xs sm:text-sm text-[#536267] max-w-lg mx-auto mb-6 leading-relaxed">
            Monitor active excavation permits in your ward or report stalled trenches directly to municipal officers.
          </p>
          <div className="flex flex-wrap justify-center gap-3.5">
            <Link
              to="/projects"
              className="btn-primary text-xs py-3 px-6 shadow-md hover:shadow-xl hover:scale-[1.03] transition-all no-underline"
            >
              <MapPin className="w-4 h-4 text-[#11e852]" />
              <span>Explore Map</span>
            </Link>
            <Link
              to="/report"
              className="bg-white hover:bg-[#faf7f0] text-[#021217] border border-[#e2c09c] hover:border-[#021217] text-xs font-bold py-3 px-6 rounded-xl transition-all shadow-2xs hover:shadow-md hover:scale-[1.03] no-underline flex items-center gap-1.5"
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
