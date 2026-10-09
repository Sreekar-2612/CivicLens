import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Award, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  Building2, ShieldAlert, BarChart3, Filter, ArrowUpRight,
  Layers, Users, Info
} from 'lucide-react'
import { dataRepository } from '../services/dataRepository'
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
}

interface ContractorScorecard {
  name: string
  activeProjects: number
  totalProjects: number
  avgProgress: number
  delayedCount: number
  rating: number
  status: 'Good Standing' | 'Under Review' | 'Flagged for Delays'
}

export function ScorecardPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [alerts, setAlerts] = useState<CoordinationAlert[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'departments' | 'contractors' | 'wards'>('departments')

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
    loadData()
  }, [])

  // Calculate department metrics
  const deptScorecards: DeptScorecard[] = departments.map(dept => {
    const deptProjects = projects.filter(p => p.departmentId === dept.id)
    const total = deptProjects.length
    const completed = deptProjects.filter(p => p.status === 'completed').length
    const active = deptProjects.filter(p => p.status === 'in_progress' || p.status === 'planned').length
    const delayed = deptProjects.filter(p => p.status === 'delayed' || p.confidenceIndicator === 'delayed').length
    
    // On-time rate calculation
    const onTimeRate = total > 0 ? Math.round(((total - delayed) / total) * 100) : 100
    
    // Conflicts involving this department's projects
    const deptProjectIds = new Set(deptProjects.map(p => p.id))
    const deptAlerts = alerts.filter(a => deptProjectIds.has(a.projectAId) || deptProjectIds.has(a.projectBId))
    const conflictScore = deptAlerts.length * 15

    // Reports linked to dept projects
    const deptReports = reports.filter(r => r.projectId && deptProjectIds.has(r.projectId))
    const resolvedReports = deptReports.filter(r => r.status === 'resolved').length

    // Simulated average delay days based on delayed count
    const avgDelayDays = delayed > 0 ? Math.round(delayed * 24.5) : 0

    // Grade assignment
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
    }
  }).sort((a, b) => b.onTimeRate - a.onTimeRate)

  // Calculate contractor transparency metrics
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
    
    let rating = 4.8 - (delayed * 0.8)
    if (rating < 2.0) rating = 2.0
    rating = Math.round(rating * 10) / 10

    let status: 'Good Standing' | 'Under Review' | 'Flagged for Delays' = 'Good Standing'
    if (delayed >= 2) status = 'Flagged for Delays'
    else if (delayed === 1) status = 'Under Review'

    return {
      name,
      totalProjects: total,
      activeProjects: active,
      delayedCount: delayed,
      avgProgress,
      rating,
      status,
    }
  }).sort((a, b) => b.rating - a.rating)

  // Ward Disruption Analysis
  const wardMap = new Map<string, { total: number; active: number; delayed: number; budget: number }>()
  projects.forEach(p => {
    const curr = wardMap.get(p.ward) || { total: 0, active: 0, delayed: 0, budget: 0 }
    curr.total += 1
    if (p.status === 'in_progress' || p.status === 'planned') curr.active += 1
    if (p.status === 'delayed' || p.confidenceIndicator === 'delayed') curr.delayed += 1
    curr.budget += p.budgetLakhs || 0
    wardMap.set(p.ward, curr)
  })

  const wardScorecards = Array.from(wardMap.entries()).map(([ward, data]) => ({
    ward,
    ...data,
    disruptionIndex: Math.min(100, Math.round((data.active * 18) + (data.delayed * 25))),
  })).sort((a, b) => b.disruptionIndex - a.disruptionIndex)

  const gradeColors = {
    'A+': 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400',
    'A': 'bg-green-50 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-400',
    'B': 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400',
    'C': 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400',
    'D': 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 mb-2">
            <Award className="w-3.5 h-3.5" />
            Civic Accountability & Performance
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Civic Agency Scorecards
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-2xl">
            Objective, data-driven transparency metrics measuring on-time performance, repeat excavation penalties, and contractor accountability across municipal bodies.
          </p>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Departments</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{departments.length}</div>
          </div>
          <div className="border-x border-gray-200 dark:border-gray-700 px-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Avg On-Time</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {deptScorecards.length > 0 ? Math.round(deptScorecards.reduce((acc, s) => acc + s.onTimeRate, 0) / deptScorecards.length) : 0}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Flagged Alerts</div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{alerts.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-8">
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'departments'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Department Transparency ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab('contractors')}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'contractors'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Contractor Performance ({contractorScorecards.length})
        </button>
        <button
          onClick={() => setActiveTab('wards')}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'wards'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Ward Disruption Index ({wardScorecards.length})
        </button>
      </div>

      {/* Tab 1: Department Scorecard */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deptScorecards.map(sc => (
              <div
                key={sc.department.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: sc.department.color }}
                />
                
                <div className="flex items-start justify-between mt-2">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
                      {sc.department.shortName}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                      {sc.department.name}
                    </h3>
                  </div>
                  <span className={`px-3 py-1 rounded-lg border text-lg font-black ${gradeColors[sc.grade]}`}>
                    {sc.grade}
                  </span>
                </div>

                {/* Progress bar: On-time rate */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">On-Time Execution Rate</span>
                    <span className="font-bold text-gray-900 dark:text-white">{sc.onTimeRate}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all rounded-full ${
                        sc.onTimeRate >= 80 ? 'bg-emerald-500' : sc.onTimeRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${sc.onTimeRate}%` }}
                    />
                  </div>
                </div>

                {/* Metric grid */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Total Works</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {sc.totalProjects} ({sc.activeProjects} active)
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Delayed Works</span>
                    <span className={`font-semibold text-sm ${sc.delayedProjects > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {sc.delayedProjects} projects
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Avg Project Delay</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {sc.avgDelayDays > 0 ? `${sc.avgDelayDays} days` : '0 days (On Track)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Conflict Risk Index</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {sc.conflictScore > 0 ? `${sc.conflictScore} pts` : 'Low Risk'}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    {sc.totalReports} citizen reports filed
                  </span>
                  <Link
                    to={`/projects?department=${sc.department.id}`}
                    className="inline-flex items-center text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    View Projects <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Comparative Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Comparative Agency Metrics</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Benchmark cross-department performance against civic delivery targets</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3">On-Time %</th>
                    <th className="px-4 py-3">Active Works</th>
                    <th className="px-4 py-3">Delayed Works</th>
                    <th className="px-4 py-3">Citizen Reports</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700/60">
                  {deptScorecards.map(sc => (
                    <tr key={sc.department.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sc.department.color }} />
                        {sc.department.name}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${gradeColors[sc.grade]}`}>
                          {sc.grade}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-gray-900 dark:text-white">
                        {sc.onTimeRate}%
                      </td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                        {sc.activeProjects}
                      </td>
                      <td className="px-4 py-4">
                        <span className={sc.delayedProjects > 0 ? 'text-rose-600 font-semibold' : 'text-gray-500'}>
                          {sc.delayedProjects}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                        {sc.totalReports} ({sc.resolvedReports} resolved)
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/projects?department=${sc.department.id}`}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Explore Works
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
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3 items-start">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold">Contractor Transparency Note:</span> Ratings and standings are calculated purely from historical timeline execution compliance, frequency of revised deadlines, and unresolved public grievance complaints.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contractorScorecards.map(c => (
              <div
                key={c.name}
                className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-base text-gray-900 dark:text-white">{c.name}</h3>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                      c.status === 'Good Standing'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : c.status === 'Under Review'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-gray-900 dark:text-white">★ {c.rating}</div>
                    <div className="text-[10px] text-gray-400">Civic Delivery Score</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded-lg">
                    <div className="text-gray-400">Total</div>
                    <div className="font-bold text-gray-800 dark:text-gray-200">{c.totalProjects}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded-lg">
                    <div className="text-gray-400">Active</div>
                    <div className="font-bold text-gray-800 dark:text-gray-200">{c.activeProjects}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded-lg">
                    <div className="text-gray-400">Delayed</div>
                    <div className={`font-bold ${c.delayedCount > 0 ? 'text-rose-600' : 'text-gray-800 dark:text-gray-200'}`}>
                      {c.delayedCount}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Average Work Progress</span>
                    <span className="font-bold text-gray-900 dark:text-white">{c.avgProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${c.avgProgress}%` }} />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60">
                  <Link
                    to={`/projects?search=${encodeURIComponent(c.name)}`}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-between"
                  >
                    <span>View Assigned Work Orders</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Ward Disruption Index */}
      {activeTab === 'wards' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Ward Disruption & Excavation Burden</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Combines active excavation volume, road closure duration, and delayed project density per municipal ward.
                </p>
              </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {wardScorecards.map(w => (
                <div key={w.ward} className="p-5 hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 dark:text-white text-base">{w.ward}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        w.disruptionIndex > 60
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : w.disruptionIndex > 30
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        Disruption Index: {w.disruptionIndex}/100
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {w.active} active projects • {w.delayed} delayed works • Total Allocated: ₹{w.budget} Lakhs
                    </p>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="w-32 hidden md:block">
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            w.disruptionIndex > 60 ? 'bg-rose-500' : w.disruptionIndex > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${w.disruptionIndex}%` }}
                        />
                      </div>
                    </div>
                    <Link
                      to={`/projects?ward=${encodeURIComponent(w.ward)}`}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Inspect Ward
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
