import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, MapPin, ArrowRight, BarChart3, FileText, Layers, TrendingUp,
  Building2, ChevronRight, Shield, HardHat, Calendar, CheckCircle2, AlertTriangle, Eye
} from 'lucide-react'
import { dataRepository } from '../services/dataRepository'
import type { Project, SummaryStats, Department } from '../types'
import { DepthCarousel } from '../components/ui/DepthCarousel'
import { DatabaseProjectGallery } from '../components/ui/DatabaseProjectGallery'
import { EmptyState, ErrorState, LoadingState } from '../components/ui/SharedStates'
import { WeightHoverText } from '../components/hero/WeightHoverText'
import { geocodeCity } from '../config/regionConfig'

export function HomePage() {
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [dbProjects, setDbProjects] = useState<Project[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    async function load() {
      setDataLoading(true); setDataError(null)
      try {
      const [s, p, d] = await Promise.all([
        dataRepository.getSummaryStats(),
        dataRepository.getProjects(),
        dataRepository.getDepartments(),
      ])
      if (!active) return
      setStats(s)
      setDbProjects(p)
      setDepartments(d)
      } catch (error) {
        if (active) {
          setStats(null); setDbProjects([]); setDepartments([])
          setDataError(error instanceof Error ? error.message : 'Database records could not be loaded')
        }
      } finally { if (active) setDataLoading(false) }
    }
    load()
    return () => { active = false }
  }, [revision])

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
    <div className="bg-transparent text-[#021217]">
      {/* Clean, Spacious Hero Section */}
      <section className="relative min-h-[480px] lg:min-h-[520px] flex items-center bg-transparent text-[#021217] overflow-hidden">
        <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 pointer-events-auto w-full text-center">
          
          {/* Top Brand Tag */}
          <div className="inline-flex items-center gap-2 bg-white/95 text-[#021217] text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider mb-6 border border-[#e2c09c] shadow-2xs backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-[#11e852] animate-pulse" />
            <span className="text-[11px] font-extrabold tracking-wide text-[#021217]">
              MUNICIPAL WORKS OBSERVATORY · LIVE REGISTRY
            </span>
          </div>

          {/* Headline */}
          <h1 className="weight-hover-trigger font-['Plus_Jakarta_Sans',sans-serif] text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] text-[#021217] tracking-tight mb-5 max-w-4xl mx-auto">
            <WeightHoverText text="Know What's Happening" />{' '}
            <br />
            <WeightHoverText text="on Your Streets." fromWeight={650} className="weight-hover-accent" />
          </h1>

          {/* Supporting Text */}
          <p className="text-base sm:text-lg text-[#536267] leading-relaxed mb-8 max-w-2xl mx-auto font-normal">
            <WeightHoverText
              text="Track public works. Prevent repeated digging. Hold projects accountable."
              fromWeight={400}
              toWeight={500}
              staggerDuration={6}
            />
          </p>

          {/* Call To Action Buttons with Rich Hover Effects */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
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
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 max-w-xl mx-auto">
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
          <div className="flex flex-wrap items-center justify-center gap-5 mt-6 text-xs font-semibold text-[#536267]">
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
      </section>

      {/* 4 KPI Telemetry Cards with Hover Elevate Effects */}
      {stats && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 mb-10 relative z-10">
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

      {/* Live Active Database Projects in 3D Depth Carousel */}
      <section className="bg-white/80 backdrop-blur-xs border-t border-[#e2c09c]/40 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#11e852] animate-pulse" />
                <span className="text-[11px] font-bold text-[#088c2e] uppercase tracking-wider">
                  {dataLoading ? 'Loading registry…' : dataError ? 'Registry unavailable' : `${dbProjects.length} published records`}
                </span>
              </div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl font-extrabold text-[#021217]">
                Active Municipal Work Orders &amp; Permits
              </h2>
              <p className="text-xs sm:text-sm text-[#536267] mt-1">
                Published work permits recorded in the database
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

          {dataLoading ? <LoadingState message="Loading published projects…" /> : dataError ? (
            <ErrorState title="Projects could not be loaded" description={dataError} onRetry={() => setRevision(value => value + 1)} />
          ) : dbProjects.length === 0 ? (
            <EmptyState title="No published projects" description="There are no published work orders in the database yet." />
          ) : (
            <DepthCarousel
              projects={dbProjects}
              departmentMap={deptMap}
            />
          )}
        </div>
      </section>

      <DatabaseProjectGallery projects={dbProjects} loading={dataLoading} error={dataError} />

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
