import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers, AlertTriangle, CheckCircle2, Clock, ShieldAlert,
  ArrowRight, Check, X, MessageSquare, ExternalLink, Filter,
  Calendar, MapPin, Building2, Flame
} from 'lucide-react'
import { dataRepository } from '../../services/dataRepository'
import type { CoordinationAlert, Project, AlertStatus, AlertSeverity } from '../../types'
import { ALERT_SEVERITY_LABELS, ALERT_STATUS_LABELS } from '../../types'

export function OfficerCoordination() {
  const [alerts, setAlerts] = useState<CoordinationAlert[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedAlert, setSelectedAlert] = useState<CoordinationAlert | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [decisionNotes, setDecisionNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastIsError, setToastIsError] = useState(false)

  useEffect(() => {
    async function load() {
      const [a, p] = await Promise.all([
        dataRepository.getAlerts(),
        dataRepository.getProjects(),
      ])
      setAlerts(a)
      setProjects(p)
      if (a.length > 0 && !selectedAlert) {
        setSelectedAlert(a[0])
        setDecisionNotes(a[0].decisionNotes || '')
      }
    }
    load().catch(err => {
      setToastIsError(true)
      setToastMessage(`Could not load alerts: ${err instanceof Error ? err.message : 'Unknown error'}`)
    })
  }, [])

  const handleSelectAlert = (alert: CoordinationAlert) => {
    setSelectedAlert(alert)
    setDecisionNotes(alert.decisionNotes || '')
  }

  const handleUpdateStatus = async (newStatus: AlertStatus) => {
    if (!selectedAlert) return
    setIsUpdating(true)
    try {
      const updated = await dataRepository.updateAlertStatus(
        selectedAlert.id,
        newStatus,
        decisionNotes.trim() || undefined
      )
      if (updated) {
        setSelectedAlert(updated)
        setAlerts(prev => prev.map(a => a.id === updated.id ? updated : a))
        setToastIsError(false)
        setToastMessage(`Alert status updated to "${ALERT_STATUS_LABELS[newStatus]}"`)
        setTimeout(() => setToastMessage(null), 3000)
      } else {
        throw new Error('Alert was not found.')
      }
    } catch (err) {
      setToastIsError(true)
      setToastMessage(`Could not update alert: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-[#FFE9EA] text-[#D13B41] border-[#FF5A5F]/30'
      case 'high':
        return 'bg-[#FFF4DB] text-[#9A6200] border-[#FFB020]/30'
      case 'medium':
        return 'bg-[#F0EBFE] text-[#6A4FD1] border-[#8B6CF0]/30'
      case 'low':
        return 'bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]/20'
    }
  }

  const filteredAlerts = alerts.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false
    return true
  })

  // Get project entities for the selected alert
  const projectA = projects.find(p => p.id === selectedAlert?.projectAId)
  const projectB = projects.find(p => p.id === selectedAlert?.projectBId)

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E293B] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm border border-[var(--border)] animate-fade-in">
          {toastIsError ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-[var(--teal)]" />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FFE6EE] text-[#C41F4F] flex items-center gap-1 border border-[#FFD0DE]">
              <AlertTriangle className="w-3 h-3" />
              Cross-Agency Collision Engine
            </span>
            <span className="text-xs text-[var(--muted)]">• Spatial-Temporal Clash Detection</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)] font-heading mt-1.5">
            Excavation Coordination Hub
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5 max-w-2xl">
            Detect and resolve conflicting road digging permits across departments before physical machinery damages the asphalt.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] px-3 py-2 shadow-xs focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="all">All Statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="joint_scheduling">Joint Scheduling</option>
            <option value="intentional_overlap">Intentional Overlap</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] px-3 py-2 shadow-xs focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Alerts list + Detailed Clash Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Alerts List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
              Flagged Overlaps ({filteredAlerts.length})
            </span>
            <span className="text-xs text-[var(--muted)]">Sorted by clash score</span>
          </div>

          <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {filteredAlerts.map(a => {
              const pA = projects.find(p => p.id === a.projectAId)
              const pB = projects.find(p => p.id === a.projectBId)
              const isSelected = selectedAlert?.id === a.id

              return (
                <div
                  key={a.id}
                  onClick={() => handleSelectAlert(a)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#F0386B] bg-white shadow-md ring-2 ring-[#F0386B]/20'
                      : 'border-[var(--border)] bg-white hover:border-[var(--primary)] hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getSeverityBadge(a.severity)}`}>
                      {ALERT_SEVERITY_LABELS[a.severity]}
                    </span>
                    <div className="flex items-center gap-1.5 font-black text-sm">
                      <span className="text-[10px] text-[var(--muted)] font-normal uppercase">Clash Score:</span>
                      <span className="text-[#C41F4F] font-bold">{a.score}/100</span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs font-bold text-[var(--text)] font-heading">
                    {pA?.road || 'Shared Corridor'}
                  </div>

                  <div className="mt-1 space-y-0.5 text-xs text-[var(--muted)]">
                    <div className="truncate">• <span className="font-semibold text-[var(--text)]">{pA?.title || a.projectAId}</span></div>
                    <div className="truncate">• <span className="font-semibold text-[var(--text)]">{pB?.title || a.projectBId}</span></div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted)]">
                    <span className="font-semibold text-[var(--text)]">{ALERT_STATUS_LABELS[a.status]}</span>
                    <span>{a.reasons.length} collision factors</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Selected Conflict Deep Dive & Resolution Workflow */}
        <div className="lg:col-span-7">
          {selectedAlert ? (
            <div className="bg-white rounded-xl border border-[var(--border)] p-6 space-y-6 shadow-sm sticky top-6">
              {/* Conflict Header */}
              <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getSeverityBadge(selectedAlert.severity)}`}>
                      {ALERT_SEVERITY_LABELS[selectedAlert.severity]} Severity
                    </span>
                    <span className="text-xs font-bold text-[var(--muted)]">
                      ID: {selectedAlert.id}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text)] font-heading mt-2">
                    Corridor Collision on {projectA?.road || 'Shared Sector'}
                  </h2>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Municipal Ward: {projectA?.ward || 'Multiple Wards'}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-black text-[#C41F4F] font-heading">
                    {selectedAlert.score}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-[var(--muted)]">Conflict Score</div>
                </div>
              </div>

              {/* Side-by-side Project Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Project A */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[var(--border)] space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[var(--muted)] block">Project A</span>
                  <h3 className="font-bold text-sm text-[var(--text)] leading-tight font-heading">
                    {projectA?.title || selectedAlert.projectAId}
                  </h3>
                  <div className="text-xs space-y-1 text-[var(--muted)] pt-1">
                    <div><span className="font-semibold text-[var(--text)]">Category:</span> {projectA?.category.replace('_', ' ')}</div>
                    <div><span className="font-semibold text-[var(--text)]">Contractor:</span> {projectA?.contractor}</div>
                    <div><span className="font-semibold text-[var(--text)]">Dates:</span> {projectA?.startDate} → {projectA?.revisedEndDate || projectA?.originalEndDate}</div>
                    <div><span className="font-semibold text-[var(--text)]">Status:</span> {projectA?.status}</div>
                  </div>
                  {projectA && (
                    <Link
                      to={`/projects/${projectA.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline pt-1"
                    >
                      Inspect Dossier <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {/* Project B */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[var(--border)] space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#C41F4F] block">Project B (Conflicting)</span>
                  <h3 className="font-bold text-sm text-[var(--text)] leading-tight font-heading">
                    {projectB?.title || selectedAlert.projectBId}
                  </h3>
                  <div className="text-xs space-y-1 text-[var(--muted)] pt-1">
                    <div><span className="font-semibold text-[var(--text)]">Category:</span> {projectB?.category.replace('_', ' ')}</div>
                    <div><span className="font-semibold text-[var(--text)]">Contractor:</span> {projectB?.contractor}</div>
                    <div><span className="font-semibold text-[var(--text)]">Dates:</span> {projectB?.startDate} → {projectB?.revisedEndDate || projectB?.originalEndDate}</div>
                    <div><span className="font-semibold text-[var(--text)]">Status:</span> {projectB?.status}</div>
                  </div>
                  {projectB && (
                    <Link
                      to={`/projects/${projectB.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline pt-1"
                    >
                      Inspect Dossier <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Conflict Reasons Breakdown */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Algorithmic Conflict Factors
                </span>
                <div className="space-y-2">
                  {selectedAlert.reasons.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#FFE6EE]/40 border border-[#FFD0DE] text-xs">
                      <span className="text-[var(--text)] font-medium">{r.description}</span>
                      <span className="font-bold text-[#C41F4F] shrink-0 ml-2">+{r.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolution Workflow */}
              <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Inter-Agency Coordination Decision
                </span>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Joint Coordination Protocol / Decision Notes
                  </label>
                  <textarea
                    rows={3}
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder="e.g. Agreed in weekly inter-agency sync: Water pipeline trenching will be expedited by 14 days before BBMP lays the DBM asphalt layer."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-white text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('joint_scheduling')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      selectedAlert.status === 'joint_scheduling'
                        ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                        : 'bg-white text-[var(--text)] border-[var(--border)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]'
                    }`}
                  >
                    Joint Scheduling
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('intentional_overlap')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      selectedAlert.status === 'intentional_overlap'
                        ? 'bg-[#8B6CF0] text-white border-[#8B6CF0] shadow-sm'
                        : 'bg-white text-[var(--text)] border-[var(--border)] hover:bg-[#F0EBFE] hover:text-[#6A4FD1]'
                    }`}
                  >
                    Intentional Overlap
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('resolved')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      selectedAlert.status === 'resolved'
                        ? 'bg-[var(--teal)] text-white border-[var(--teal)] shadow-sm'
                        : 'bg-white text-[var(--text)] border-[var(--border)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal)]'
                    }`}
                  >
                    Mark Resolved
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('dismissed')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      selectedAlert.status === 'dismissed'
                        ? 'bg-[#64748B] text-white border-[#64748B] shadow-sm'
                        : 'bg-white text-[var(--text)] border-[var(--border)] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    Dismiss Flag
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-[var(--border)] p-8">
              <Layers className="w-12 h-12 text-[var(--muted)]/40 mx-auto mb-2" />
              <h3 className="font-bold text-[var(--text)] font-heading">Select an Alert</h3>
              <p className="text-xs text-[var(--muted)]">Click a collision card from the left panel to review and resolve.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
