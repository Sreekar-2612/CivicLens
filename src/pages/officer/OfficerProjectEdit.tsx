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
      <div className="p-8 text-center text-gray-500">
        Loading work order data...
      </div>
    )
  }

  // Access check
  if (!isAuthorized) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <Link
          to="/officer"
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Officer Command
        </Link>
        <div className="p-8 rounded-2xl bg-rose-50 border-2 border-rose-200 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
            <ShieldX className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Access Restricted: Unauthorized Role</h2>
            <p className="text-xs text-rose-800 mt-1 max-w-md mx-auto">
              Your active session is simulated as <strong className="capitalize">{user?.role || 'Resident'}</strong>. Only authorized department officers and administrators possess write authorization to modify work orders.
            </p>
          </div>
          <div className="p-3 bg-white/80 rounded-xl text-xs text-gray-600 max-w-md mx-auto border border-rose-200">
            <strong>Testing Tip:</strong> Use the "Test Role Switcher" in the left sidebar to switch to <em>Department Officer (Roads)</em> or <em>Administrator</em>.
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
    const pVal = validateProgressUpdate(project, progressPercent, status)
    if (!pVal.isValid) {
      setErrorMessages(pVal.errors)
      return
    }

    // Validate deadline change
    if (isDeadlineChanged) {
      const dVal = validateDeadlineRevision(project, revisedEndDate, delayReason)
      if (!dVal.isValid) {
        setErrorMessages(dVal.errors)
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
        isDeadlineChanged ? delayReason.trim() : undefined,
        user?.displayName || 'Authorized Officer'
      )

      if (updated) {
        setProject(updated)
        setToastMessage('Project status & audit trail updated successfully!')
        setTimeout(() => {
          navigate(`/projects/${project.id}`)
        }, 1200)
      }
    } catch (err: any) {
      setErrorMessages([err?.message || 'Database update failed'])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm border border-gray-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div>
        <Link
          to="/officer"
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Officer Command
        </Link>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
            <Edit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Update Work Order: {project.title}
            </h1>
            <p className="text-xs text-gray-500">
              Corridor: {project.road} ({project.ward}) • Original Target: {project.originalEndDate}
            </p>
          </div>
        </div>
      </div>

      {/* Error alert banner */}
      {errorMessages.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 space-y-1">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Validation Errors Detected ({errorMessages.length})
          </div>
          <ul className="text-xs list-disc pl-5 space-y-0.5">
            {errorMessages.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Progress & Status */}
        <div className="space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block border-b pb-2">
            1. Field Execution Progress
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Project Operational Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
              >
                {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Risk & Confidence Rating
              </label>
              <select
                value={confidence}
                onChange={(e) => setConfidence(e.target.value as ConfidenceIndicator)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
              >
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
              <span>Overall Completion Progress</span>
              <span className="text-teal-700 font-bold">{progressPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progressPercent}
              onChange={(e) => setProgressPercent(parseInt(e.target.value))}
              className="w-full accent-teal-600"
            />
          </div>
        </div>

        {/* Timeline Revision Audit Trail */}
        <div className="space-y-4 pt-4 border-t">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block border-b pb-2">
            2. Schedule Adjustment & Justification
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Original Immutable Deadline (Read-Only)
              </label>
              <input
                type="text"
                disabled
                value={project.originalEndDate}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                title="Protected by database immutability trigger constraint."
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                Sanctioned baseline cannot be rewritten.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Target / Revised Deadline
              </label>
              <input
                type="date"
                value={revisedEndDate}
                onChange={(e) => setRevisedEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                Current active target date.
              </span>
            </div>
          </div>

          {isDeadlineChanged && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Mandatory Accountability Audit: Deadline Revision Justification *
              </div>
              <p className="text-xs text-amber-800">
                Extending this deadline will be permanently recorded in the public transparency audit trail. Provide official reason:
              </p>
              <textarea
                rows={2}
                required
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                placeholder="State cause: Subsurface utility collision, monsoon waterlogging, contractor material delay, etc. (Minimum 5 characters)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}
        </div>

        {/* Contractor & Budget */}
        <div className="space-y-4 pt-4 border-t">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block border-b pb-2">
            3. Financials & Contractor
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Assigned Contractor
              </label>
              <input
                type="text"
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Sanctioned Budget (₹ Lakhs)
              </label>
              <input
                type="number"
                value={budgetLakhs}
                onChange={(e) => setBudgetLakhs(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 flex items-center justify-between border-t">
          <Link
            to="/officer"
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Updating Database...' : 'Update & Audit Log'}
          </button>
        </div>
      </form>
    </div>
  )
}
