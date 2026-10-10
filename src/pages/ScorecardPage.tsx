import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Award, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  Building2, ShieldAlert, BarChart3, Filter, ArrowUpRight,
  Layers, Users, Info, MapPin, ShieldCheck, FileText, ChevronRight
} from 'lucide-react'
import { dataRepository } from '../services/dataRepository'
import { ErrorState, LoadingState, EmptyState } from '../components/ui/SharedStates'
import type { Department, Project, Report, CoordinationAlert } from '../types'

interface DeptScorecard {
  department: Department
  totalProjects: number
  activeProjects: number
  completedProjects: number
  delayedProjects: number
  onTimeRate: number
  avgDelayDays: number
  conflictScore: number
  totalReports: number
  resolvedReports: number
  grade: 'A+' | 'A' | 'B' | 'C' | 'D'
  projects: Project[]
  reports: Report[]
  alerts: CoordinationAlert[]
}

interface ContractorScorecard {
  name: string
  activeProjects: number
  totalProjects: number
  avgProgress: number
  delayedCount: number
  completionRate: number
  status: 'Good Standing' | 'Under Review' | 'Flagged for Delays'
  projects: Project[]
}

interface WardScorecard {
  ward: string
  total: number
  active: number
  delayed: number
  budget: number
  disruptionIndex: number
  projects: Project[]
}

export function ScorecardPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [alerts, setAlerts] = useState<CoordinationAlert[]>([])
  const [activeTab, setActiveTab] = useState<'departments' | 'contractors' | 'wards'>('departments')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      const [d, p, r, a] = await Promise.all([
        dataRepository.getDepartments(),
        dataRepository.getProjects(),
        dataRepository.getReports(),
        dataRepository.getAlerts(),
      ])
      setDepartments(d)
      setProjects(p)
      setReports(r)
      setAlerts(a)
    }
    loadData().catch(err => setError(err instanceof Error ? err.message : 'Database records could not be loaded.')).finally(() => setLoading(false))
  }, [])

  // Calculate department metrics directly from live Supabase data
  const deptScorecards: DeptScorecard[] = departments.map(dept => {
    const deptProjects = projects.filter(p => p.departmentId === dept.id)
    const total = deptProjects.length
    const completed = deptProjects.filter(p => p.status === 'completed').length
    const active = deptProjects.filter(p => p.status === 'in_progress' || p.status === 'planned').length
    const delayed = deptProjects.filter(p => p.status === 'delayed' || p.confidenceIndicator === 'delayed').length

    const onTimeRate = total > 0 ? Math.round(((total - delayed) / total) * 100) : 0

    const deptProjectIds = new Set(deptProjects.map(p => p.id))
    const deptAlerts = alerts.filter(a => deptProjectIds.has(a.projectAId) || deptProjectIds.has(a.projectBId))
    const conflictScore = deptAlerts.reduce((sum, alert) => sum + alert.score, 0)

    const deptReports = reports.filter(r => r.projectId && deptProjectIds.has(r.projectId))
    const resolvedReports = deptReports.filter(r => r.status === 'resolved').length
    const delays = deptProjects.filter(project => project.status === 'delayed' || project.confidenceIndicator === 'delayed')
      .map(project => Math.max(0, (Date.parse(project.actualEndDate || new Date().toISOString().slice(0, 10)) - Date.parse(project.originalEndDate)) / 86400000))
      .filter(Number.isFinite)
    const avgDelayDays = delays.length ? Math.round(delays.reduce((sum, days) => sum + days, 0) / delays.length) : 0

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'B'
    if (onTimeRate >= 90 && deptAlerts.length <= 1) grade = 'A+'
    else if (onTimeRate >= 75) grade = 'A'
    else if (onTimeRate >= 60) grade = 'B'
    else if (onTimeRate >= 45) grade = 'C'
    else grade = 'D'

    return {
      department: dept,
      totalProjects: total,
      activeProjects: active,
      completedProjects: completed,
      delayedProjects: delayed,
      onTimeRate,
      avgDelayDays,
      conflictScore,
      totalReports: deptReports.length,
      resolvedReports,
      grade,
      projects: deptProjects,
      reports: deptReports,
      alerts: deptAlerts,
    }
  }).filter(card => card.totalProjects > 0).sort((a, b) => b.onTimeRate - a.onTimeRate)

  // Calculate contractor transparency metrics from live projects
  const contractorMap = new Map<string, Project[]>()
  projects.forEach(p => {
    if (!contractorMap.has(p.contractor)) {
      contractorMap.set(p.contractor, [])
    }
    contractorMap.get(p.contractor)!.push(p)
  })

  const contractorScorecards: ContractorScorecard[] = Array.from(contractorMap.entries()).map(([name, pList]) => {
    const total = pList.length
    const delayed = pList.filter(p => p.status === 'delayed' || p.confidenceIndicator === 'delayed').length
    const active = pList.filter(p => p.status === 'in_progress').length
    const avgProgress = Math.round(pList.reduce((acc, p) => acc + p.progressPercent, 0) / (total || 1))

    const completionRate = Math.round(pList.filter(project => project.status === 'completed').length / total * 100)

    let status: 'Good Standing' | 'Under Review' | 'Flagged for Delays' = 'Good Standing'
    if (delayed >= 2) status = 'Flagged for Delays'
    else if (delayed === 1) status = 'Under Review'

    return {
      name,
      totalProjects: total,
      activeProjects: active,
      delayedCount: delayed,
      avgProgress,
      completionRate,
      status,
      projects: pList,
    }
  }).sort((a, b) => b.completionRate - a.completionRate)

  // Ward Disruption Analysis from live project data
  const wardMap = new Map<string, { total: number; active: number; delayed: number; budget: number; projects: Project[] }>()
  projects.forEach(p => {
    const curr = wardMap.get(p.ward) || { total: 0, active: 0, delayed: 0, budget: 0, projects: [] }
    curr.total += 1
    if (p.status === 'in_progress' || p.status === 'planned') curr.active += 1
    if (p.status === 'delayed' || p.confidenceIndicator === 'delayed') curr.delayed += 1
    curr.budget += p.budgetLakhs || 0
    curr.projects.push(p)
    wardMap.set(p.ward, curr)
  })

  const wardScorecards: WardScorecard[] = Array.from(wardMap.entries()).map(([ward, data]) => ({
    ward,
    ...data,
    disruptionIndex: Math.round(data.active / data.total * 100),
  })).sort((a, b) => b.disruptionIndex - a.disruptionIndex)

  // Fresh Civic Grade Pill Styling
  const gradeStyles = {
    'A+': 'bg-[#E3F7F5] text-[#12B5A6] border-[#12B5A6]/30',
    'A': 'bg-[#E1F8EF] text-[#0E7A55] border-[#22C58B]/30',
    'B': 'bg-[#e2c09c]/30 text-[#021217] border-[#e2c09c]/50',
    'C': 'bg-[#FFF4DB] text-[#9A6200] border-[#FFB020]/30',
    'D': 'bg-[#FFE9EA] text-[#D13B41] border-[#FF5A5F]/30',
  }

  if (loading) return <LoadingState message="Loading live database metrics from Supabase…" />
  if (error) return <ErrorState title="Scorecard unavailable" description={error} />
  if (!projects.length) return <EmptyState title="No recorded projects" description="Scorecards will appear when projects are available in Supabase." />

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E3EAF2] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#f1f3d8] text-[#021217] border border-[#e2c09c] mb-2 shadow-2xs">
            <Award className="w-3.5 h-3.5 text-[#088c2e]" />
            <span>Civic Performance &amp; Accountability · Live Database Engine</span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#021217]">
            Municipal Agency Scorecards
          </h1>
          <p className="text-[#536267] text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Data-driven delivery grades measuring on-time completion rates, repeat digging penalties, and contractor accountability calculated directly from active database records.
          </p>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-3 gap-3 bg-white/95 p-3.5 rounded-2xl border border-[#e2c09c] text-center shadow-xs">
          <div>
            <div className="text-[10px] text-[#536267] font-bold uppercase tracking-wider">Agencies</div>
            <div className="font-['Plus_Jakarta_Sans'] text-xl sm:text-2xl font-extrabold text-[#021217]">{departments.length}</div>
          </div>
          <div className="border-x border-[#E3EAF2] px-3">
            <div className="text-[10px] text-[#536267] font-bold uppercase tracking-wider">Avg On-Time</div>
            <div className="font-['Plus_Jakarta_Sans'] text-xl sm:text-2xl font-extrabold text-[#088c2e]">
              {deptScorecards.length > 0 ? Math.round(deptScorecards.reduce((acc, s) => acc + s.onTimeRate, 0) / deptScorecards.length) : 0}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#536267] font-bold uppercase tracking-wider">Clash Alerts</div>
            <div className="font-['Plus_Jakarta_Sans'] text-xl sm:text-2xl font-extrabold text-[#c40000]">{alerts.length}</div>
          </div>
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="flex border-b border-[#E3EAF2] gap-2">
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'departments'
              ? 'border-[#021217] text-[#021217]'
              : 'border-transparent text-[#536267] hover:text-[#021217]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Department Grades ({departments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('contractors')}
          className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'contractors'
              ? 'border-[#021217] text-[#021217]'
              : 'border-transparent text-[#536267] hover:text-[#021217]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Contractor Standings ({contractorScorecards.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('wards')}
          className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'wards'
              ? 'border-[#021217] text-[#021217]'
              : 'border-transparent text-[#536267] hover:text-[#021217]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Ward Disruption Index ({wardScorecards.length})</span>
        </button>
      </div>

      {/* Tab 1: Department Scorecard */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deptScorecards.map(sc => (
              <div
                key={sc.department.id}
                className="group relative bg-white/95 rounded-2xl p-5 border border-[#e2c09c]/60 hover:border-[#11e852] shadow-xs hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.01] transition-all duration-300 overflow-hidden cursor-default flex flex-col justify-between"
              >
                {/* Top department accent bar with hover glow */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 group-hover:h-2"
                  style={{ backgroundColor: sc.department.color }}
                />

                <div>
                  <div className="flex items-start justify-between mt-1">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#64748B]">
                        {sc.department.shortName}
                      </span>
                      <h3 className="font-['Plus_Jakarta_Sans'] text-base font-extrabold text-[#021217] leading-tight group-hover:text-[#088c2e] transition-colors">
                        {sc.department.name}
                      </h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-lg border text-base font-black shadow-2xs ${gradeStyles[sc.grade]}`}>
                      {sc.grade}
                    </span>
                  </div>

                  {/* Progress bar: On-time rate */}
                  <div className="mt-3.5">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#64748B] font-medium text-[11px]">On-Time Execution Rate</span>
                      <span className="font-extrabold text-[#021217] text-[11px]">{sc.onTimeRate}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all rounded-full ${
                          sc.onTimeRate >= 80 ? 'bg-[#12B5A6]' : sc.onTimeRate >= 60 ? 'bg-[#FFB020]' : 'bg-[#FF5A5F]'
                        }`}
                        style={{ width: `${sc.onTimeRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Metric grid */}
                  <div className="grid grid-cols-2 gap-3 mt-3.5 pt-3.5 border-t border-[#F1F5F9] text-xs">
                    <div>
                      <span className="text-[#64748B] text-[10px] block font-medium">Total Works</span>
                      <span className="font-bold text-[#021217] text-xs">
                        {sc.totalProjects} ({sc.activeProjects} active)
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748B] text-[10px] block font-medium">Delayed Works</span>
                      <span className={`font-bold text-xs ${sc.delayedProjects > 0 ? 'text-[#D13B41]' : 'text-[#021217]'}`}>
                        {sc.delayedProjects} projects
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748B] text-[10px] block font-medium">Avg Project Delay</span>
                      <span className="font-bold text-[#021217] text-xs">
                        {sc.avgDelayDays > 0 ? `+${sc.avgDelayDays} days` : '0 days (On Track)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748B] text-[10px] block font-medium">Conflict Risk Index</span>
                      <span className={`font-bold text-xs ${sc.conflictScore > 0 ? 'text-[#C41F4F]' : 'text-[#12B5A6]'}`}>
                        {sc.conflictScore > 0 ? `${sc.conflictScore} pts` : 'Clean'}
                      </span>
                    </div>
                  </div>

                  {/* Hover-reveal Panel: Real Database Work Orders & Grievances */}
                  <div className="max-h-0 opacity-0 group-hover:max-h-96 group-hover:opacity-100 transition-all duration-400 ease-out overflow-hidden mt-0 group-hover:mt-3.5 group-hover:pt-3.5 group-hover:border-t group-hover:border-[#e2c09c]/40">
                    <div className="bg-[#FAF7F0] border border-[#e2c09c]/50 rounded-xl p-3 space-y-2.5 shadow-2xs">

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#021217] uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#11e852] animate-pulse" />
                          Live Corridors from Database ({sc.projects.length})
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#021217] text-[#f1f3d8] font-mono">
                          Live DB
                        </span>
                      </div>

                      {/* Real Database Projects List */}
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {sc.projects.map(p => (
                          <Link
                            key={p.id}
                            to={`/projects/${p.id}`}
                            className="block p-2 rounded-lg bg-white border border-[#e2c09c]/40 hover:border-[#11e852] hover:bg-white shadow-2xs transition-all no-underline text-inherit group/item"
                          >
                            <div className="flex items-center justify-between text-xs font-bold text-[#021217]">
                              <span className="truncate group-hover/item:text-[#088c2e] mr-2">{p.title}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                                p.status === 'delayed'
                                  ? 'text-[#ff0000] bg-[#ff0000]/10'
                                  : p.status === 'completed'
                                  ? 'text-[#088c2e] bg-[#11e852]/15'
                                  : 'text-[#021217] bg-[#e2c09c]/30'
                              }`}>
                                {p.progressPercent}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[#536267] mt-1">
                              <span className="truncate pr-1">📍 {p.road} · {p.contractor}</span>
                              {p.budgetLakhs != null && p.budgetLakhs > 0 && (
                                <span className="font-semibold text-[#021217] shrink-0">₹{p.budgetLakhs}L</span>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>

                      {/* Real Citizen Grievances for this department */}
                      {sc.reports.length > 0 && (
                        <div className="pt-2 border-t border-[#e2c09c]/40">
                          <span className="text-[10px] font-bold text-[#c40000] uppercase tracking-wider block mb-1">
                            Citizen Reports from DB ({sc.reports.length})
                          </span>
                          <div className="space-y-1">
                            {sc.reports.slice(0, 2).map(r => (
                              <div key={r.id} className="text-[11px] flex items-center justify-between bg-white/90 p-1.5 rounded border border-[#e2c09c]/30">
                                <span className="truncate text-[#021217] max-w-[200px]">"{r.title}"</span>
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 shrink-0">
                                  {r.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Real Clash Alerts for this department */}
                      {sc.alerts.length > 0 && (
                        <div className="pt-2 border-t border-[#e2c09c]/40">
                          <span className="text-[10px] font-bold text-[#c40000] uppercase tracking-wider block mb-1">
                            Active Conflict Alerts ({sc.alerts.length})
                          </span>
                          <div className="space-y-1">
                            {sc.alerts.slice(0, 2).map(a => (
                              <div key={a.id} className="text-[11px] text-[#536267] bg-red-50/90 p-1.5 rounded border border-red-200/60 flex items-center justify-between">
                                <span className="truncate">Severity: {a.severity} (Score: {a.score} pts)</span>
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                                  {a.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                  <span className="text-[#64748B] text-[11px] font-medium">
                    {sc.totalReports} citizen {sc.totalReports === 1 ? 'report' : 'reports'} filed
                  </span>
                  <Link
                    to={`/projects?department=${sc.department.id}`}
                    className="inline-flex items-center text-[#021217] hover:text-[#088c2e] font-bold text-xs hover:underline gap-0.5 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>View Works</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#088c2e]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Comparative Table with Rich Row Hover Effects */}
          <div className="bg-white/95 rounded-2xl border border-[#e2c09c]/60 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-[#E3EAF2] flex justify-between items-center bg-[#FAF7F0]">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] font-extrabold text-sm sm:text-base text-[#021217]">
                  Comparative Agency Delivery Benchmarks
                </h3>
                <p className="text-[11px] text-[#536267] mt-0.5">
                  Inter-departmental performance index against municipal completion targets (Live Supabase Registry)
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F6F9FC] text-[11px] font-bold text-[#536267] border-b border-[#E3EAF2] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-3 py-3">Grade</th>
                    <th className="px-3 py-3">On-Time %</th>
                    <th className="px-3 py-3">Active Works</th>
                    <th className="px-3 py-3">Delayed</th>
                    <th className="px-3 py-3">Citizen Reports</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EAF2]">
                  {deptScorecards.map(sc => (
                    <tr
                      key={sc.department.id}
                      className="hover:bg-[#f1f3d8]/60 transition-colors group cursor-pointer"
                    >
                      <td className="px-5 py-3.5 font-bold text-[#021217] flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition-transform" style={{ backgroundColor: sc.department.color }} />
                        <span className="group-hover:text-[#088c2e] transition-colors">{sc.department.name}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold border ${gradeStyles[sc.grade]}`}>
                          {sc.grade}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-extrabold text-[#021217]">
                        {sc.onTimeRate}%
                      </td>
                      <td className="px-3 py-3.5 text-[#536267] font-semibold">
                        {sc.activeProjects}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={sc.delayedProjects > 0 ? 'text-[#c40000] font-extrabold' : 'text-[#536267]'}>
                          {sc.delayedProjects}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-[#536267]">
                        {sc.totalReports} ({sc.resolvedReports} resolved)
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/projects?department=${sc.department.id}`}
                          className="text-xs font-bold text-[#021217] hover:text-[#088c2e] hover:underline inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                        >
                          <span>Explore</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#088c2e]" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Contractor Scorecard */}
      {activeTab === 'contractors' && (
        <div className="space-y-6">
          <div className="bg-[#FFF4DB] border border-[#FFB020]/30 rounded-xl p-3.5 flex gap-2.5 items-start">
            <Info className="w-4 h-4 text-[#9A6200] shrink-0 mt-0.5" />
            <div className="text-xs text-[#9A6200]">
              <span className="font-bold">Database source:</span> Contractor accountability scores are aggregated from live project milestones, on-site progress, and completion audits in the public registry.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contractorScorecards.map(c => (
              <div
                key={c.name}
                className="group relative bg-white/95 rounded-2xl p-5 border border-[#e2c09c]/60 hover:border-[#11e852] shadow-xs hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.01] transition-all duration-300 overflow-hidden cursor-default flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-['Plus_Jakarta_Sans'] font-extrabold text-base text-[#021217] group-hover:text-[#088c2e] transition-colors">
                        {c.name}
                      </h3>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1.5 shadow-2xs ${
                        c.status === 'Good Standing'
                          ? 'bg-[#E3F7F5] text-[#0E7A55] border border-[#12B5A6]/30'
                          : c.status === 'Under Review'
                          ? 'bg-[#FFF4DB] text-[#9A6200] border border-[#FFB020]/30'
                          : 'bg-[#FFE9EA] text-[#D13B41] border border-[#FF5A5F]/30'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#021217] flex items-center justify-end gap-1">
                        <span>{c.completionRate}%</span>
                      </div>
                      <div className="text-[10px] text-[#536267] font-semibold">Delivery Score</div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-[#F1F5F9] grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-[#F6F9FC] p-2 rounded-xl border border-[#E3EAF2]">
                      <div className="text-[10px] text-[#536267] font-medium">Total</div>
                      <div className="font-bold text-[#021217]">{c.totalProjects}</div>
                    </div>
                    <div className="bg-[#F6F9FC] p-2 rounded-xl border border-[#E3EAF2]">
                      <div className="text-[10px] text-[#536267] font-medium">Active</div>
                      <div className="font-bold text-[#021217]">{c.activeProjects}</div>
                    </div>
                    <div className="bg-[#F6F9FC] p-2 rounded-xl border border-[#E3EAF2]">
                      <div className="text-[10px] text-[#536267] font-medium">Delayed</div>
                      <div className={`font-bold ${c.delayedCount > 0 ? 'text-[#c40000]' : 'text-[#021217]'}`}>
                        {c.delayedCount}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#536267] text-[11px] font-medium">Average Work Progress</span>
                      <span className="font-bold text-[#021217] text-[11px]">{c.avgProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#11e852] rounded-full" style={{ width: `${c.avgProgress}%` }} />
                    </div>
                  </div>

                  {/* Hover-reveal Panel: Real Database Awarded Work Orders */}
                  <div className="max-h-0 opacity-0 group-hover:max-h-96 group-hover:opacity-100 transition-all duration-400 ease-out overflow-hidden mt-0 group-hover:mt-3.5 group-hover:pt-3.5 group-hover:border-t group-hover:border-[#e2c09c]/40">
                    <div className="bg-[#FAF7F0] border border-[#e2c09c]/50 rounded-xl p-3 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#021217] uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#11e852] animate-pulse" />
                          Awarded Corridors from Database ({c.projects.length})
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#021217] text-[#f1f3d8] font-mono">
                          Live DB
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {c.projects.map(p => (
                          <Link
                            key={p.id}
                            to={`/projects/${p.id}`}
                            className="block p-2 rounded-lg bg-white border border-[#e2c09c]/40 hover:border-[#11e852] hover:bg-white shadow-2xs transition-all no-underline text-inherit group/item"
                          >
                            <div className="flex items-center justify-between text-xs font-bold text-[#021217]">
                              <span className="truncate group-hover/item:text-[#088c2e] mr-2">{p.title}</span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#e2c09c]/30 text-[#021217] shrink-0">
                                {p.progressPercent}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[#536267] mt-1">
                              <span className="truncate pr-1">📍 {p.road} · {p.locality}</span>
                              {p.budgetLakhs != null && p.budgetLakhs > 0 && (
                                <span className="font-semibold text-[#021217] shrink-0">₹{p.budgetLakhs}L</span>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-[#F1F5F9]">
                  <Link
                    to={`/projects?search=${encodeURIComponent(c.name)}`}
                    className="text-xs font-bold text-[#021217] hover:text-[#088c2e] hover:underline flex items-center justify-between no-underline group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>Inspect Awarded Contracts</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#088c2e]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Ward Disruption */}
      {activeTab === 'wards' && (
        <div className="space-y-6">
          <div className="bg-white/95 rounded-2xl border border-[#e2c09c]/60 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-[#E3EAF2] bg-[#FAF7F0]">
              <h3 className="font-['Plus_Jakarta_Sans'] font-extrabold text-sm sm:text-base text-[#021217]">
                Ward Disruption Index
              </h3>
              <p className="text-[11px] text-[#536267] mt-0.5">
                Active municipal work orders as a percentage of each ward’s recorded infrastructure projects
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F6F9FC] text-[11px] font-bold text-[#536267] border-b border-[#E3EAF2] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Municipal Ward</th>
                    <th className="px-3 py-3">Disruption Share</th>
                    <th className="px-3 py-3">Active Works</th>
                    <th className="px-3 py-3">Delayed Corridors</th>
                    <th className="px-3 py-3">Active Corridors (Live DB)</th>
                    <th className="px-3 py-3">CAPEX Outlay</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EAF2]">
                  {wardScorecards.map(w => (
                    <tr
                      key={w.ward}
                      className="hover:bg-[#f1f3d8]/60 transition-colors group cursor-pointer"
                    >
                      <td className="px-5 py-3.5 font-bold text-[#021217] group-hover:text-[#088c2e] transition-colors">
                        {w.ward}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                          w.disruptionIndex >= 60 ? 'bg-[#FFE9EA] text-[#D13B41]' : w.disruptionIndex >= 30 ? 'bg-[#FFF4DB] text-[#9A6200]' : 'bg-[#E3F7F5] text-[#0E7A55]'
                        }`}>
                          {w.disruptionIndex}%
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-semibold text-[#021217]">
                        {w.active} active
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={w.delayed > 0 ? 'text-[#c40000] font-extrabold' : 'text-[#536267]'}>
                          {w.delayed} delayed
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-[#536267]">
                        <span className="font-medium text-[#021217]">
                          {w.projects.map(p => p.road).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-bold text-[#021217]">
                        ₹{w.budget} Lakhs
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/projects?ward=${encodeURIComponent(w.ward)}`}
                          className="text-xs font-bold text-[#021217] hover:text-[#088c2e] hover:underline inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                        >
                          <span>View Map</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#088c2e]" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
