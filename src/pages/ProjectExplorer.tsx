import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search, Filter, Map as MapIcon, List, X,
  ChevronDown, SlidersHorizontal
} from 'lucide-react'
import { dataRepository } from '../services/dataRepository'
import type { Project, Department, FilterState, ProjectStatus, ProjectCategory } from '../types'
import { PROJECT_STATUS_LABELS, PROJECT_CATEGORY_LABELS } from '../types'
import { ProjectCard } from '../components/ui/ProjectCard'
import { EmptyState, LoadingState } from '../components/ui/SharedStates'
import { ProjectMap } from '../components/map/ProjectMap'

const ALL_WARDS = [
  'Ward 03', 'Ward 07', 'Ward 08', 'Ward 10', 'Ward 11', 'Ward 12',
  'Ward 14', 'Ward 15', 'Ward 16', 'Ward 17', 'Ward 18', 'Ward 20',
  'Ward 22', 'Ward 37', 'Ward 42',
]

export function ProjectExplorer() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

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
      setAllProjects(p)
      setDepartments(d)
      setLoading(false)
    }
    load()
  }, [])

  // Apply filters
  const filteredProjects = useMemo(() => {
    let result = [...allProjects]

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
    if (filters.ward !== 'all') {
      result = result.filter(p => p.ward === filters.ward)
    }

    return result
  }, [allProjects, filters])

  const deptMap = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments])

  const activeFilterCount = [
    filters.status !== 'all',
    filters.department !== 'all',
    filters.category !== 'all',
    filters.ward !== 'all',
  ].filter(Boolean).length

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

  if (loading) return <LoadingState message="Loading projects..." />

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--navy-900)]">Project Explorer</h1>
        <p className="text-sm text-[var(--neutral-500)] mt-1">
          Browse {allProjects.length} public works projects across Pune
        </p>
      </div>

      {/* Search and view toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--neutral-400)]" />
          <input
            type="text"
            placeholder="Search projects, roads, localities..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--neutral-300)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal-500)] focus:border-transparent transition-all"
          />
          {filters.search && (
            <button
              onClick={() => setFilters(f => ({ ...f, search: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--neutral-400)] hover:text-[var(--neutral-600)] bg-transparent border-none cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`btn btn-secondary relative ${filtersOpen ? 'bg-[var(--neutral-100)]' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--teal-500)] text-white text-xs flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
          <div className="flex rounded-lg border border-[var(--neutral-300)] overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium transition-colors border-none cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[var(--navy-800)] text-white'
                  : 'bg-white text-[var(--neutral-500)] hover:bg-[var(--neutral-100)]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-2 text-sm font-medium transition-colors border-none cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-[var(--navy-800)] text-white'
                  : 'bg-white text-[var(--neutral-500)] hover:bg-[var(--neutral-100)]'
              }`}
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters panel */}
      {filtersOpen && (
        <div className="card p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--neutral-500)] mb-1.5 uppercase tracking-wide">Status</label>
              <select
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value as ProjectStatus | 'all' }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-300)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal-500)]"
              >
                <option value="all">All Statuses</option>
                {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--neutral-500)] mb-1.5 uppercase tracking-wide">Department</label>
              <select
                value={filters.department}
                onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-300)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal-500)]"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.shortName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--neutral-500)] mb-1.5 uppercase tracking-wide">Category</label>
              <select
                value={filters.category}
                onChange={e => setFilters(f => ({ ...f, category: e.target.value as ProjectCategory | 'all' }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-300)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal-500)]"
              >
                <option value="all">All Categories</option>
                {Object.entries(PROJECT_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--neutral-500)] mb-1.5 uppercase tracking-wide">Ward</label>
              <select
                value={filters.ward}
                onChange={e => setFilters(f => ({ ...f, ward: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-300)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal-500)]"
              >
                <option value="all">All Wards</option>
                {ALL_WARDS.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex justify-end mt-3 pt-3 border-t border-[var(--neutral-100)]">
              <button onClick={clearFilters} className="btn btn-ghost btn-sm text-[var(--red-500)]">
                <X className="w-3.5 h-3.5" /> Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--neutral-500)]">
          Showing <span className="font-semibold text-[var(--navy-700)]">{filteredProjects.length}</span> projects
          {filters.search && (
            <> matching "<span className="font-medium">{filters.search}</span>"</>
          )}
        </p>
      </div>

      {/* Content */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="Try adjusting your search or filters to find projects."
          action={
            <button onClick={clearFilters} className="btn btn-primary btn-sm">
              Clear Filters
            </button>
          }
        />
      ) : viewMode === 'map' ? (
        <div className="card overflow-hidden" style={{ height: '600px' }}>
          <ProjectMap
            projects={filteredProjects}
            departments={departments}
            selectedProject={selectedProject}
            onSelectProject={setSelectedProject}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
  )
}
