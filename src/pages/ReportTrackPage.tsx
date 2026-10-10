import { useState, useEffect } from 'react'
import { useSearchParams, useParams, Link } from 'react-router-dom'
import {
  Search, FileText, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, Shield, MessageSquare, MapPin, ExternalLink,
  ChevronRight, Calendar, Filter
} from 'lucide-react'
import { dataRepository } from '../services/dataRepository'
import { EvidencePhoto } from '../components/EvidencePhoto'
import type { Report, ReportStatus } from '../types'
import { REPORT_STATUS_LABELS, REPORT_CATEGORY_LABELS } from '../types'
import { format } from 'date-fns'

const STATUS_STEPS: { key: ReportStatus; label: string }[] = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'in_review', label: 'In Review' },
  { key: 'resolved', label: 'Resolved' },
]

export function ReportTrackPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { id: routeId } = useParams<{ id?: string }>()
  const refFromQuery = searchParams.get('ref') || ''

  const [searchQuery, setSearchQuery] = useState(refFromQuery || routeId || '')
  const [reports, setReports] = useState<Report[]>([])
  const [activeReport, setActiveReport] = useState<Report | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    async function loadReports() {
      try {
        const all = await dataRepository.getReports()
        setReports(all)
        setLoadError(null)

        const target = refFromQuery || routeId
        if (target) {
          const found = all.find(
            r => r.referenceId.toLowerCase() === target.toLowerCase() || r.id === target
          )
          if (found) setActiveReport(found)
        } else if (all.length > 0) {
          setActiveReport(all[0])
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Could not load reports.')
      }
    }
    loadReports()
  }, [refFromQuery, routeId])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    const found = reports.find(
      r => r.referenceId.toLowerCase() === searchQuery.trim().toLowerCase() ||
           r.id.toLowerCase() === searchQuery.trim().toLowerCase() ||
           r.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
    if (found) {
      setActiveReport(found)
      setSearchParams({ ref: found.referenceId })
    }
  }

  const selectReport = (report: Report) => {
    setActiveReport(report)
    setSearchParams({ ref: report.referenceId })
  }

  const filteredReports = reports.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    return true
  })

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'resolved':
        return 'bg-[var(--teal-soft)] text-[var(--teal)] border-[var(--teal)]/30'
      case 'escalated':
        return 'bg-[#FFE9EA] text-[#D13B41] border-[#FF5A5F]/30'
      case 'in_review':
        return 'bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]/20'
      case 'acknowledged':
        return 'bg-[#FFF4DB] text-[#9A6200] border-[#FFB020]/30'
      default:
        return 'bg-[#F8FAFC] text-[var(--muted)] border-[var(--border)]'
    }
  }

  const isStepCompleted = (stepKey: ReportStatus, currentStatus: ReportStatus) => {
    const order = ['submitted', 'acknowledged', 'in_review', 'resolved']
    const stepIdx = order.indexOf(stepKey)
    const currentIdx = order.indexOf(currentStatus === 'escalated' ? 'in_review' : currentStatus)
    return currentIdx >= stepIdx
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {loadError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Could not load reports: {loadError}
        </div>
      )}
      {/* Header & Search Bar (Fresh Civic White Card) */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--teal)]/20">
                Ground Reality Audit
              </span>
              <span className="text-xs text-[var(--muted)]">• Municipal Grievance Tracking</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] font-heading mt-1.5">
              Citizen Grievance & Tracking Portal
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
              Track field verification, engineer inspection notes, and resolution actions for any reported road issue.
            </p>
          </div>

          <Link
            to="/report"
            className="btn-primary text-xs sm:text-sm flex items-center gap-2 self-start md:self-center no-underline shrink-0"
          >
            <FileText className="w-4 h-4" />
            Lodge New Report
          </Link>
        </div>

        {/* Search input */}
        <form onSubmit={handleSearch} className="flex gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search by Reference ID (e.g. GRV-2026-8821), keyword, or corridor name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            className="btn-primary text-xs px-5"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List of Reports */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
              Citizen Filings ({filteredReports.length})
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold rounded-lg border border-[var(--border)] bg-white text-[var(--text)] px-2.5 py-1 focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_review">In Review</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {filteredReports.map(r => {
              const isSelected = activeReport?.id === r.id
              return (
                <div
                  key={r.id}
                  onClick={() => selectReport(r)}
                  className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white border-[var(--primary)] shadow-md ring-2 ring-[var(--primary)]/20'
                      : 'bg-white border-[var(--border)] hover:border-[var(--primary)] hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-[var(--primary)]">{r.referenceId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(r.status)}`}>
                      {REPORT_STATUS_LABELS[r.status]}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-[var(--text)] font-heading mt-1.5 leading-tight">
                    {r.title}
                  </h3>

                  <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] mt-1">
                    <MapPin className="w-3 h-3 text-[var(--muted)] shrink-0" />
                    <span className="truncate">{r.locationDescription}</span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted)]">
                    <span>{REPORT_CATEGORY_LABELS[r.category]}</span>
                    <span>{format(new Date(r.createdAt), 'dd MMM yyyy')}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Selected Report Detail & Lifecycle Timeline */}
        <div className="lg:col-span-7">
          {activeReport ? (
            <div className="bg-white rounded-xl border border-[var(--border)] p-6 shadow-sm space-y-6 sticky top-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[var(--primary)]">
                      {activeReport.referenceId}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusBadge(activeReport.status)}`}>
                      {REPORT_STATUS_LABELS[activeReport.status]}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text)] font-heading mt-2">
                    {activeReport.title}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>{activeReport.locationDescription}</span>
                  </div>
                </div>

                <div className="text-right text-xs text-[var(--muted)]">
                  <span>Filed:</span>
                  <div className="font-semibold text-[var(--text)]">{format(new Date(activeReport.createdAt), 'dd MMM yyyy')}</div>
                </div>
              </div>

              {/* Progress Milestones Tracker */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Investigation & Resolution Pipeline
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {STATUS_STEPS.map((step, idx) => {
                    const done = isStepCompleted(step.key, activeReport.status)
                    const isCurrent = activeReport.status === step.key
                    return (
                      <div
                        key={step.key}
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          done
                            ? 'bg-[var(--teal-soft)] border-[var(--teal)]/40 text-[var(--teal)]'
                            : 'bg-[#F8FAFC] border-[var(--border)] text-[var(--muted)]'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full flex items-center justify-center mx-auto mb-1 text-[10px] font-bold">
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-[var(--teal)]" />
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-[var(--border)] flex items-center justify-center">{idx + 1}</span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold block">{step.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Citizen Description */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Ground Issue Observation
                </span>
                <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[var(--border)] text-xs text-[var(--text)] leading-relaxed">
                  {activeReport.description}
                </div>
              </div>

              {/* Associated Project Dossier (if linked) */}
              {activeReport.projectId && (
                <div className="p-3.5 rounded-lg bg-[var(--primary-soft)] border border-[var(--primary)]/20 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] block">
                      Linked Capital Work Order
                    </span>
                    <span className="font-bold text-[var(--text)]">Work Order ID: {activeReport.projectId}</span>
                  </div>
                  <Link
                    to={`/projects/${activeReport.projectId}`}
                    className="inline-flex items-center gap-1 font-bold text-[var(--primary)] hover:underline"
                  >
                    View Project Dossier <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {/* Photo Evidence (if any) */}
              {activeReport.photoUrl && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Submitted Evidence Photo
                  </span>
                  <EvidencePhoto
                    path={activeReport.photoUrl}
                    alt="Citizen evidence photo"
                    className="w-full max-h-56 object-cover rounded-xl border border-[var(--border)]"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-[var(--border)] p-8">
              <FileText className="w-12 h-12 text-[var(--muted)]/40 mx-auto mb-2" />
              <h3 className="font-bold text-[var(--text)] font-heading">Select a Grievance</h3>
              <p className="text-xs text-[var(--muted)]">Click any reference from the left panel to inspect audit status.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
