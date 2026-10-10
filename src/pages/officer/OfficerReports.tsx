import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageSquare, CheckCircle2, Clock, AlertTriangle, Shield,
  ArrowRight, Filter, Send, MapPin, ExternalLink, Image
} from 'lucide-react'
import { dataRepository } from '../../services/dataRepository'
import { EvidencePhoto } from '../../components/EvidencePhoto'
import type { Report, ReportStatus, Project } from '../../types'
import { REPORT_STATUS_LABELS, REPORT_CATEGORY_LABELS } from '../../types'
import { format } from 'date-fns'

export function OfficerReports() {
  const [reports, setReports] = useState<Report[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [officerResponseText, setOfficerResponseText] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastIsError, setToastIsError] = useState(false)

  useEffect(() => {
    async function load() {
      const [r, p] = await Promise.all([
        dataRepository.getReports(),
        dataRepository.getProjects(),
      ])
      setReports(r)
      setProjects(p)
      if (r.length > 0 && !selectedReport) {
        setSelectedReport(r[0])
        setOfficerResponseText(r[0].officerResponse || '')
      }
    }
    load().catch(err => {
      setToastIsError(true)
      setToastMessage(`Could not load reports: ${err instanceof Error ? err.message : 'Unknown error'}`)
    })
  }, [])

  const handleSelect = (r: Report) => {
    setSelectedReport(r)
    setOfficerResponseText(r.officerResponse || '')
  }

  const handleUpdate = async (status: ReportStatus) => {
    if (!selectedReport) return
    setIsUpdating(true)
    try {
      const updated = await dataRepository.updateReportStatus(
        selectedReport.id,
        status,
        officerResponseText.trim() || undefined
      )
      if (updated) {
        setSelectedReport(updated)
        setReports(prev => prev.map(item => item.id === updated.id ? updated : item))
        setToastIsError(false)
        setToastMessage(`Report status updated to ${REPORT_STATUS_LABELS[status]}`)
        setTimeout(() => setToastMessage(null), 3000)
      } else {
        throw new Error('Report was not found.')
      }
    } catch (err) {
      setToastIsError(true)
      setToastMessage(`Could not update report: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const filteredReports = reports.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    return true
  })

  const linkedProject = projects.find(p => p.id === selectedReport?.projectId)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm border border-gray-700 animate-fade-in">
          {toastIsError ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-rose-100 text-rose-800">
              Citizen Grievance Resolution
            </span>
            <span className="text-xs text-gray-500">• Ground Verification Queue</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
            Citizen Ground-Truth Inbox
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 max-w-xl">
            Triage public complaints, assign emergency repair teams, and provide official accountability updates.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-800 px-3 py-1.5"
          >
            <option value="all">All ({reports.length})</option>
            <option value="submitted">Submitted</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_review">In Review</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Grid: List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Reports Feed */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Inbox Items ({filteredReports.length})
            </span>
            <span className="text-xs text-gray-400">Sorted by newest</span>
          </div>

          <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {filteredReports.map(r => {
              const isSelected = selectedReport?.id === r.id
              return (
                <div
                  key={r.id}
                  onClick={() => handleSelect(r)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50/60 shadow-sm ring-2 ring-teal-400/20'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600">
                      {r.referenceId}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      r.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                      r.status === 'escalated' ? 'bg-rose-100 text-rose-800' :
                      r.status === 'acknowledged' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {REPORT_STATUS_LABELS[r.status]}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-gray-900 mt-2 line-clamp-1">
                    {r.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    <span className="truncate">{r.locationDescription}</span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span>{REPORT_CATEGORY_LABELS[r.category]}</span>
                    <span>{format(new Date(r.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected Report Inspection & Resolution Form */}
        <div className="lg:col-span-7">
          {selectedReport ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-sm sticky top-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {selectedReport.referenceId}
                    </span>
                    <span className="text-xs text-gray-400">
                      Received {format(new Date(selectedReport.createdAt), 'MMM dd, yyyy • hh:mm a')}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mt-2">
                    {selectedReport.title}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{selectedReport.locationDescription}</span>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                  selectedReport.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                  selectedReport.status === 'escalated' ? 'bg-rose-100 text-rose-800' :
                  selectedReport.status === 'acknowledged' ? 'bg-amber-100 text-amber-800' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {REPORT_STATUS_LABELS[selectedReport.status]}
                </span>
              </div>

              {/* Citizen Description */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-gray-400">Grievance Narrative</span>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {selectedReport.description}
                </p>

                {selectedReport.photoUrl && (
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-gray-500 block mb-1">Attached Evidence:</span>
                    <EvidencePhoto
                      path={selectedReport.photoUrl}
                      alt="Citizen evidence"
                      className="rounded-lg max-h-48 w-auto object-cover border"
                    />
                  </div>
                )}
              </div>

              {/* Linked Work Order */}
              {linkedProject && (
                <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-semibold text-gray-700">Linked Project: </span>
                    <span className="font-bold text-indigo-900">{linkedProject.title}</span>
                  </div>
                  <Link
                    to={`/projects/${linkedProject.id}`}
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    View Project <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {/* Officer Response Action Box */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block">
                  Official Officer Response & Resolution Action
                </span>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Public Officer Commentary (Will be visible to citizen & transparency audit)
                  </label>
                  <textarea
                    rows={3}
                    value={officerResponseText}
                    onChange={(e) => setOfficerResponseText(e.target.value)}
                    placeholder="e.g. Inspected site at 2 PM. Contractor has been directed to install caution barricades immediately and restore trench by Thursday."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdate('acknowledged')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      selectedReport.status === 'acknowledged'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-amber-50 hover:text-amber-800'
                    }`}
                  >
                    Acknowledge
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdate('in_review')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      selectedReport.status === 'in_review'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    Under Review
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdate('escalated')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      selectedReport.status === 'escalated'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-rose-50 hover:text-rose-700'
                    }`}
                  >
                    Escalate to Emergency
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdate('resolved')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${
                      selectedReport.status === 'resolved'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    Mark Resolved
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdate('dismissed')}
                    className="px-3 py-2 rounded-lg text-xs font-bold border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <h3 className="font-bold text-gray-900">Select a Report</h3>
              <p className="text-xs text-gray-500">Pick a grievance from the inbox to review details and respond.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
