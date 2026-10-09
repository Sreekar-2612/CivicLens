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
    <div className="min-h-screen bg-[var(--bg)] font-sans p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Officer Header */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--teal)]/20">
              Department Operations Command
            </span>
            <span className="text-xs text-[var(--muted)]">Authenticated Executive Officer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] font-heading mt-1.5">
            {currentDept ? currentDept.name : 'Public Works Command'}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
            Coordinate road digging permits, prevent cross-department collision, and audit ground-truth reports.
          </p>
        </div>

        {/* Department Switcher & Primary Action */}
        <div className="flex items-center gap-3">
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="text-xs sm:text-sm font-semibold rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] px-3 py-2 shadow-xs focus:ring-2 focus:ring-[var(--primary)]"
          >
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.shortName} — {d.name}
              </option>
            ))}
          </select>
          <Link
            to="/officer/projects/new"
            className="btn-primary text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap no-underline"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Work Order</span>
          </Link>
        </div>
      </div>

      {/* Critical Alert Warning Banner with Clash Hatch Accent */}
      {pendingAlerts.length > 0 && (
        <div className="bg-[#FFE6EE] border border-[#FFD0DE] rounded-xl overflow-hidden shadow-sm">
          <div className="clash-hatch px-4 py-2 flex items-center justify-between border-b border-[#FFD0DE]">
            <span className="text-[11px] font-bold text-[#C41F4F] uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#F0386B]" />
              Action Required: {pendingAlerts.length} Unresolved Conflict{pendingAlerts.length > 1 ? 's' : ''} Flagged
            </span>
            <span className="text-xs font-bold text-[#C41F4F]">Automatic Pre-Emptive Radar</span>
          </div>
          <div className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-[var(--text)] font-heading">
                Overlapping Excavations Detected on Your Department's Corridors
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Other municipal agencies (water/power/telecom) have scheduled excavations on the same road sections. Review now to avoid repeat digging penalties.
              </p>
            </div>
            <Link
              to="/officer/coordination"
              className="px-4 py-2 rounded-lg bg-[#C41F4F] hover:bg-[#A5163E] text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-center no-underline"
            >
              Open Coordination Matrix <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[var(--border)] shadow-xs">
          <span className="text-xs font-semibold text-[var(--muted)] block">Department Projects</span>
          <span className="text-2xl font-extrabold text-[var(--text)] font-heading mt-1 block">{deptProjects.length}</span>
          <span className="text-xs text-[var(--muted)] mt-1 block">
            {deptProjects.filter(p => p.status === 'in_progress').length} active in field
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[var(--border)] shadow-xs">
          <span className="text-xs font-semibold text-[var(--muted)] block">Impending Deadlines</span>
          <span className="text-2xl font-extrabold text-[var(--primary)] font-heading mt-1 block">
            {deptProjects.filter(p => p.confidenceIndicator === 'at_risk' || p.status === 'in_progress').length}
          </span>
          <span className="text-xs text-[var(--muted)] mt-1 block">Due in current quarter</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[var(--border)] shadow-xs">
          <span className="text-xs font-semibold text-[var(--muted)] block">Unresolved Overlaps</span>
          <span className="text-2xl font-extrabold text-[#9A6200] font-heading mt-1 block">{pendingAlerts.length}</span>
          <span className="text-xs text-[var(--muted)] mt-1 block">Cross-agency conflicts</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[var(--border)] shadow-xs">
          <span className="text-xs font-semibold text-[var(--muted)] block">Open Citizen Reports</span>
          <span className="text-2xl font-extrabold text-[#D13B41] font-heading mt-1 block">{pendingReports.length}</span>
          <span className="text-xs text-[var(--muted)] mt-1 block">Requires engineer response</span>
        </div>
      </div>

      {/* Main Content: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Department Projects Table */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--text)] font-heading">Active Work Orders</h2>
              <p className="text-xs text-[var(--muted)]">Capital projects & road maintenance under this jurisdiction</p>
            </div>
            <Link
              to="/officer/projects/new"
              className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              + Create New
            </Link>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {deptProjects.map(p => (
              <div key={p.id} className="p-4 hover:bg-[#F8FAFC] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    <span className="text-xs text-[var(--muted)]">Ward: {p.ward}</span>
                    <span className="text-xs font-semibold text-[var(--text)]">• {p.road}</span>
                  </div>
                  <h3 className="font-bold text-sm text-[var(--text)] font-heading leading-tight">
                    {p.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                    <span>Target: {p.revisedEndDate || p.originalEndDate}</span>
                    <span>Contractor: {p.contractor}</span>
                    <span>Budget: ₹{p.budgetLakhs}L</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs font-bold text-[var(--teal)]">{p.progressPercent}%</span>
                    <div className="w-16 h-1.5 bg-[#F1F5F9] rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-[var(--teal)] rounded-full" style={{ width: `${p.progressPercent}%` }} />
                    </div>
                  </div>
                  <Link
                    to={`/officer/projects/${p.id}/edit`}
                    className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] text-[var(--muted)] transition-colors text-xs font-semibold flex items-center gap-1 no-underline"
                    title="Edit Work Order"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Link>
                  <Link
                    to={`/projects/${p.id}`}
                    className="p-2 rounded-lg border border-[var(--border)] hover:bg-[#F1F5F9] text-[var(--muted)] transition-colors"
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
        <div className="lg:col-span-4 space-y-4">
          {/* Coordination Queue */}
          <div className="bg-white rounded-xl border border-[var(--border)] p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-[var(--text)] font-heading flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#FFB020]" />
                Coordination Alerts
              </h3>
              <Link to="/officer/coordination" className="text-xs font-semibold text-[var(--primary)] hover:underline">
                View All ({alerts.length})
              </Link>
            </div>

            {pendingAlerts.length === 0 ? (
              <p className="text-xs text-[var(--muted)] italic">No pending conflicts for this department.</p>
            ) : (
              <div className="space-y-2">
                {pendingAlerts.slice(0, 3).map(a => (
                  <div key={a.id} className="p-3 rounded-lg bg-[#FFE6EE]/40 border border-[#FFD0DE] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#C41F4F] uppercase text-[10px]">Severity: {a.severity}</span>
                      <span className="font-bold text-[#C41F4F]">{a.score} pts</span>
                    </div>
                    <p className="text-[var(--text)] font-medium">{a.reasons[0]?.description || 'Spatial-temporal overlap'}</p>
                    <Link
                      to="/officer/coordination"
                      className="text-[var(--primary)] font-semibold hover:underline block pt-1"
                    >
                      Resolve Overlap →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Citizen Reports Inbox */}
          <div className="bg-white rounded-xl border border-[var(--border)] p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-[var(--text)] font-heading flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#FF5A5F]" />
                Citizen Grievances Inbox
              </h3>
              <Link to="/officer/reports" className="text-xs font-semibold text-[var(--primary)] hover:underline">
                View All ({reports.length})
              </Link>
            </div>

            {pendingReports.length === 0 ? (
              <p className="text-xs text-[var(--muted)] italic">No unhandled citizen reports.</p>
            ) : (
              <div className="space-y-2">
                {pendingReports.slice(0, 3).map(r => (
                  <div key={r.id} className="p-3 rounded-lg bg-[#F8FAFC] border border-[var(--border)] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[var(--primary)] font-bold">{r.referenceId}</span>
                      <span className="text-[10px] uppercase font-bold text-[#D13B41]">{r.status}</span>
                    </div>
                    <p className="font-semibold text-[var(--text)] line-clamp-1">{r.title}</p>
                    <p className="text-[var(--muted)] text-[11px] truncate">{r.locationDescription}</p>
                    <Link
                      to="/officer/reports"
                      className="text-[var(--primary)] font-semibold hover:underline block pt-1"
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
