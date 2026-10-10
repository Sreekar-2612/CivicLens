import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Award, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  Building2, ShieldAlert, BarChart3, Filter, ArrowUpRight,
  Layers, Users, Info, Star
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
    
    const onTimeRate = total > 0 ? Math.round(((total - delayed) / total) * 100) : 100
    
    const deptProjectIds = new Set(deptProjects.map(p => p.id))
    const deptAlerts = alerts.filter(a => deptProjectIds.has(a.projectAId) || deptProjectIds.has(a.projectBId))
    const conflictScore = deptAlerts.length * 15

    const deptReports = reports.filter(r => r.projectId && deptProjectIds.has(r.projectId))
    const resolvedReports = deptReports.filter(r => r.status === 'resolved').length
    const avgDelayDays = delayed > 0 ? Math.round(delayed * 24.5) : 0

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

  // Fresh Civic Grade Pill Styling
  const gradeStyles = {
    'A+': 'bg-[#E3F7F5] text-[#12B5A6] border-[#12B5A6]/30',
    'A': 'bg-[#E1F8EF] text-[#0E7A55] border-[#22C58B]/30',
    'B': 'bg-[#EAF1FF] text-[#2F6BFF] border-[#2F6BFF]/30',
    'C': 'bg-[#FFF4DB] text-[#9A6200] border-[#FFB020]/30',
    'D': 'bg-[#FFE9EA] text-[#D13B41] border-[#FF5A5F]/30',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E3EAF2] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAF1FF] text-[#2F6BFF] border border-[#2F6BFF]/20 mb-2">
            <Award className="w-3.5 h-3.5" />
            <span>Civic Performance &amp; Accountability</span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E293B]">
            Municipal Agency Scorecards
          </h1>
          <p className="text-[#64748B] text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Data-driven delivery grades measuring on-time completion rates, repeat digging penalties, and contractor accountability across municipal departments.
          </p>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-[#E3EAF2] text-center shadow-2xs">
          <div>
            <div className="text-[10px] text-[#64748B] font-bold uppercase">Agencies</div>
            <div className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#1E293B]">{departments.length}</div>
          </div>
          <div className="border-x border-[#E3EAF2] px-3">
            <div className="text-[10px] text-[#64748B] font-bold uppercase">Avg On-Time</div>
            <div className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#12B5A6]">
              {deptScorecards.length > 0 ? Math.round(deptScorecards.reduce((acc, s) => acc + s.onTimeRate, 0) / deptScorecards.length) : 0}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#64748B] font-bold uppercase">Clash Alerts</div>
            <div className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#C41F4F]">{alerts.length}</div>
          </div>
        </div>
      </div>

      {/* Fresh Civic Filter Tabs */}
      <div className="flex border-b border-[#E3EAF2] gap-2">
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'departments'
              ? 'border-[#2F6BFF] text-[#2F6BFF]'
              : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Department Grades ({departments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('contractors')}
          className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'contractors'
              ? 'border-[#2F6BFF] text-[#2F6BFF]'
              : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Contractor Standings ({contractorScorecards.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('wards')}
          className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'wards'
              ? 'border-[#2F6BFF] text-[#2F6BFF]'
              : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Ward Disruption Index ({wardScorecards.length})</span>
        </button>
      </div>

      {/* Tab 1: Department Scorecard */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deptScorecards.map(sc => (
              <div
                key={sc.department.id}
                className="bg-white rounded-xl p-4 border border-[#E3EAF2] shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: sc.department.color }}
                />
                
                <div className="flex items-start justify-between mt-1">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#64748B]">
                      {sc.department.shortName}
                    </span>
                    <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#1E293B] leading-tight">
                      {sc.department.name}
                    </h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-lg border text-base font-black ${gradeStyles[sc.grade]}`}>
                    {sc.grade}
                  </span>
                </div>

                {/* Progress bar: On-time rate in Mint Teal */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#64748B] font-medium text-[11px]">On-Time Execution Rate</span>
                    <span className="font-bold text-[#1E293B] text-[11px]">{sc.onTimeRate}%</span>
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
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#F1F5F9] text-xs">
                  <div>
                    <span className="text-[#64748B] text-[10px] block">Total Works</span>
                    <span className="font-bold text-[#1E293B] text-xs">
                      {sc.totalProjects} ({sc.activeProjects} active)
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] text-[10px] block">Delayed Works</span>
                    <span className={`font-bold text-xs ${sc.delayedProjects > 0 ? 'text-[#D13B41]' : 'text-[#1E293B]'}`}>
                      {sc.delayedProjects} projects
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] text-[10px] block">Avg Project Delay</span>
                    <span className="font-bold text-[#1E293B] text-xs">
                      {sc.avgDelayDays > 0 ? `+${sc.avgDelayDays} days` : '0 days (On Track)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] text-[10px] block">Conflict Risk Index</span>
                    <span className={`font-bold text-xs ${sc.conflictScore > 0 ? 'text-[#C41F4F]' : 'text-[#12B5A6]'}`}>
                      {sc.conflictScore > 0 ? `${sc.conflictScore} pts` : 'Clean'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                  <span className="text-[#64748B] text-[11px]">
                    {sc.totalReports} citizen reports filed
                  </span>
                  <Link
                    to={`/projects?department=${sc.department.id}`}
                    className="inline-flex items-center text-[#2F6BFF] font-bold text-xs hover:underline"
                  >
                    View Works <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Comparative Table */}
          <div className="bg-white rounded-xl border border-[#E3EAF2] overflow-hidden shadow-2xs">
            <div className="px-5 py-3 border-b border-[#E3EAF2] flex justify-between items-center">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#1E293B]">
                  Comparative Agency Delivery Benchmarks
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Inter-departmental performance index against municipal completion targets
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F6F9FC] text-[11px] font-bold text-[#64748B] border-b border-[#E3EAF2] uppercase">
                  <tr>
                    <th className="px-5 py-2.5">Department</th>
                    <th className="px-3 py-2.5">Grade</th>
                    <th className="px-3 py-2.5">On-Time %</th>
                    <th className="px-3 py-2.5">Active</th>
                    <th className="px-3 py-2.5">Delayed</th>
                    <th className="px-3 py-2.5">Citizen Reports</th>
                    <th className="px-5 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EAF2]">
                  {deptScorecards.map(sc => (
                    <tr key={sc.department.id} className="hover:bg-[#F6F9FC]/60 transition-colors">
                      <td className="px-5 py-3 font-semibold text-[#1E293B] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sc.department.color }} />
                        {sc.department.name}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${gradeStyles[sc.grade]}`}>
                          {sc.grade}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-bold text-[#1E293B]">
                        {sc.onTimeRate}%
                      </td>
                      <td className="px-3 py-3 text-[#64748B]">
                        {sc.activeProjects}
                      </td>
                      <td className="px-3 py-3">
                        <span className={sc.delayedProjects > 0 ? 'text-[#D13B41] font-bold' : 'text-[#64748B]'}>
                          {sc.delayedProjects}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[#64748B]">
                        {sc.totalReports} ({sc.resolvedReports} resolved)
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to={`/projects?department=${sc.department.id}`}
                          className="text-xs font-bold text-[#2F6BFF] hover:underline"
                        >
                          Explore
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
        <div className="space-y-4">
          <div className="bg-[#FFF4DB] border border-[#FFB020]/30 rounded-xl p-3 flex gap-2.5 items-start">
            <Info className="w-4 h-4 text-[#9A6200] shrink-0 mt-0.5" />
            <div className="text-xs text-[#9A6200]">
              <span className="font-bold">Contractor Accountability Standard:</span> Standings are strictly computed from contract timeline compliance, non-consensual deadline postponements, and verified ground hazard reports.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contractorScorecards.map(c => (
              <div
                key={c.name}
                className="bg-white rounded-xl p-4 border border-[#E3EAF2] shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#1E293B]">{c.name}</h3>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                      c.status === 'Good Standing'
                        ? 'bg-[#E3F7F5] text-[#0E7A55] border border-[#12B5A6]/20'
                        : c.status === 'Under Review'
                        ? 'bg-[#FFF4DB] text-[#9A6200] border border-[#FFB020]/20'
                        : 'bg-[#FFE9EA] text-[#D13B41] border border-[#FF5A5F]/20'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#1E293B] flex items-center justify-end gap-1">
                      <Star className="w-4 h-4 text-[#FFB020] fill-[#FFB020]" />
                      <span>{c.rating}</span>
                    </div>
                    <div className="text-[10px] text-[#64748B]">Delivery Score</div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-[#F6F9FC] p-1.5 rounded-lg border border-[#E3EAF2]">
                    <div className="text-[10px] text-[#64748B]">Total</div>
                    <div className="font-bold text-[#1E293B]">{c.totalProjects}</div>
                  </div>
                  <div className="bg-[#F6F9FC] p-1.5 rounded-lg border border-[#E3EAF2]">
                    <div className="text-[10px] text-[#64748B]">Active</div>
                    <div className="font-bold text-[#1E293B]">{c.activeProjects}</div>
                  </div>
                  <div className="bg-[#F6F9FC] p-1.5 rounded-lg border border-[#E3EAF2]">
                    <div className="text-[10px] text-[#64748B]">Delayed</div>
                    <div className={`font-bold ${c.delayedCount > 0 ? 'text-[#D13B41]' : 'text-[#1E293B]'}`}>
                      {c.delayedCount}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#64748B] text-[11px]">Average Work Progress</span>
                    <span className="font-bold text-[#1E293B] text-[11px]">{c.avgProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div className="h-full bg-[#12B5A6] rounded-full" style={{ width: `${c.avgProgress}%` }} />
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#F1F5F9]">
                  <Link
                    to={`/projects?search=${encodeURIComponent(c.name)}`}
                    className="text-xs font-bold text-[#2F6BFF] hover:underline flex items-center justify-between no-underline"
                  >
                    <span>Inspect Awarded Contracts</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Ward Disruption */}
      {activeTab === 'wards' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E3EAF2] overflow-hidden shadow-2xs">
            <div className="px-5 py-3 border-b border-[#E3EAF2]">
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#1E293B]">
                Ward Disruption &amp; Excavation Intensity Index
              </h3>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Composite metric calculated from concurrent active trenches and delayed road works
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F6F9FC] text-[11px] font-bold text-[#64748B] border-b border-[#E3EAF2] uppercase">
                  <tr>
                    <th className="px-5 py-2.5">Municipal Ward</th>
                    <th className="px-3 py-2.5">Disruption Index</th>
                    <th className="px-3 py-2.5">Active Works</th>
                    <th className="px-3 py-2.5">Delayed Corridors</th>
                    <th className="px-3 py-2.5">CAPEX Outlay</th>
                    <th className="px-5 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EAF2]">
                  {wardScorecards.map(w => (
                    <tr key={w.ward} className="hover:bg-[#F6F9FC]/60 transition-colors">
                      <td className="px-5 py-3 font-bold text-[#1E293B]">
                        {w.ward}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            w.disruptionIndex >= 60 ? 'bg-[#FFE9EA] text-[#D13B41]' : w.disruptionIndex >= 30 ? 'bg-[#FFF4DB] text-[#9A6200]' : 'bg-[#E3F7F5] text-[#0E7A55]'
                          }`}>
                            {w.disruptionIndex} / 100
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-semibold text-[#1E293B]">
                        {w.active} active
                      </td>
                      <td className="px-3 py-3">
                        <span className={w.delayed > 0 ? 'text-[#D13B41] font-bold' : 'text-[#64748B]'}>
                          {w.delayed} delayed
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-[#1E293B]">
                        ₹{w.budget} Lakhs
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to={`/projects?ward=${encodeURIComponent(w.ward)}`}
                          className="text-xs font-bold text-[#2F6BFF] hover:underline"
                        >
                          View Map
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
