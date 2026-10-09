import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers, AlertTriangle, CheckCircle2, Clock, ShieldAlert,
  ArrowRight, Check, X, MessageSquare, ExternalLink, Filter
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
    load()
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
        setToastMessage(`Alert status updated to "${ALERT_STATUS_LABELS[newStatus]}"`)
        setTimeout(() => setToastMessage(null), 3000)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-100 text-rose-800 border-rose-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300'
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm border border-gray-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-amber-100 text-amber-800">
              Cross-Agency Conflict Engine
            </span>
            <span className="text-xs text-gray-500">• Spatial-Temporal Clash Detection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
            Excavation Coordination Hub
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 max-w-2xl">
            Detect and resolve conflicting road digging permits across departments before physical machinery touches the asphalt.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-800 px-2.5 py-1.5"
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
            className="text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-800 px-2.5 py-1.5"
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Alerts List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Flagged Overlaps ({filteredAlerts.length})
            </span>
            <span className="text-xs text-gray-400">Sorted by conflict score</span>
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
                      ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-400/20'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getSeverityBadge(a.severity)}`}>
                      {ALERT_SEVERITY_LABELS[a.severity]}
                    </span>
                    <span className="font-black text-sm text-gray-900">
                      Clash Score: {a.score}/100
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-bold text-gray-900">
                    {pA?.road || 'Shared Corridor'}
                  </div>

                  <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                    <div className="truncate">• <span className="font-semibold text-gray-900">{pA?.title || a.projectAId}</span></div>
                    <div className="truncate">• <span className="font-semibold text-gray-900">{pB?.title || a.projectBId}</span></div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="font-semibold text-gray-700">{ALERT_STATUS_LABELS[a.status]}</span>
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
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-sm sticky top-6">
              {/* Conflict Header */}
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getSeverityBadge(selectedAlert.severity)}`}>
                      {ALERT_SEVERITY_LABELS[selectedAlert.severity]} Severity
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      ID: {selectedAlert.id}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mt-2">
                    Corridor Collision on {projectA?.road || 'Shared Sector'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Municipal Ward: {projectA?.ward || 'Multiple Wards'}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-black text-amber-600">
                    {selectedAlert.score}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">Conflict Score</div>
                </div>
              </div>

              {/* Side-by-side Project Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Project A */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Project A</span>
                  <h3 className="font-bold text-sm text-gray-900 leading-tight">
                    {projectA?.title || selectedAlert.projectAId}
                  </h3>
                  <div className="text-xs space-y-1 text-gray-600 pt-1">
                    <div><span className="font-semibold">Category:</span> {projectA?.category.replace('_', ' ')}</div>
                    <div><span className="font-semibold">Contractor:</span> {projectA?.contractor}</div>
                    <div><span className="font-semibold">Dates:</span> {projectA?.startDate} → {projectA?.revisedEndDate || projectA?.originalEndDate}</div>
                    <div><span className="font-semibold">Status:</span> {projectA?.status}</div>
                  </div>
                  {projectA && (
                    <Link
                      to={`/projects/${projectA.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline pt-1"
                    >
                      Inspect Dossier <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {/* Project B */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Project B (Conflicting)</span>
                  <h3 className="font-bold text-sm text-gray-900 leading-tight">
                    {projectB?.title || selectedAlert.projectBId}
                  </h3>
                  <div className="text-xs space-y-1 text-gray-600 pt-1">
                    <div><span className="font-semibold">Category:</span> {projectB?.category.replace('_', ' ')}</div>
                    <div><span className="font-semibold">Contractor:</span> {projectB?.contractor}</div>
                    <div><span className="font-semibold">Dates:</span> {projectB?.startDate} → {projectB?.revisedEndDate || projectB?.originalEndDate}</div>
                    <div><span className="font-semibold">Status:</span> {projectB?.status}</div>
                  </div>
                  {projectB && (
                    <Link
                      to={`/projects/${projectB.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline pt-1"
                    >
                      Inspect Dossier <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Conflict Reasons Breakdown */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Algorithmic Conflict Factors
                </span>
                <div className="space-y-2">
                  {selectedAlert.reasons.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50 border border-amber-200 text-xs">
                      <span className="text-gray-800 font-medium">{r.description}</span>
                      <span className="font-bold text-amber-700 shrink-0 ml-2">+{r.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolution Workflow */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Inter-Agency Coordination Decision
                </span>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Joint Coordination Protocol / Decision Notes
                  </label>
                  <textarea
                    rows={3}
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder="e.g. Agreed in weekly inter-agency sync: Water pipeline trenching will be expedited by 14 days before BBMP lays the DBM asphalt layer."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('joint_scheduling')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      selectedAlert.status === 'joint_scheduling'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    Joint Scheduling
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('intentional_overlap')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      selectedAlert.status === 'intentional_overlap'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    Intentional Overlap
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('resolved')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      selectedAlert.status === 'resolved'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    Mark Resolved
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus('dismissed')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      selectedAlert.status === 'dismissed'
                        ? 'bg-gray-600 text-white border-gray-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    Dismiss Flag
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <h3 className="font-bold text-gray-900">Select an Alert</h3>
              <p className="text-xs text-gray-500">Click a collision card from the left panel to review and resolve.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
