import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Edit, Save, AlertTriangle, CheckCircle2,
  Calendar, Clock, TrendingUp, Building2, Lock, ShieldX
} from 'lucide-react'
import { dataRepository } from '../../services/dataRepository'
import { useAuth } from '../../context/AuthContext'
import { validateDeadlineRevision, validateProgressUpdate } from '../../services/projectValidation'
import type { Project, ProjectStatus, ConfidenceIndicator } from '../../types'
import { PROJECT_STATUS_LABELS } from '../../types'

export function OfficerProjectEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [status, setStatus] = useState<ProjectStatus>('in_progress')
  const [confidence, setConfidence] = useState<ConfidenceIndicator>('on_track')
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [revisedEndDate, setRevisedEndDate] = useState<string>('')
  const [delayReason, setDelayReason] = useState<string>('')
  const [contractor, setContractor] = useState<string>('')
  const [budgetLakhs, setBudgetLakhs] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [errorMessages, setErrorMessages] = useState<string[]>([])

  const isAuthorized = user && (user.role === 'officer' || user.role === 'admin')

  useEffect(() => {
    async function load() {
      if (id) {
        const p = await dataRepository.getProject(id)
        if (p) {
          setProject(p)
          setStatus(p.status)
          setConfidence(p.confidenceIndicator)
          setProgressPercent(p.progressPercent)
          setRevisedEndDate(p.revisedEndDate || p.originalEndDate)
          setContractor(p.contractor)
          setBudgetLakhs(p.budgetLakhs || 0)
        }
      }
    }
    load()
  }, [id])

  if (!project) {
    return (
      <div className="p-8 text-center text-[var(--muted)]">
        Loading work order data...
      </div>
    )
  }

  // Access check
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-6 max-w-3xl mx-auto space-y-6 font-sans">
        <Link
          to="/officer"
          className="inline-flex items-center text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Officer Command
        </Link>
        <div className="p-8 rounded-xl bg-white border border-[var(--border)] text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[#FFE9EA] text-[#D13B41] flex items-center justify-center mx-auto">
            <ShieldX className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text)] font-heading">Access Restricted: Unauthorized Role</h2>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-md mx-auto">
              Your active session is simulated as <strong className="capitalize">{user?.role || 'Resident'}</strong>. Only authorized department officers and administrators possess write authorization to modify work orders.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const effectiveCurrentDeadline = project.revisedEndDate || project.originalEndDate
  const isDeadlineChanged = revisedEndDate !== effectiveCurrentDeadline

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessages([])

    // Validate progress
    const progressValidation = validateProgressUpdate(project, progressPercent, status)
    if (!progressValidation.isValid) {
      setErrorMessages(progressValidation.errors)
      return
    }

    // Validate deadline revision if changed
    if (isDeadlineChanged) {
      const deadlineValidation = validateDeadlineRevision(
        project,
        revisedEndDate,
        delayReason
      )
      if (!deadlineValidation.isValid) {
        setErrorMessages(deadlineValidation.errors)
        return
      }
    }

    setSaving(true)
    try {
      const updated = await dataRepository.updateProject(
        project.id,
        {
          status,
          confidenceIndicator: confidence,
          progressPercent,
          revisedEndDate: isDeadlineChanged ? revisedEndDate : project.revisedEndDate,
          contractor,
          budgetLakhs,
        },
        delayReason,
        user?.displayName || 'Department Engineer'
      )

      if (!updated) throw new Error('Work order was not found.')
      setProject(updated)
      setToastMessage('Work order modifications saved successfully.')
      setTimeout(() => setToastMessage(null), 3000)

      // Database triggers record progress and deadline changes with the project update.
    } catch (err: any) {
      setErrorMessages([err?.message || 'Failed to update work order.'])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E293B] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm border border-[var(--border)] animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[var(--teal)]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/officer"
            className="p-2 rounded-lg border border-[var(--border)] bg-white hover:bg-[#F8FAFC] text-[var(--muted)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--teal)]">
              Work Order Configuration
            </span>
            <h1 className="text-2xl font-bold text-[var(--text)] font-heading">
              Update {project.id}: {project.title}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              {project.road} • Sanctioned Baseline: {project.originalEndDate}
            </p>
          </div>
        </div>
        <Link
          to={`/projects/${project.id}`}
          className="text-xs font-semibold text-[var(--primary)] hover:underline"
        >
          View Public Page →
        </Link>
      </div>

      {/* Error alert banner */}
      {errorMessages.length > 0 && (
        <div className="p-4 rounded-xl bg-[#FFE9EA] border border-[#FF5A5F]/30 text-[#D13B41] space-y-1">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#D13B41]">
            <AlertTriangle className="w-4 h-4 text-[#FF5A5F]" />
            Validation Rejection ({errorMessages.length})
          </div>
          <ul className="text-xs list-disc pl-5 space-y-0.5">
            {errorMessages.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-[var(--border)] p-6 sm:p-8 shadow-sm space-y-6">
        {/* Progress & Status */}
        <div className="space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--teal)] block border-b border-[var(--border)] pb-2">
            1. Field Execution Progress
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Project Operational Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              >
                {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Risk & Confidence Rating
              </label>
              <select
                value={confidence}
                onChange={(e) => setConfidence(e.target.value as ConfidenceIndicator)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              >
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-[var(--text)] mb-1">
              <span>Overall Completion Progress</span>
              <span className="text-[var(--teal)] font-bold">{progressPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progressPercent}
              onChange={(e) => setProgressPercent(parseInt(e.target.value))}
              className="w-full accent-[var(--teal)]"
            />
          </div>
        </div>

        {/* Timeline Revision Audit Trail */}
        <div className="space-y-4 pt-4 border-t border-[var(--border)]">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--teal)] block border-b border-[var(--border)] pb-2">
            2. Schedule Adjustment & Justification
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--muted)] mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[var(--muted)]" />
                Original Immutable Deadline (Read-Only)
              </label>
              <input
                type="text"
                disabled
                value={project.originalEndDate}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--muted)] cursor-not-allowed"
                title="Protected by database immutability trigger constraint."
              />
              <span className="text-[10px] text-[var(--muted)] mt-0.5 block">
                Sanctioned baseline cannot be rewritten.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Revised Completion Target
              </label>
              <input
                type="date"
                value={revisedEndDate}
                onChange={(e) => setRevisedEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              />
            </div>
          </div>

          {isDeadlineChanged && (
            <div className="p-4 rounded-lg bg-[var(--primary-soft)] border border-[var(--primary)]/20 space-y-2">
              <label className="block text-xs font-bold text-[var(--primary)]">
                Mandatory Delay Justification (Public Audit Log Requirement) *
              </label>
              <textarea
                rows={3}
                required
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                placeholder="Explain the specific technical, weather, or contractor delay factor that required this deadline revision."
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-white text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Contractor and Budget */}
        <div className="space-y-4 pt-4 border-t border-[var(--border)]">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--teal)] block border-b border-[var(--border)] pb-2">
            3. Agency & Financial Auditing
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Executing Contractor
              </label>
              <input
                type="text"
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Sanctioned Budget (₹ Lakhs)
              </label>
              <input
                type="number"
                value={budgetLakhs}
                onChange={(e) => setBudgetLakhs(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 flex items-center justify-between border-t border-[var(--border)]">
          <Link
            to="/officer"
            className="px-4 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] no-underline"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-xs sm:text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save & Audit Update'}
          </button>
        </div>
      </form>
    </div>
  )
}
