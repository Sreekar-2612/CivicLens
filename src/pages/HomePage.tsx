import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, MapPin, AlertTriangle, CheckCircle2, Clock,
  ArrowRight, BarChart3, FileText, Layers, TrendingUp,
  Building2, ChevronRight, Shield
} from 'lucide-react'
import { dataRepository } from '../services/dataRepository'
import type { Project, SummaryStats, Department } from '../types'
import { StatusBadge, ConfidenceBadge } from '../components/ui/StatusBadge'
import { StatCard } from '../components/ui/SharedStates'
import { format } from 'date-fns'

export function HomePage() {
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [searchQuery, setSearchQuery] = useState('')
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/projects?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[var(--navy-900)] via-[var(--navy-800)] to-[#0f2744] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <div className="demo-badge mb-4">
              Hackathon Prototype — Demonstration Data
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4 text-white">
              See What's Being Built.
              <br />
              <span className="text-[var(--teal-500)]">Hold It Accountable.</span>
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed mb-8 max-w-2xl">
              CivicLens is a shared public works registry that helps residents understand infrastructure
              projects, prevents wasteful repeat excavation, and keeps departments accountable for
              timelines and service delivery.
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by road, locality, or project name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal-500)] focus:bg-white/15 transition-all"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg rounded-xl px-6">
                Search
              </button>
            </form>

            {/* Quick links */}
            <div className="flex flex-wrap gap-3 mt-6">
              <Link to="/projects" className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors no-underline">
                <MapPin className="w-4 h-4" /> Explore Map
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link to="/report" className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors no-underline">
                <FileText className="w-4 h-4" /> Report Issue
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link to="/scorecard" className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors no-underline">
                <BarChart3 className="w-4 h-4" /> Scorecard
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats section */}
      {stats && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Active Projects"
              value={stats.activeProjects}
              icon={TrendingUp}
              color="teal"
              subtitle="In progress or planned"
            />
            <StatCard
              label="Delayed"
              value={stats.delayedProjects}
              icon={AlertTriangle}
              color="red"
              subtitle="Past original deadline"
            />
            <StatCard
              label="Coordination Alerts"
              value={stats.potentialConflicts}
              icon={Layers}
              color="amber"
              subtitle="Pending review"
            />
            <StatCard
              label="Completed"
              value={stats.completedProjects}
              icon={CheckCircle2}
              color="indigo"
              subtitle="Successfully delivered"
            />
          </div>
        </section>
      )}

      {/* Problem Statement */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--navy-900)] mb-3">
            Why CivicLens?
          </h2>
          <p className="text-[var(--neutral-500)] max-w-2xl mx-auto">
            Roads are dug up, repaved, and dug up again — sometimes within months.
            Residents are left in the dark. CivicLens changes that.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: MapPin,
              title: 'Unified Project Registry',
              description: 'Every public works project — roads, water, drainage, electricity, telecom — visible on one interactive map with real status updates.',
              color: 'bg-teal-50 text-teal-600',
            },
            {
              icon: Layers,
              title: 'Proactive Clash Detection',
              description: 'Automatically flags when departments plan overlapping or repeat excavation on the same road. Coordinate before digging, not after.',
              color: 'bg-amber-50 text-amber-600',
            },
            {
              icon: BarChart3,
              title: 'Public Accountability',
              description: 'Track deadlines, delay reasons, and department performance. Every revision is recorded. Every citizen report gets a response.',
              color: 'bg-indigo-50 text-indigo-600',
            },
          ].map(feature => (
            <div key={feature.title} className="card p-6">
              <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--navy-900)] mb-2">{feature.title}</h3>
              <p className="text-sm text-[var(--neutral-500)] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Projects */}
      <section className="bg-white border-y border-[var(--neutral-200)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--navy-900)]">Recent Projects</h2>
              <p className="text-sm text-[var(--neutral-500)] mt-1">Latest public works in the registry</p>
            </div>
            <Link to="/projects" className="btn btn-secondary btn-sm no-underline">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProjects.map(project => {
              const dept = departments.find(d => d.id === project.departmentId)
              const endDate = project.revisedEndDate || project.originalEndDate
              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="card card-interactive p-4 no-underline text-inherit"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-[var(--navy-900)] leading-tight line-clamp-2 flex-1">
                      {project.title}
                    </h3>
                    <StatusBadge status={project.status} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--neutral-500)] mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {project.road}, {project.locality}
                  </div>
                  {dept && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--neutral-500)]">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }} />
                      {dept.shortName} — {format(new Date(endDate), 'MMM yyyy')}
                      {project.revisedEndDate && (
                        <span className="text-amber-600 font-medium">(revised)</span>
                      )}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-[var(--navy-900)] to-[var(--navy-800)] rounded-2xl p-8 sm:p-12 text-white text-center">
          <Shield className="w-10 h-10 mx-auto mb-4 text-[var(--teal-500)]" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-white">Your City. Your Infrastructure. Your Right to Know.</h2>
          <p className="text-slate-300 max-w-xl mx-auto mb-6">
            Explore projects near you, report issues that matter, and hold public works departments
            accountable for the infrastructure you fund.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/projects" className="btn btn-primary btn-lg rounded-xl no-underline">
              <MapPin className="w-5 h-5" /> Explore Projects
            </Link>
            <Link to="/report" className="btn btn-lg rounded-xl bg-white/10 text-white border-white/20 hover:bg-white/20 no-underline">
              <FileText className="w-5 h-5" /> Report an Issue
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
