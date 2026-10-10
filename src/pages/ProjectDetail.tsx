import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Calendar, Building2, User, Tag,
  DollarSign, TrendingUp, Clock, AlertTriangle, CheckCircle2,
  FileText, Layers, ChevronRight, ExternalLink, History, PlusCircle, X,
  ShieldCheck, HardHat, Camera, AlertCircle, Upload
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { dataRepository } from '../services/dataRepository'
import { useAuth } from '../context/AuthContext'
import { validateProgressUpdate } from '../services/projectValidation'
import type { Project, Department, ProjectUpdate, Milestone, Report, CoordinationAlert, ProjectStatus } from '../types'
import { PROJECT_CATEGORY_LABELS, PROJECT_STATUS_LABELS } from '../types'
import { StatusBadge, ConfidenceBadge, SeverityBadge, ReportStatusBadge } from '../components/ui/StatusBadge'
import { LoadingState, ErrorState } from '../components/ui/SharedStates'
import { StepAccordion } from '../components/ui/StepAccordion'

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

    setSubmittingUpdate(true)
    try {
      const created = await dataRepository.addProjectUpdate(project.id, {
        title: updateTitle.trim() || `Progress updated to ${newProgress}%`,
        description: updateNotes.trim() || `Field engineer updated status to ${newStatus}.`,
        type: 'progress',
        authorId: user?.id || 'officer-field',
        authorName: user?.displayName || 'Authorized Engineer',
        previousValue: `${project.progressPercent}% (${project.status})`,
        newValue: `${newProgress}% (${newStatus})`,
        delayReason: newStatus === 'delayed' ? updateDelayReason.trim() : undefined,
      })

      // Update local project model
      const updatedProject = await dataRepository.updateProject(project.id, {
        progressPercent: newProgress,
        status: newStatus,
        confidenceIndicator: newStatus === 'delayed' ? 'delayed' : 'on_track',
      })

      if (updatedProject) {
        setProject(updatedProject)
      }
      setUpdates(prev => [created, ...prev])
      setShowUpdateModal(false)
      setUpdateTitle('')
      setUpdateNotes('')
      setUpdateDelayReason('')
      setToastMsg('Project timeline & progress update saved.')
    } catch (err: any) {
      setUpdateError(err?.message || 'Failed to submit progress update.')
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
          <Link to="/projects" className="btn-primary no-underline">
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#64748B]">
        <Link to="/projects" className="hover:text-[#2F6BFF] no-underline text-[#64748B] flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" /> Permits Explorer
        </Link>
        <ChevronRight className="w-3 h-3 text-[#94A3B8]" />
        <span className="font-semibold text-[#1E293B] truncate">{project.title}</span>
      </nav>

      {/* Hero Header Card */}
      <div className="bg-white border border-[#E3EAF2] rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono font-bold text-[#64748B] bg-[#F6F9FC] border border-[#E3EAF2] px-2 py-0.5 rounded">
                {project.id.toUpperCase()}
              </span>
              <span className="text-[10px] font-bold text-[#2F6BFF] bg-[#EAF1FF] px-2 py-0.5 rounded">
                Ward: {project.ward}
              </span>
            </div>
            <h1 className="font-['Plus_Jakarta_Sans'] text-xl sm:text-2xl font-extrabold text-[#1E293B] leading-tight mb-1.5">
              {project.title}
            </h1>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {project.purpose}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <StatusBadge status={project.status} />
            <ConfidenceBadge indicator={project.confidenceIndicator} />
          </div>
        </div>

        {/* Key details strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3.5 border-t border-[#F1F5F9]">
          <DetailItem
            icon={Building2}
            label="Department"
            value={
              <span className="flex items-center gap-1.5">
                {department && (
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: department.color }} />
                )}
                {department?.name || 'Municipal Agency'}
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
            label="Road Corridor"
            value={`${project.road}, ${project.locality}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Progress Card */}
          {(project.status === 'in_progress' || project.status === 'delayed') && (
            <div className="bg-white border border-[#E3EAF2] rounded-xl p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#1E293B] flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#12B5A6]" />
                  <span>Execution Progress</span>
                </h2>
                <span className="text-[11px] text-[#64748B]">
                  Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="font-['Plus_Jakarta_Sans'] text-3xl font-extrabold text-[#1E293B]">
                  {project.progressPercent}%
                </span>
                <span className={`text-xs font-semibold ${project.status === 'delayed' ? 'text-[#D13B41]' : 'text-[#12B5A6]'}`}>
                  {project.status === 'delayed' ? 'Slippage Flagged' : 'On Schedule'}
                </span>
              </div>
              <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    project.status === 'delayed' ? 'bg-[#FF5A5F]' : 'bg-[#12B5A6]'
                  }`}
                  style={{ width: `${project.progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* 3-Tier Auditor Verification Workflow Card */}
          <div className="bg-white border-2 border-[#2F6BFF]/20 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#1E293B] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2F6BFF]" />
                <span>Auditor &amp; Contractor Lifecycle Action</span>
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF1FF] text-[#2F6BFF]">
                3-Tier Verification
              </span>
            </div>

            {project.status === 'pending_audit' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <p className="text-xs text-amber-900 font-semibold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Contractor marked work 100% finished. Awaiting Auditor Approval.</span>
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await dataRepository.updateProject(project.id, {
                      status: 'completed',
                      progressPercent: 100,
                      actualEndDate: new Date().toISOString().split('T')[0]
                    }, 'Auditor verified and approved site completion')
                    window.location.reload()
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border-none cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Auditor: Approve &amp; Mark Work Completed</span>
                </button>
              </div>
            ) : project.status === 'completed' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Auditor Verified &amp; Approved. Cascaded across municipal records.</span>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <p className="text-xs text-slate-600 font-medium">
                  Contractor completes physical digging/construction and submits for municipal auditor review.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await dataRepository.updateProject(project.id, {
                      status: 'pending_audit',
                      progressPercent: 100
                    }, 'Contractor submitted work for Auditor Verification')
                    window.location.reload()
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border-none cursor-pointer shadow-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>Contractor: Submit Work for Auditor Verification</span>
                </button>
              </div>
            )}
          </div>

          {/* Dates and Deadlines (Immutable Baseline Locked) */}
          <div className="bg-white border border-[#E3EAF2] rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#1E293B] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2F6BFF]" />
                <span>Contractual Timeline &amp; Deadlines</span>
              </h2>
              <span className="badge bg-[#EAF1FF] text-[#2F6BFF] text-[10px] py-0 px-2 font-bold">
                Baseline Locked
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <DateRow label="Excavation Start Date" date={project.startDate} />
              <DateRow
                label="Original Baseline Deadline"
                date={project.originalEndDate}
                crossed={hasRevision}
              />
              {hasRevision && (
                <DateRow
                  label="Revised Freeze Date"
                  date={project.revisedEndDate!}
                  highlight="amber"
                />
              )}
              {project.actualEndDate && (
                <DateRow
                  label="Actual Completion Date"
                  date={project.actualEndDate}
                  highlight="green"
                />
              )}
            </div>

            {/* Delay reasons */}
            {deadlineRevisions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                <h3 className="text-xs font-bold text-[#1E293B] mb-2 flex items-center gap-1">
                  <History className="w-3.5 h-3.5 text-[#FFB020]" />
                  <span>Immutable Revision Audit Log</span>
                </h3>
                <div className="space-y-2">
                  {deadlineRevisions.map(rev => (
                    <div key={rev.id} className="bg-[#FFF4DB] border border-[#FFB020]/30 rounded-lg p-2.5 text-xs text-[#9A6200]">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-[11px] text-[#1E293B]">{rev.title}</span>
                        <span className="text-[10px] text-[#64748B]">
                          {format(new Date(rev.createdAt), 'dd MMM yyyy')}
                        </span>
                      </div>
                      {rev.previousValue && rev.newValue && (
                        <p className="text-[11px] text-[#9A6200] mb-0.5">
                          <span className="line-through">{format(new Date(rev.previousValue), 'dd MMM yyyy')}</span>
                          {' → '}
                          <span className="font-bold">{format(new Date(rev.newValue), 'dd MMM yyyy')}</span>
                        </p>
                      )}
                      {rev.delayReason && (
                        <p className="text-[11px] mt-0.5">
                          <strong>Justification:</strong> {rev.delayReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Milestones Checklist */}
          {milestones.length > 0 && (
            <div className="bg-white border border-[#E3EAF2] rounded-xl p-4 shadow-2xs">
              <h2 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#1E293B] mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#12B5A6]" />
                <span>Verification Milestones</span>
              </h2>
              <div className="space-y-0">
                {milestones.map((ms, index) => (
                  <div key={ms.id} className="flex gap-2.5">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 ${
                        ms.status === 'completed' ? 'bg-[#12B5A6] border-[#12B5A6]' :
                        ms.status === 'overdue' ? 'bg-[#FF5A5F] border-[#FF5A5F]' :
                        'bg-white border-[#CBD5E1]'
                      }`} />
                      {index < milestones.length - 1 && (
                        <div className={`w-0.5 flex-1 min-h-[1.5rem] ${
                          ms.status === 'completed' ? 'bg-[#12B5A6]/40' : 'bg-[#E3EAF2]'
                        }`} />
                      )}
                    </div>
                    <div className="pb-3 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-[#1E293B]">{ms.title}</span>
                        {ms.status === 'overdue' && (
                          <span className="badge delayed text-[10px] py-0 px-1.5">Overdue</span>
                        )}
                        {ms.status === 'completed' && (
                          <span className="badge completed text-[10px] py-0 px-1.5">Completed</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-0.5">
                        Target: {format(new Date(ms.targetDate), 'dd MMM yyyy')}
                        {ms.completedDate && (
                          <> • Done: {format(new Date(ms.completedDate), 'dd MMM yyyy')}</>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Update History Card */}
          <div className="bg-white border border-[#E3EAF2] rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#1E293B] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#2F6BFF]" />
                <span>Field Progress Audit Trail ({updates.length})</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setNewProgress(project.progressPercent)
                  setNewStatus(project.status)
                  setShowUpdateModal(true)
                }}
                className="btn-primary text-xs py-1.5 px-3"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Post Progress Update</span>
              </button>
            </div>

            {/* Modal: Post Progress Update */}
            {showUpdateModal && (
              <div className="mb-4 p-3.5 rounded-xl bg-[#EAF1FF] border border-[#2F6BFF]/30 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#2F6BFF]/20 pb-1.5">
                  <span className="font-bold uppercase tracking-wider text-[#2F6BFF] text-[11px]">
                    Submit Official Progress Record
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowUpdateModal(false)}
                    className="p-1 text-[#64748B] hover:text-[#1E293B]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {updateError && (
                  <div className="p-2 rounded bg-[#FFE9EA] border border-[#FF5A5F]/30 text-[#D13B41] font-semibold">
                    {updateError}
                  </div>
                )}

                <form onSubmit={handlePostUpdate} className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <div className="flex justify-between font-semibold text-[#1E293B] mb-1 text-[11px]">
                        <span>Progress Percentage</span>
                        <span className="text-[#2F6BFF] font-bold">{newProgress}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={newProgress}
                        onChange={(e) => setNewProgress(parseInt(e.target.value))}
                        className="w-full accent-[#2F6BFF]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#1E293B] mb-1 text-[11px]">
                        Operational Status
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as ProjectStatus)}
                        className="w-full px-2 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-medium"
                      >
                        <option value="in_progress">In Progress</option>
                        <option value="delayed">Delayed</option>
                        <option value="completed">Completed (100%)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1E293B] mb-1 text-[11px]">
                      Update Title / Headline
                    </label>
                    <input
                      type="text"
                      value={updateTitle}
                      onChange={(e) => setUpdateTitle(e.target.value)}
                      placeholder="e.g. Asphalting completed on Northbound lane"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1E293B] mb-1 text-[11px]">
                      Field Notes &amp; Observations
                    </label>
                    <textarea
                      rows={2}
                      value={updateNotes}
                      onChange={(e) => setUpdateNotes(e.target.value)}
                      placeholder="Describe work completed, machinery on site, or upcoming tasks."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs"
                    />
                  </div>

                  {newStatus === 'delayed' && (
                    <div>
                      <label className="block font-semibold text-[#D13B41] mb-1 text-[11px]">
                        Delay Reason &amp; Root Cause *
                      </label>
                      <input
                        type="text"
                        required
                        value={updateDelayReason}
                        onChange={(e) => setUpdateDelayReason(e.target.value)}
                        placeholder="State reason: Rain stoppage, material supply bottleneck, utility clash, etc."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#FF5A5F] bg-white text-xs text-[#D13B41]"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowUpdateModal(false)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] font-semibold text-[#64748B] hover:text-[#1E293B] text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingUpdate}
                      className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
                    >
                      {submittingUpdate ? 'Submitting...' : 'Record to Timeline'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {updates.length === 0 ? (
              <p className="text-xs text-[#64748B] italic">No historical updates recorded for this project yet.</p>
            ) : (
              <div className="space-y-3">
                {updates.map(update => (
                  <div key={update.id} className="border-l-2 border-[#E3EAF2] pl-3 py-0.5">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-bold text-[#1E293B]">{update.title}</span>
                      <span className="text-[10px] text-[#64748B] whitespace-nowrap">
                        {format(new Date(update.createdAt), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      {update.description}
                    </p>
                    {update.delayReason && (
                      <div className="mt-1 p-2 rounded-lg bg-[#FFF4DB] border border-[#FFB020]/30 text-xs text-[#9A6200]">
                        <strong>Delay Reason:</strong> {update.delayReason}
                      </div>
                    )}
                    <p className="text-[10px] text-[#64748B] mt-0.5 font-medium">
                      — {update.authorName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scrolltide-inspired Step Accordion for Resident Ground Reports & Uploaded Photo Evidence */}
          <div id="citizen-fieldwork" className="mt-6 scroll-mt-20">
            <StepAccordion
              reports={reports}
              projectId={project.id}
              projectTitle={project.title}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Budget */}
          {project.budgetLakhs && (
            <div className="bg-white border border-[#E3EAF2] rounded-xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                Sanctioned Budget
              </span>
              <p className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#1E293B]">
                ₹{project.budgetLakhs.toLocaleString()} <span className="text-xs font-normal text-[#64748B]">Lakhs</span>
              </p>
            </div>
          )}

          {/* Coordination Alerts */}
          {alerts.length > 0 && (
            <div className="border border-[#F0386B]/30 rounded-xl overflow-hidden shadow-2xs">
              <div className="h-1.5 clash-hatch border-b border-[#F0386B]/20"></div>
              <div className="p-3.5 bg-[#FFE6EE]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-['Plus_Jakarta_Sans'] text-xs font-bold text-[#C41F4F] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Cross-Agency Clashes ({alerts.length})</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {alerts.map(alert => (
                    <div key={alert.id} className="bg-white/90 border border-[#F0386B]/20 rounded-lg p-2.5 text-xs">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-[10px] font-bold text-[#C41F4F]">Clash Score: {alert.score}/100</span>
                      </div>
                      <ul className="text-[11px] text-[#64748B] space-y-1 list-none pl-0">
                        {alert.reasons.map((r, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-[#C41F4F]">•</span>
                            <span>{r.description}</span>
                          </li>
                        ))}
                      </ul>
                      {alert.decisionNotes && (
                        <p className="text-[10px] text-[#1E293B] mt-1 pt-1 border-t border-[#E3EAF2]">
                          <strong>Decision:</strong> {alert.decisionNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Related Projects */}
          {relatedProjects.length > 0 && (
            <div className="bg-white border border-[#E3EAF2] rounded-xl p-4 shadow-2xs">
              <h3 className="font-['Plus_Jakarta_Sans'] text-xs font-bold text-[#1E293B] mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#2F6BFF]" />
                <span>Other Works on {project.road}</span>
              </h3>
              <div className="space-y-1.5">
                {relatedProjects.map(rp => (
                  <Link
                    key={rp.id}
                    to={`/projects/${rp.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F6F9FC] border border-transparent hover:border-[#E3EAF2] transition-colors no-underline"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#1E293B] truncate">{rp.title}</p>
                      <p className="text-[10px] text-[#64748B]">{rp.contractor}</p>
                    </div>
                    <StatusBadge status={rp.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Citizen Reports */}
          {reports.length > 0 && (
            <div className="bg-white border border-[#E3EAF2] rounded-xl p-4 shadow-2xs">
              <h3 className="font-['Plus_Jakarta_Sans'] text-xs font-bold text-[#1E293B] mb-2 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#12B5A6]" />
                <span>Citizen Reports ({reports.length})</span>
              </h3>
              <div className="space-y-1.5">
                {reports.map(rpt => (
                  <div key={rpt.id} className="p-2 rounded-lg bg-[#F6F9FC] border border-[#E3EAF2]">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] font-mono text-[#64748B] font-bold">{rpt.referenceId}</span>
                      <ReportStatusBadge status={rpt.status} />
                    </div>
                    <p className="text-xs font-medium text-[#1E293B] line-clamp-1">{rpt.title}</p>
                    <p className="text-[10px] text-[#64748B]">
                      {formatDistanceToNow(new Date(rpt.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))}
                <a
                  href="#citizen-fieldwork"
                  className="mt-2 pt-2 border-t border-[#F1F5F9] text-[11px] font-bold text-[#2F6BFF] hover:underline flex items-center justify-between no-underline"
                >
                  <span>Inspect Photos in Step Accordion</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E293B] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs border border-[#334155] animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#12B5A6]" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  )
}

function DetailItem({ icon: Icon, label, value }: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-lg bg-[#F6F9FC] border border-[#E3EAF2] flex items-center justify-center shrink-0 mt-0.5 text-[#2F6BFF]">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">{label}</p>
        <div className="text-xs text-[#1E293B] font-medium mt-0.5">{value}</div>
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
    amber: 'text-[#9A6200] font-bold bg-[#FFF4DB] px-2 py-0.5 rounded',
    green: 'text-[#0E7A55] font-bold bg-[#E1F8EF] px-2 py-0.5 rounded',
  }
  return (
    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#F6F9FC] border border-[#E3EAF2]">
      <span className="text-xs text-[#64748B]">{label}</span>
      <span className={`text-xs ${
        crossed ? 'line-through text-[#94A3B8]' :
        highlight ? highlightClasses[highlight] :
        'text-[#1E293B] font-semibold'
      }`}>
        {format(new Date(date), 'dd MMM yyyy')}
      </span>
    </div>
  )
}
