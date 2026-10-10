import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Search, Filter, Map as MapIcon, List, X,
  ChevronDown, SlidersHorizontal, AlertTriangle,
  Layers, CheckCircle2, Clock, MapPin, Eye,
  Building2, Calendar, ArrowRight, ShieldAlert,
  Droplets, Flame, Cpu, Radio, Sparkles, ChevronRight,
  Maximize2, Compass, Globe
} from 'lucide-react'
import { dataRepository } from '../services/dataRepository'
import type { Project, Department, FilterState, ProjectStatus, ProjectCategory } from '../types'
import { PROJECT_STATUS_LABELS, PROJECT_CATEGORY_LABELS } from '../types'
import { ProjectCard } from '../components/ui/ProjectCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { EmptyState, LoadingState } from '../components/ui/SharedStates'
import { ProjectMap } from '../components/map/ProjectMap'
import { generateCityProjects, geocodeCity } from '../config/regionConfig'

const ALL_WARDS = [
  'All Wards', 'Ward 03', 'Ward 07', 'Ward 08', 'Ward 10', 'Ward 11', 'Ward 12',
  'Ward 14', 'Ward 15', 'Ward 16', 'Ward 17', 'Ward 18', 'Ward 20',
  'Ward 22', 'Ward 37', 'Ward 42',
]

const STATUS_FILTERS: { key: ProjectStatus | 'all'; label: string; color: string; bg: string }[] = [
  { key: 'all', label: 'All Projects', color: '#0F172A', bg: '#F1F5F9' },
  { key: 'in_progress', label: 'Ongoing Excavations', color: '#92400E', bg: '#FEF3C7' },
  { key: 'delayed', label: 'Delayed / Stalled', color: '#991B1B', bg: '#FEE2E2' },
  { key: 'planned', label: 'Planned Works', color: '#0369A1', bg: '#E0F2FE' },
  { key: 'completed', label: 'Completed Roads', color: '#065F46', bg: '#ECFDF5' },
]

export function ProjectExplorer() {
  const [searchParams, setSearchParams] = useSearchParams()
  const cityParam = searchParams.get('city')
  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')

  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [clashAlertOpen, setClashAlertOpen] = useState(false)

  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get('search') || '',
    status: (searchParams.get('status') as ProjectStatus) || 'all',
    department: searchParams.get('department') || 'all',
    category: (searchParams.get('category') as ProjectCategory) || 'all',
    ward: searchParams.get('ward') || 'all',
    dateRange: {},
  })

  useEffect(() => {
    async function load() {
      const [p, d] = await Promise.all([
        dataRepository.getProjects(),
        dataRepository.getDepartments(),
      ])
      let combined = p
      if (cityParam && latParam && lngParam) {
        const cityProjects = generateCityProjects(cityParam, parseFloat(latParam), parseFloat(lngParam))
        combined = [...cityProjects, ...p]
      }
      setAllProjects(combined)
      setDepartments(d)
      if (combined.length > 0) {
        setSelectedProject(combined[0])
      }
      setLoading(false)
    }
    load()
  }, [cityParam, latParam, lngParam])

  // Filter projects
  const filteredProjects = useMemo(() => {
    let result = [...allProjects]

    if (cityParam) {
      const c = cityParam.toLowerCase()
      result = result.filter(p =>
        p.id.startsWith('gen-') ||
        p.locality.toLowerCase().includes(c) ||
        p.road.toLowerCase().includes(c) ||
        p.title.toLowerCase().includes(c)
      )
    }

    if (filters.search) {
      const s = filters.search.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(s) ||
        p.road.toLowerCase().includes(s) ||
        p.locality.toLowerCase().includes(s) ||
        p.ward.toLowerCase().includes(s) ||
        p.contractor.toLowerCase().includes(s)
      )
    }
    if (filters.status !== 'all') {
      result = result.filter(p => p.status === filters.status)
    }
    if (filters.department !== 'all') {
      result = result.filter(p => p.departmentId === filters.department)
    }
    if (filters.category !== 'all') {
      result = result.filter(p => p.category === filters.category)
    }
    if (filters.ward !== 'all' && filters.ward !== 'All Wards') {
      result = result.filter(p => p.ward === filters.ward)
    }

    return result
  }, [allProjects, filters, cityParam])

  const deptMap = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments])

  const stats = useMemo(() => {
    const total = allProjects.length
    const ongoing = allProjects.filter(p => p.status === 'in_progress').length
    const delayed = allProjects.filter(p => p.status === 'delayed').length
    const completed = allProjects.filter(p => p.status === 'completed').length
    return { total, ongoing, delayed, completed }
  }, [allProjects])

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      department: 'all',
      category: 'all',
      ward: 'all',
      dateRange: {},
    })
    setSearchParams({})
  }

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = filters.search.trim()
    if (!query) return

    const geo = await geocodeCity(query)
    if (geo) {
      setSearchParams({
        city: query,
        lat: geo.lat.toString(),
        lng: geo.lng.toString(),
      })
      setFilters(f => ({ ...f, search: '' }))
    }
  }

  if (loading) return <LoadingState message="Loading projects..." />

  return (
    <div className="min-h-screen bg-transparent font-sans text-slate-900 pb-12">
      {/* Page Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {cityParam ? `${cityParam} Works Observatory` : 'Municipal Works Observatory'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading tracking-tight mt-1">
                Public Works &amp; Road Projects
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Active road excavation, utility works, and construction timelines across {stats.total} monitored projects.
              </p>
            </div>

            {/* Quick Metrics Bar (Clean, Spacious) */}
            <div className="flex items-center gap-6 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200/80 text-xs shrink-0 self-start md:self-center">
              <div>
                <span className="text-slate-500 block font-medium">Ongoing</span>
                <span className="text-base font-bold text-amber-700 font-heading">{stats.ongoing}</span>
              </div>
              <div className="w-[1px] h-6 bg-slate-200" />
              <div>
                <span className="text-slate-500 block font-medium">Delayed</span>
                <span className="text-base font-bold text-rose-600 font-heading">{stats.delayed}</span>
              </div>
              <div className="w-[1px] h-6 bg-slate-200" />
              <div>
                <span className="text-slate-500 block font-medium">Completed</span>
                <span className="text-base font-bold text-emerald-700 font-heading">{stats.completed}</span>
              </div>
            </div>
          </div>

          {/* Unified, Uncongested Toolbar */}
          <div className="mt-6 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Search Input with City Geocoding Support */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 flex items-center">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search any city (e.g. Guntur, Bengaluru) or road name, contractor..."
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#021217] focus:bg-white transition-all shadow-xs"
              />
              <div className="absolute right-2 flex items-center gap-1">
                {filters.search && (
                  <button
                    type="button"
                    onClick={() => setFilters(f => ({ ...f, search: '' }))}
                    className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-[#021217] hover:bg-[#172a30] text-[#f1f3d8] hover:text-[#11e852] border border-[#e2c09c] text-xs font-semibold rounded-lg cursor-pointer shadow-xs transition-colors"
                >
                  Find
                </button>
              </div>
            </form>

            {/* Ward Selector */}
            <div className="flex items-center gap-2">
              <select
                value={filters.ward}
                onChange={(e) => setFilters(f => ({ ...f, ward: e.target.value }))}
                className="text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xs cursor-pointer focus:ring-2 focus:ring-[#11e852] focus:outline-none"
              >
                {ALL_WARDS.map(w => (
                  <option key={w} value={w === 'All Wards' ? 'all' : w}>{w}</option>
                ))}
              </select>

              {/* Department Dropdown */}
              <select
                value={filters.department}
                onChange={(e) => setFilters(f => ({ ...f, department: e.target.value }))}
                className="text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xs cursor-pointer focus:ring-2 focus:ring-[#11e852] focus:outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.shortName}</option>
                ))}
              </select>

              {/* View Toggle */}
              <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border-none cursor-pointer flex items-center gap-1.5 transition-all ${
                    viewMode === 'map'
                      ? 'bg-white text-[#021217] shadow-xs'
                      : 'bg-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  title="Interactive Geospatial Map"
                >
                  <MapIcon className="w-3.5 h-3.5 text-[#088c2e]" />
                  <span className="hidden sm:inline">Interactive Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border-none cursor-pointer flex items-center gap-1.5 transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-[#021217] shadow-xs'
                      : 'bg-transparent text-slate-600 hover:text-slate-900'
                  }`}
                  title="Directory Cards Grid"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Card Grid</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active City Scope Banner if queried from HomePage or Global search */}
          {cityParam && (
            <div className="mt-4 bg-[#FAF7F0] border-2 border-[#e2c09c] rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#021217] text-[#11e852] border border-[#e2c09c]">
                  <MapPin className="w-4 h-4 text-[#11e852]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#021217]">
                    Active City Filter: <span className="text-[#088c2e] font-extrabold">{cityParam}</span>
                  </div>
                  <div className="text-[11px] text-[#536267]">
                    Displaying localized infrastructure projects around coordinates ({latParam}, {lngParam}) • {filteredProjects.length} active works recorded
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchParams({})
                  setFilters(f => ({ ...f, search: '' }))
                }}
                className="text-xs font-bold text-[#021217] hover:text-[#11e852] px-3 py-1.5 rounded-lg bg-white border border-[#e2c09c] hover:bg-[#f1f3d8] transition-colors cursor-pointer"
              >
                Reset / View All Cities ✕
              </button>
            </div>
          )}

          {/* Status Filter Chips (Clean, Spacious) */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {STATUS_FILTERS.map(st => {
              const isSelected = filters.status === st.key
              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setFilters(f => ({ ...f, status: st.key }))}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'border-[#021217] bg-[#e2c09c]/35 text-[#021217] font-bold shadow-xs'
                      : 'border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{st.label}</span>
                  <span className="text-[11px] opacity-70">
                    ({st.key === 'all'
                      ? allProjects.length
                      : allProjects.filter(p => p.status === st.key).length})
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* VIEW 1: Interactive Realistic Map + Floating Inspector */}
        {viewMode === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 70% Map Section */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm relative h-[650px]">
              <ProjectMap
                projects={filteredProjects}
                departments={departments}
                selectedProject={selectedProject}
                onSelectProject={setSelectedProject}
                onCitySearch={(cityName, lat, lng) => {
                  setSearchParams({
                    city: cityName,
                    lat: lat.toString(),
                    lng: lng.toString(),
                  })
                  setFilters(f => ({ ...f, search: '' }))
                }}
                center={latParam && lngParam ? [parseFloat(latParam), parseFloat(lngParam)] : undefined}
                height="100%"
              />
            </div>

            {/* 30% Spacious Dossier Inspector Card */}
            <div className="lg:col-span-4 space-y-4">
              {selectedProject ? (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-5">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Work Order #{selectedProject.id}
                      </span>
                      <h2 className="text-lg font-bold text-slate-900 font-heading mt-1 leading-snug">
                        {selectedProject.title}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#088c2e] shrink-0" />
                        <span>{selectedProject.road}, {selectedProject.ward}</span>
                      </p>
                    </div>
                    <StatusBadge status={selectedProject.status} />
                  </div>

                  {/* Physical Progress Meter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[#536267]">Physical Milestone Progress</span>
                      <span className="text-[#088c2e] font-bold">{selectedProject.progressPercent}% Complete</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#11e852] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${selectedProject.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Financials & Contractor Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[11px] text-[#536267] block font-medium">Contractor Agency</span>
                      <span className="font-bold text-[#021217] mt-0.5 truncate block">{selectedProject.contractor}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[11px] text-[#536267] block font-medium">Sanctioned Budget</span>
                      <span className="font-bold text-[#021217] mt-0.5 block">₹{selectedProject.budgetLakhs} Lakhs</span>
                    </div>
                  </div>

                  {/* Timeline Accountability Card */}
                  <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#e2c09c]/60 text-xs space-y-1.5 text-[#021217]">
                    <div className="flex justify-between">
                      <span className="text-[#536267]">Commencement:</span>
                      <span className="font-semibold text-[#021217]">{selectedProject.startDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#536267]">Locked Baseline Deadline:</span>
                      <span className="font-bold text-[#021217]">{selectedProject.originalEndDate}</span>
                    </div>
                    {selectedProject.revisedEndDate && (
                      <div className="flex justify-between text-[#c40000] font-bold pt-1 border-t border-[#e2c09c]/40">
                        <span>Current Target Date:</span>
                        <span>{selectedProject.revisedEndDate}</span>
                      </div>
                    )}
                  </div>

                  {/* Primary Action Button */}
                  <div className="pt-2">
                    <Link
                      to={`/projects/${selectedProject.id}`}
                      className="w-full py-3 px-4 rounded-xl bg-[#021217] hover:bg-[#172a30] text-[#f1f3d8] hover:text-[#11e852] border border-[#e2c09c] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm no-underline"
                    >
                      <span>View Project Details</span>
                      <ArrowRight className="w-4 h-4 text-[#11e852]" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center space-y-3">
                  <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-[#021217] text-sm font-heading">Select a Project</h3>
                  <p className="text-xs text-[#536267] leading-relaxed">
                    Click any marker on the map to inspect project specifications, progress, and timelines.
                  </p>
                </div>
              )}

              {/* Feed of other matching projects */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#021217] px-1">
                  <span>Filtered Results ({filteredProjects.length})</span>
                  <span className="text-slate-400 font-normal">Click to locate</span>
                </div>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {filteredProjects.map(p => {
                    const isSelected = selectedProject?.id === p.id
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProject(p)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-[#e2c09c]/30 border-[#021217] ring-1 ring-[#021217]'
                            : 'bg-white border-slate-200/70 hover:bg-slate-50'
                        }`}
                      >
                        <div className="truncate flex-1">
                          <p className="font-semibold text-[#021217] truncate">{p.title}</p>
                          <p className="text-[11px] text-[#536267] truncate">{p.road} • {p.ward}</p>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Uncongested Card Grid */}
        {viewMode === 'grid' && (
          <div>
            {filteredProjects.length === 0 ? (
              <EmptyState
                title="No projects found matching criteria"
                description="Try loosening your search terms, selecting 'All Wards', or resetting filters."
                action={
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-4 py-2 rounded-xl bg-[#021217] hover:bg-[#172a30] text-[#f1f3d8] hover:text-[#11e852] border border-[#e2c09c] font-bold text-xs cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    department={deptMap.get(project.departmentId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
