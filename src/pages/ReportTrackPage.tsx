import { useState, useEffect } from 'react'
import { useSearchParams, useParams, Link } from 'react-router-dom'
import {
  Search, FileText, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, Shield, MessageSquare, MapPin, ExternalLink,
  ChevronRight, Calendar, Filter
} from 'lucide-react'
import { dataRepository } from '../services/dataRepository'
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

  useEffect(() => {
    async function loadReports() {
      const all = await dataRepository.getReports()
      setReports(all)

      const target = refFromQuery || routeId
      if (target) {
        const found = all.find(
          r => r.referenceId.toLowerCase() === target.toLowerCase() || r.id === target
        )
        if (found) {
          setActiveReport(found)
        }
      } else if (all.length > 0 && !activeReport) {
        setActiveReport(all[0])
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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
      case 'escalated':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
      case 'in_review':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400'
      case 'acknowledged':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const isStepCompleted = (stepKey: ReportStatus, currentStatus: ReportStatus) => {
    const order = ['submitted', 'acknowledged', 'in_review', 'resolved']
    const stepIdx = order.indexOf(stepKey)
    const currentIdx = order.indexOf(currentStatus === 'escalated' ? 'in_review' : currentStatus)
    return currentIdx >= stepIdx
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Search Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <Clock className="w-4 h-4" />
          Public Grievance Transparency Tracker
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Track Ground-Truth Reports
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
          Enter your reference code to inspect real-time officer response notes, escalation audits, and repair resolutions.
        </p>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. CL-2026-0001 or search keyword..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 font-semibold text-sm transition-colors text-white shadow"
          >
            Track Report
          </button>
        </form>
      </div>

      {/* Main Layout: Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Reports Feed / Filter */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Community Reports ({filteredReports.length})
            </h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_review">In Review</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {filteredReports.map(r => {
              const isSelected = activeReport?.id === r.id
              return (
                <div
                  key={r.id}
                  onClick={() => selectReport(r)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-500 ring-2 ring-indigo-500/10'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {r.referenceId}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(r.status)}`}>
                      {REPORT_STATUS_LABELS[r.status]}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white mt-1.5 line-clamp-1">
                    {r.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{r.locationDescription}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                    <span>{REPORT_CATEGORY_LABELS[r.category]}</span>
                    <span>{format(new Date(r.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Selected Report Audit Detail */}
        <div className="lg:col-span-7">
          {activeReport ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 space-y-6 shadow-sm sticky top-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-700/60 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      {activeReport.referenceId}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Filed on {format(new Date(activeReport.createdAt), 'MMMM dd, yyyy • hh:mm a')}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-2">
                    {activeReport.title}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{activeReport.locationDescription}</span>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-lg text-xs font-bold border uppercase tracking-wider self-start ${getStatusBadge(activeReport.status)}`}>
                  {REPORT_STATUS_LABELS[activeReport.status]}
                </span>
              </div>

              {/* Status Progression Bar */}
              <div className="py-2">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-3">
                  Resolution Progress Timeline
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {STATUS_STEPS.map((step) => {
                    const completed = isStepCompleted(step.key, activeReport.status)
                    return (
                      <div key={step.key} className="text-center">
                        <div
                          className={`h-2 rounded-full mb-1.5 transition-colors ${
                            completed ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-gray-100 dark:bg-gray-700'
                          }`}
                        />
                        <span className={`text-[11px] font-semibold block truncate ${
                          completed ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Citizen Observation Details */}
              <div className="space-y-3 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Citizen Ground Observation
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {activeReport.description}
                </p>

                {activeReport.photoUrl && (
                  <div className="mt-3">
                    <span className="text-xs font-semibold text-gray-500 block mb-1.5">Submitted Photo Evidence:</span>
                    <img
                      src={activeReport.photoUrl}
                      alt="Grievance evidence"
                      className="rounded-lg max-h-56 w-auto object-cover border border-gray-200 dark:border-gray-700"
                    />
                  </div>
                )}
              </div>

              {/* Officer Official Response */}
              <div className="space-y-2 border-l-4 border-indigo-500 pl-4 py-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Official Department Action & Response
                  </span>
                </div>
                {activeReport.officerResponse ? (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-800 dark:text-gray-200 italic bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                      "{activeReport.officerResponse}"
                    </p>
                    <div className="text-[11px] text-gray-400 flex items-center gap-3 pt-1">
                      {activeReport.acknowledgedAt && (
                        <span>Acknowledged: {format(new Date(activeReport.acknowledgedAt), 'MMM dd, yyyy')}</span>
                      )}
                      {activeReport.resolvedAt && (
                        <span className="text-emerald-600 font-semibold">Resolved: {format(new Date(activeReport.resolvedAt), 'MMM dd, yyyy')}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-900/40">
                    Awaiting formal officer review. Report has been auto-flagged for the assigned area engineer.
                  </div>
                )}
              </div>

              {/* Linked project badge if exists */}
              {activeReport.projectId && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Linked to Capital Project:</span>
                  <Link
                    to={`/projects/${activeReport.projectId}`}
                    className="inline-flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline gap-1"
                  >
                    View Project Dossier <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
              <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 dark:text-white">No Report Selected</h3>
              <p className="text-xs text-gray-500 mt-1">Select a report from the list on the left or search by tracking reference code.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
