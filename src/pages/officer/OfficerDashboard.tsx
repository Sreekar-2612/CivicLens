import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers, FolderPlus, MessageSquare, AlertTriangle, CheckCircle2,
  Clock, ArrowRight, Building2, TrendingUp, Filter, Edit, ExternalLink
} from 'lucide-react'
import { dataRepository } from '../../services/dataRepository'
import type { Project, Department, Report, CoordinationAlert, SummaryStats } from '../../types'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { format } from 'date-fns'

export function OfficerDashboard() {
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [alerts, setAlerts] = useState<CoordinationAlert[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<string>('dept-bbmp')

  useEffect(() => {
    async function load() {
      const [s, p, d, r, a] = await Promise.all([
        dataRepository.getSummaryStats(),
        dataRepository.getProjects(),
        dataRepository.getDepartments(),
        dataRepository.getReports(),
        dataRepository.getAlerts(),
      ])
      setStats(s)
      setProjects(p)
      setDepartments(d)
      setReports(r)
      setAlerts(a)
    }
    load()
  }, [])

  const currentDept = departments.find(d => d.id === selectedDeptId) || departments[0]
  const deptProjects = projects.filter(p => p.departmentId === (currentDept?.id || 'dept-bbmp'))
  const deptProjectIds = new Set(deptProjects.map(p => p.id))
  
  // Pending conflicts involving this department
  const pendingAlerts = alerts.filter(
    a => (deptProjectIds.has(a.projectAId) || deptProjectIds.has(a.projectBId)) && a.status === 'pending_review'
  )

  // Pending citizen reports
  const pendingReports = reports.filter(
    r => (r.status === 'submitted' || r.status === 'acknowledged') && (r.projectId ? deptProjectIds.has(r.projectId) : true)
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Officer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-teal-100 text-teal-800">
              Department Operations Center
            </span>
            <span className="text-xs text-gray-400">Authenticated as Field Engineer / Executive Officer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
            {currentDept ? currentDept.name : 'Public Works Command'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Coordinate road digging permits, prevent cross-department collision, and audit ground-truth reports.
          </p>
        </div>

        {/* Department Switcher */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-600">Active Jurisdiction:</label>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="text-xs sm:text-sm font-semibold rounded-xl border border-gray-300 bg-white text-gray-900 px-3 py-2 shadow-sm focus:ring-2 focus:ring-teal-500"
          >
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.shortName} — {d.name}
              </option>
            ))}
          </select>
          <Link
            to="/officer/projects/new"
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm shadow flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4" />
            New Work Order
          </Link>
        </div>
      </div>

      {/* Critical Alert Warning Banner */}
      {pendingAlerts.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 shadow">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                  ACTION REQUIRED
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
                  {pendingAlerts.length} Unresolved Conflict{pendingAlerts.length > 1 ? 's' : ''}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">
                Overlapping Excavations Detected on Your Department's Corridors
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Other municipal agencies (water/power/telecom) have scheduled excavations on the same road sections. Review now to avoid repeat digging penalties.
              </p>
            </div>
          </div>
          <Link
            to="/officer/coordination"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-center"
          >
            Open Coordination Matrix <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-gray-500 block">Department Projects</span>
          <span className="text-3xl font-black text-gray-900 mt-1 block">{deptProjects.length}</span>
          <span className="text-xs text-gray-400 mt-1 block">
            {deptProjects.filter(p => p.status === 'in_progress').length} active in field
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-gray-500 block">Impending Deadlines</span>
          <span className="text-3xl font-black text-blue-600 mt-1 block">
            {deptProjects.filter(p => p.confidenceIndicator === 'at_risk' || p.status === 'in_progress').length}
          </span>
          <span className="text-xs text-gray-400 mt-1 block">Due in current quarter</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-gray-500 block">Unresolved Overlaps</span>
          <span className="text-3xl font-black text-amber-600 mt-1 block">{pendingAlerts.length}</span>
          <span className="text-xs text-gray-400 mt-1 block">Cross-agency conflicts</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-gray-500 block">Open Citizen Reports</span>
          <span className="text-3xl font-black text-rose-600 mt-1 block">{pendingReports.length}</span>
          <span className="text-xs text-gray-400 mt-1 block">Requires engineer response</span>
        </div>
      </div>

      {/* Main Content: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Department Projects Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Active Work Orders</h2>
              <p className="text-xs text-gray-500">Capital projects & road maintenance under this jurisdiction</p>
            </div>
            <Link
              to="/officer/projects/new"
              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              + Create New
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {deptProjects.map(p => (
              <div key={p.id} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    <span className="text-xs text-gray-400">Ward: {p.ward}</span>
                    <span className="text-xs font-semibold text-gray-500">• {p.road}</span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-tight">
                    {p.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Target: {p.revisedEndDate || p.originalEndDate}</span>
                    <span>Contractor: {p.contractor}</span>
                    <span>Budget: ₹{p.budgetLakhs}L</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs font-bold text-gray-700">{p.progressPercent}%</span>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-teal-600 rounded-full" style={{ width: `${p.progressPercent}%` }} />
                    </div>
                  </div>
                  <Link
                    to={`/officer/projects/${p.id}/edit`}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 text-gray-600 transition-colors text-xs font-medium flex items-center gap-1"
                    title="Edit Work Order"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Link>
                  <Link
                    to={`/projects/${p.id}`}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
                    title="View Public Page"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Quick Action Queues */}
        <div className="lg:col-span-4 space-y-6">
          {/* Coordination Queue */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                Coordination Alerts
              </h3>
              <Link to="/officer/coordination" className="text-xs font-semibold text-teal-600 hover:underline">
                View All ({alerts.length})
              </Link>
            </div>

            {pendingAlerts.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No pending conflicts for this department.</p>
            ) : (
              <div className="space-y-2.5">
                {pendingAlerts.slice(0, 3).map(a => (
                  <div key={a.id} className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 uppercase text-[10px]">Severity: {a.severity}</span>
                      <span className="font-black text-amber-700">{a.score} pts</span>
                    </div>
                    <p className="text-gray-800 font-medium">{a.reasons[0]?.description || 'Spatial-temporal overlap'}</p>
                    <Link
                      to="/officer/coordination"
                      className="text-teal-700 font-semibold hover:underline block pt-1"
                    >
                      Resolve Overlap →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Citizen Reports Inbox */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-rose-500" />
                Citizen Grievances Inbox
              </h3>
              <Link to="/officer/reports" className="text-xs font-semibold text-teal-600 hover:underline">
                View All ({reports.length})
              </Link>
            </div>

            {pendingReports.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No unhandled citizen reports.</p>
            ) : (
              <div className="space-y-2.5">
                {pendingReports.slice(0, 3).map(r => (
                  <div key={r.id} className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-indigo-600 font-bold">{r.referenceId}</span>
                      <span className="text-[10px] uppercase font-bold text-rose-600">{r.status}</span>
                    </div>
                    <p className="font-semibold text-gray-900 line-clamp-1">{r.title}</p>
                    <p className="text-gray-500 text-[11px] truncate">{r.locationDescription}</p>
                    <Link
                      to="/officer/reports"
                      className="text-teal-700 font-semibold hover:underline block pt-1"
                    >
                      Respond & Triage →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
