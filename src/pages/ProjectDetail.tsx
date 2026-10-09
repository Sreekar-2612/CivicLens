import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Calendar, Building2, User, Tag,
  DollarSign, TrendingUp, Clock, AlertTriangle, CheckCircle2,
  FileText, Layers, ChevronRight, ExternalLink, History, PlusCircle, X
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { dataRepository } from '../services/dataRepository'
import { useAuth } from '../context/AuthContext'
import { validateProgressUpdate } from '../services/projectValidation'
import type { Project, Department, ProjectUpdate, Milestone, Report, CoordinationAlert, ProjectStatus } from '../types'
import { PROJECT_CATEGORY_LABELS, PROJECT_STATUS_LABELS } from '../types'
import { StatusBadge, ConfidenceBadge, SeverityBadge, ReportStatusBadge } from '../components/ui/StatusBadge'
import { LoadingState, ErrorState } from '../components/ui/SharedStates'

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [department, setDepartment] = useState<Department | null>(null)
  const [updates, setUpdates] = useState<ProjectUpdate[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [alerts, setAlerts] = useState<CoordinationAlert[]>([])
  const [relatedProjects, setRelatedProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Progress update modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [newProgress, setNewProgress] = useState(0)
  const [newStatus, setNewStatus] = useState<ProjectStatus>('in_progress')
  const [updateTitle, setUpdateTitle] = useState('')
  const [updateNotes, setUpdateNotes] = useState('')
  const [updateDelayReason, setUpdateDelayReason] = useState('')
  const [submittingUpdate, setSubmittingUpdate] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!id) return
      try {
        const p = await dataRepository.getProject(id)
        if (!p) {
          setError(true)
          setLoading(false)
          return
        }
        setProject(p)

        const [dept, upd, ms, rpt, alrt, related] = await Promise.all([
          dataRepository.getDepartment(p.departmentId),
          dataRepository.getProjectUpdates(id),
          dataRepository.getMilestones(id),
          dataRepository.getReportsByProject(id),
          dataRepository.getAlertsByProject(id),
          dataRepository.getProjectsByRoad(p.road),
        ])

        setDepartment(dept || null)
        setUpdates(upd)
        setMilestones(ms)
        setReports(rpt)
        setAlerts(alrt)
        setRelatedProjects(related.filter(r => r.id !== id))
        setNewProgress(p.progressPercent)
        setNewStatus(p.status)
        setLoading(false)
      } catch {
        setError(true)
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return
    setUpdateError(null)

    if (user?.role === 'resident') {
      setUpdateError('Access Denied: Residents cannot submit official project updates.')
      return
    }

    const val = validateProgressUpdate(project, newProgress, newStatus)
    if (!val.isValid) {
      setUpdateError(val.errors.join(' '))
      return
    }

    if (newStatus === 'delayed' && !updateDelayReason.trim()) {
      setUpdateError('Please provide a brief delay reason description.')
      return
    }

    setSubmittingUpdate(true)
    try {
      const createdUpdate = await dataRepository.addProjectUpdate(project.id, {
        type: newStatus === 'delayed' ? 'status_change' : 'progress',
        title: updateTitle.trim() || `Progress updated to ${newProgress}%`,
        description: updateNotes.trim() || `Field progress reached ${newProgress}%. Status: ${PROJECT_STATUS_LABELS[newStatus]}.`,
        previousValue: String(project.progressPercent),
        newValue: String(newProgress),
        delayReason: newStatus === 'delayed' ? updateDelayReason.trim() : undefined,
        authorId: user?.id || 'officer-1',
        authorName: user?.displayName || 'Authorized Engineer',
      })

      const updatedProject = await dataRepository.updateProject(project.id, {
        progressPercent: newProgress,
        status: newStatus,
      })

      if (updatedProject) {
        setProject(updatedProject)
      }
      setUpdates(prev => [createdUpdate, ...prev])
      setShowUpdateModal(false)
      setToastMsg('Progress update recorded to project timeline!')
      setTimeout(() => setToastMsg(null), 3500)
    } catch (err: any) {
      setUpdateError(err?.message || 'Failed to submit update')
    } finally {
      setSubmittingUpdate(false)
    }
  }

  if (loading) return <LoadingState message="Loading project details..." />
  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <ErrorState
          title="Project not found"
          description="The project you're looking for doesn't exist or has been removed."
        />
        <div className="text-center mt-4">
          <Link to="/projects" className="btn btn-primary">
            <ArrowLeft className="w-4 h-4" /> Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  const endDate = project.revisedEndDate || project.originalEndDate
  const hasRevision = !!project.revisedEndDate
  const deadlineRevisions = updates.filter(u => u.type === 'deadline_revision')

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--neutral-500)] mb-6">
        <Link to="/projects" className="hover:text-[var(--teal-600)] no-underline text-[var(--neutral-500)] flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Projects
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[var(--navy-700)] font-medium truncate">{project.title}</span>
      </nav>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--navy-900)] leading-tight mb-2">
              {project.title}
            </h1>
            <p className="text-sm text-[var(--neutral-500)] leading-relaxed">
              {project.purpose}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <StatusBadge status={project.status} />
            <ConfidenceBadge indicator={project.confidenceIndicator} />
          </div>
        </div>

        {/* Key details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[var(--neutral-100)]">
          <DetailItem
            icon={Building2}
            label="Department"
            value={
              <span className="flex items-center gap-1.5">
                {department && (
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: department.color }} />
                )}
                {department?.name || 'Unknown'}
              </span>
            }
          />
          <DetailItem
            icon={User}
            label="Contractor"
            value={project.contractor}
          />
          <DetailItem
            icon={Tag}
            label="Category"
            value={PROJECT_CATEGORY_LABELS[project.category]}
          />
          <DetailItem
            icon={MapPin}
            label="Location"
            value={`${project.road}, ${project.locality} (${project.ward})`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress */}
          {(project.status === 'in_progress' || project.status === 'delayed') && (
            <div className="card p-5">
              <h2 className="text-base font-semibold text-[var(--navy-900)] mb-3 flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-[var(--teal-600)]" />
                Progress
              </h2>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold text-[var(--navy-900)]">{project.progressPercent}%</span>
                <span className="text-sm text-[var(--neutral-500)]">
                  Last updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                </span>
              </div>
              <div className="h-3 bg-[var(--neutral-200)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    project.status === 'delayed' ? 'bg-red-400' : 'bg-teal-500'
                  }`}
                  style={{ width: `${project.progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Dates and Deadlines */}
          <div className="card p-5">
            <h2 className="text-base font-semibold text-[var(--navy-900)] mb-4 flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-[var(--teal-600)]" />
              Timeline & Deadlines
            </h2>
            <div className="space-y-3">
              <DateRow label="Start Date" date={project.startDate} />
              <DateRow
                label="Original Completion"
                date={project.originalEndDate}
                crossed={hasRevision}
              />
              {hasRevision && (
                <DateRow
                  label="Revised Completion"
                  date={project.revisedEndDate!}
                  highlight="amber"
                />
              )}
              {project.actualEndDate && (
                <DateRow
                  label="Actual Completion"
                  date={project.actualEndDate}
                  highlight="green"
                />
              )}
            </div>

            {/* Delay reasons */}
            {deadlineRevisions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--neutral-100)]">
                <h3 className="text-sm font-semibold text-[var(--navy-700)] mb-3 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-amber-500" />
                  Deadline Revision History
                </h3>
                <div className="space-y-3">
                  {deadlineRevisions.map(rev => (
                    <div key={rev.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-amber-800">{rev.title}</span>
                        <span className="text-xs text-amber-600">
                          {format(new Date(rev.createdAt), 'dd MMM yyyy')}
                        </span>
                      </div>
                      {rev.previousValue && rev.newValue && (
                        <p className="text-xs text-amber-700 mb-1">
                          <span className="line-through">{format(new Date(rev.previousValue), 'dd MMM yyyy')}</span>
                          {' → '}
                          <span className="font-semibold">{format(new Date(rev.newValue), 'dd MMM yyyy')}</span>
                        </p>
                      )}
                      {rev.delayReason && (
                        <p className="text-xs text-amber-800 mt-1">
                          <strong>Reason:</strong> {rev.delayReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Milestones */}
          {milestones.length > 0 && (
            <div className="card p-5">
              <h2 className="text-base font-semibold text-[var(--navy-900)] mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-[var(--teal-600)]" />
                Milestones
              </h2>
              <div className="space-y-0">
                {milestones.map((ms, index) => (
                  <div key={ms.id} className="flex gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                        ms.status === 'completed' ? 'bg-teal-500 border-teal-500' :
                        ms.status === 'overdue' ? 'bg-red-400 border-red-400' :
                        'bg-white border-[var(--neutral-300)]'
                      }`} />
                      {index < milestones.length - 1 && (
                        <div className={`w-0.5 flex-1 min-h-[2rem] ${
                          ms.status === 'completed' ? 'bg-teal-300' : 'bg-[var(--neutral-200)]'
                        }`} />
                      )}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[var(--navy-800)]">{ms.title}</span>
                        {ms.status === 'overdue' && (
                          <span className="status-badge bg-red-100 text-red-700">Overdue</span>
                        )}
                        {ms.status === 'completed' && (
                          <span className="status-badge bg-teal-100 text-teal-700">Completed</span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--neutral-500)] mt-0.5">
                        Target: {format(new Date(ms.targetDate), 'dd MMM yyyy')}
                        {ms.completedDate && (
                          <> · Completed: {format(new Date(ms.completedDate), 'dd MMM yyyy')}</>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toast Notification */}
          {toastMsg && (
            <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm border border-slate-700 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* Update History */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[var(--navy-900)] flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-[var(--teal-600)]" />
                Update History ({updates.length})
              </h2>
              <button
                type="button"
                onClick={() => {
                  setNewProgress(project.progressPercent)
                  setNewStatus(project.status)
                  setShowUpdateModal(true)
                }}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Post Progress Update</span>
              </button>
            </div>

            {/* Modal: Post Progress Update */}
            {showUpdateModal && (
              <div className="mb-6 p-4 rounded-xl bg-teal-50/60 border border-teal-200 dark:border-teal-900/40 text-xs space-y-4">
                <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                  <span className="font-bold uppercase tracking-wider text-teal-900">
                    Submit New Field Progress Record
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowUpdateModal(false)}
                    className="p-1 text-gray-400 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {updateError && (
                  <div className="p-2.5 rounded bg-rose-100 border border-rose-300 text-rose-800 font-medium">
                    {updateError}
                  </div>
                )}

                <form onSubmit={handlePostUpdate} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between font-semibold text-gray-700 mb-1">
                        <span>New Progress Percent</span>
                        <span className="text-teal-700 font-bold">{newProgress}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={newProgress}
                        onChange={(e) => setNewProgress(parseInt(e.target.value))}
                        className="w-full accent-teal-600"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Operational Status
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as ProjectStatus)}
                        className="w-full px-2.5 py-1.5 rounded border border-gray-300 bg-white"
                      >
                        <option value="in_progress">In Progress</option>
                        <option value="delayed">Delayed</option>
                        <option value="completed">Completed (100%)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Update Title / Headline
                    </label>
                    <input
                      type="text"
                      value={updateTitle}
                      onChange={(e) => setUpdateTitle(e.target.value)}
                      placeholder={`e.g. Asphalting completed on Northbound lane`}
                      className="w-full px-2.5 py-1.5 rounded border border-gray-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Detailed Field Notes & Observations
                    </label>
                    <textarea
                      rows={2}
                      value={updateNotes}
                      onChange={(e) => setUpdateNotes(e.target.value)}
                      placeholder="Describe work completed, machinery on site, or upcoming tasks."
                      className="w-full px-2.5 py-1.5 rounded border border-gray-300 bg-white"
                    />
                  </div>

                  {newStatus === 'delayed' && (
                    <div>
                      <label className="block font-semibold text-rose-700 mb-1">
                        Delay Reason & Root Cause *
                      </label>
                      <input
                        type="text"
                        required
                        value={updateDelayReason}
                        onChange={(e) => setUpdateDelayReason(e.target.value)}
                        placeholder="State reason: Rain stoppage, material supply bottleneck, utility clash, etc."
                        className="w-full px-2.5 py-1.5 rounded border border-rose-300 bg-white"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowUpdateModal(false)}
                      className="px-3 py-1.5 rounded bg-white border border-gray-300 font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingUpdate}
                      className="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold transition-colors shadow disabled:opacity-50"
                    >
                      {submittingUpdate ? 'Submitting...' : 'Record to Timeline'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {updates.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No historical updates recorded for this project yet.</p>
            ) : (
              <div className="space-y-4">
                {updates.map(update => (
                  <div key={update.id} className="border-l-2 border-[var(--neutral-200)] pl-4 py-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-[var(--navy-800)]">{update.title}</span>
                      <span className="text-xs text-[var(--neutral-400)] whitespace-nowrap">
                        {format(new Date(update.createdAt), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--neutral-500)] leading-relaxed">
                      {update.description}
                    </p>
                    {update.delayReason && (
                      <div className="mt-1 p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800">
                        <strong>Delay Reason:</strong> {update.delayReason}
                      </div>
                    )}
                    <p className="text-xs text-[var(--neutral-400)] mt-1">
                      — {update.authorName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Budget */}
          {project.budgetLakhs && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-[var(--navy-700)] mb-2 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[var(--teal-600)]" />
                Estimated Budget
              </h3>
              <p className="text-2xl font-bold text-[var(--navy-900)]">
                ₹{project.budgetLakhs.toLocaleString()} <span className="text-sm font-normal text-[var(--neutral-500)]">Lakhs</span>
              </p>
            </div>
          )}

          {/* Coordination Alerts */}
          {alerts.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-[var(--navy-700)] mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500" />
                Coordination Alerts
              </h3>
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div key={alert.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <SeverityBadge severity={alert.severity} />
                      <span className="text-xs text-amber-700">Score: {alert.score}</span>
                    </div>
                    <ul className="text-xs text-amber-800 space-y-1 list-none">
                      {alert.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {r.description}
                        </li>
                      ))}
                    </ul>
                    {alert.decisionNotes && (
                      <p className="text-xs text-amber-700 mt-2 pt-2 border-t border-amber-200">
                        <strong>Decision:</strong> {alert.decisionNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Projects */}
          {relatedProjects.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-[var(--navy-700)] mb-3 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-500" />
                Related Projects on This Road
              </h3>
              <div className="space-y-2">
                {relatedProjects.map(rp => (
                  <Link
                    key={rp.id}
                    to={`/projects/${rp.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--neutral-50)] transition-colors no-underline"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--navy-800)] truncate">{rp.title}</p>
                      <p className="text-xs text-[var(--neutral-500)]">{rp.contractor}</p>
                    </div>
                    <StatusBadge status={rp.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Citizen Reports */}
          {reports.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-[var(--navy-700)] mb-3 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-red-400" />
                Citizen Reports ({reports.length})
              </h3>
              <div className="space-y-2">
                {reports.map(rpt => (
                  <div key={rpt.id} className="p-2.5 rounded-lg bg-[var(--neutral-50)]">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-mono text-[var(--neutral-400)]">{rpt.referenceId}</span>
                      <ReportStatusBadge status={rpt.status} />
                    </div>
                    <p className="text-sm font-medium text-[var(--navy-800)] line-clamp-1">{rpt.title}</p>
                    <p className="text-xs text-[var(--neutral-500)] mt-0.5">
                      {formatDistanceToNow(new Date(rpt.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Demo disclosure */}
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> This project record is synthetic demonstration data
              created for the CivicLens hackathon prototype. It does not represent
              an actual municipal project.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// -- Helper components --

function DetailItem({ icon: Icon, label, value }: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-[var(--neutral-50)] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-[var(--neutral-400)]" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--neutral-400)] font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-[var(--navy-800)] font-medium mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function DateRow({ label, date, crossed, highlight }: {
  label: string
  date: string
  crossed?: boolean
  highlight?: 'amber' | 'green'
}) {
  const highlightClasses = {
    amber: 'text-amber-700 font-semibold',
    green: 'text-green-700 font-semibold',
  }
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--neutral-50)]">
      <span className="text-sm text-[var(--neutral-600)]">{label}</span>
      <span className={`text-sm ${
        crossed ? 'line-through text-[var(--neutral-400)]' :
        highlight ? highlightClasses[highlight] :
        'text-[var(--navy-800)] font-medium'
      }`}>
        {format(new Date(date), 'dd MMM yyyy')}
      </span>
    </div>
  )
}
