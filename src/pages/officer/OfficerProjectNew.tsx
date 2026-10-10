import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  FolderPlus, ArrowLeft, AlertTriangle, CheckCircle2,
  Calendar, MapPin, Building2, ShieldAlert, Sparkles, DollarSign,
  ShieldX
} from 'lucide-react'
import { dataRepository } from '../../services/dataRepository'
import { useAuth } from '../../context/AuthContext'
import { validateProjectCreation } from '../../services/projectValidation'
import { detectProjectClash } from '../../services/clashEngine'
import type { Department, ProjectCategory, Project, CoordinationAlert } from '../../types'
import { PROJECT_CATEGORY_LABELS } from '../../types'

export function OfficerProjectNew() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])

  const [title, setTitle] = useState('')
  const [purpose, setPurpose] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [contractor, setContractor] = useState('')
  const [category, setCategory] = useState<ProjectCategory>('road_construction')
  const [road, setRoad] = useState('')
  const [locality, setLocality] = useState('')
  const [ward, setWard] = useState('Ward 1')
  const [lat, setLat] = useState('18.5204')
  const [lng, setLng] = useState('73.8567')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [originalEndDate, setOriginalEndDate] = useState(
    new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
  )
  const [budgetLakhs, setBudgetLakhs] = useState('75')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessages, setErrorMessages] = useState<string[]>([])

  const isAuthorized = user && (user.role === 'officer' || user.role === 'admin')

  useEffect(() => {
    async function load() {
      const [depts, projs] = await Promise.all([
        dataRepository.getDepartments(),
        dataRepository.getProjects(),
      ])
      setDepartments(depts)
      setAllProjects(projs)
      if (depts.length > 0) {
        // Pre-select user's department if available
        const defaultDept = user?.departmentId
          ? depts.find(d => d.id === user.departmentId)?.id || depts[0].id
          : depts[0].id
        setDepartmentId(defaultDept)
      }
    }
    load()
  }, [user])

  const draftProject: Project = {
    id: 'draft-work-order', title, purpose, departmentId, contractor, category,
    status: 'planned', confidenceIndicator: 'on_track', road, locality, ward,
    location: { lat: Number(lat), lng: Number(lng) }, startDate, originalEndDate,
    progressPercent: 0, isPublished: true, createdAt: '', updatedAt: '',
  }
  const conflictingProjects: Array<{ project: Project; alert: CoordinationAlert }> = (
    road.trim().length > 2 &&
    Boolean(departmentId) &&
    Number.isFinite(draftProject.location.lat) &&
    Number.isFinite(draftProject.location.lng)
  )
    ? allProjects.flatMap(project => {
        const alert = detectProjectClash(draftProject, project)
        return alert ? [{ project, alert }] : []
      })
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessages([])

    if (!isAuthorized) {
      setErrorMessages(['Unauthorized: Resident or unauthenticated role cannot create public work orders.'])
      return
    }

    // Client-side pre-validation
    const validationPayload = {
      title: title.trim(),
      purpose: purpose.trim() || 'Municipal infrastructure development',
      departmentId,
      contractor: contractor.trim(),
      category,
      road: road.trim(),
      locality: locality.trim() || 'Central Ward / Sector',
      ward: ward.trim(),
      location: {
        lat: parseFloat(lat) || 18.5204,
        lng: parseFloat(lng) || 73.8567,
      },
      startDate,
      originalEndDate,
      budgetLakhs: parseFloat(budgetLakhs) || 50,
      progressPercent: 0,
      confidenceIndicator: 'on_track' as const,
      isPublished: true,
    }

    const valResult = validateProjectCreation(validationPayload)
    if (!valResult.isValid) {
      setErrorMessages(valResult.errors)
      return
    }

    setSubmitting(true)
    try {
      const created = await dataRepository.addProject(validationPayload)
      if (created) {
        navigate(`/projects/${created.id}`)
      } else {
        setErrorMessages(['Failed to register project in database.'])
      }
    } catch (err: any) {
      setErrorMessages([err?.message || 'Unexpected database error occurred.'])
    } finally {
      setSubmitting(false)
    }
  }

  // Authorization banner if viewing as Resident or unauthenticated
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-6 max-w-3xl mx-auto space-y-6 font-sans">
        <div className="bg-white rounded-xl border border-[var(--border)] p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#FFE9EA] text-[#D13B41] flex items-center justify-center mx-auto">
            <ShieldX className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text)] font-heading">
            Access Restricted: Officer Credentials Required
          </h2>
          <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
            Work order registration requires authenticated Municipal Field Engineer or Executive Officer credentials to maintain immutable baseline deadlines.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/officer"
              className="btn-primary text-xs no-underline"
            >
              Switch Role in Officer Portal
            </Link>
            <Link
              to="/projects"
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] no-underline"
            >
              Back to Public Explorer
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
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
              Municipal Work Order Registry
            </span>
            <h1 className="text-2xl font-bold text-[var(--text)] font-heading">Create New Public Work Order</h1>
            <p className="text-xs text-[var(--muted)]">
              Register a capital excavation or road surface project. Pre-flight collision checks will run in real-time.
            </p>
          </div>
        </div>
      </div>

      {/* Error alert banner */}
      {errorMessages.length > 0 && (
        <div className="p-4 rounded-xl bg-[#FFE9EA] border border-[#FF5A5F]/30 text-[#D13B41] space-y-1">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#D13B41]">
            <AlertTriangle className="w-4 h-4 text-[#FF5A5F]" />
            Validation Errors Detected ({errorMessages.length})
          </div>
          <ul className="text-xs list-disc pl-5 space-y-0.5">
            {errorMessages.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Live Pre-Flight Conflict Warning with Clash Hatch */}
      {conflictingProjects.length > 0 && (
        <div className="rounded-xl border border-[#FFD0DE] overflow-hidden shadow-sm bg-[#FFE6EE]">
          <div className="clash-hatch px-4 py-2 border-b border-[#FFD0DE] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#F0386B]" />
            <span className="text-xs font-bold text-[#C41F4F] uppercase tracking-wider">
              Pre-Flight Coordination Warning: {conflictingProjects.length} possible clash(es)
            </span>
          </div>
          <div className="p-4 bg-white text-xs space-y-2">
            <p className="text-[var(--muted)]">
              Recorded dates and locations suggest these cross-department projects need review:
            </p>
            <div className="space-y-1">
              {conflictingProjects.map(({ project: cp, alert }) => (
                <div key={cp.id} className="text-xs font-medium pl-3 border-l-2 border-[#F0386B] text-[var(--text)]">
                  <span className="font-bold">{cp.title}</span> ({cp.category.replace('_', ' ')}) • {cp.startDate} to {cp.revisedEndDate || cp.originalEndDate}
                  <p>Clash score {alert.score}/100: {alert.reasons.map((reason: any) => reason.description).join('; ')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[var(--border)] p-6 sm:p-8 shadow-sm space-y-6">
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--teal)] block border-b border-[var(--border)] pb-2">
            1. Work Order Details
          </span>

          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1">
              Project Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Indiranagar 100ft Road Smart Drain Rehabilitation & Resurfacing"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1">
              Public Purpose & Scope
            </label>
            <textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Describe why this excavation/construction is necessary and what public benefit it brings."
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Authorizing Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.shortName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Project Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProjectCategory)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              >
                {Object.entries(PROJECT_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Location */}
        <div className="space-y-4 pt-4 border-t border-[var(--border)]">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--teal)] block border-b border-[var(--border)] pb-2">
            2. Corridor & Geospatial Location
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Road / Street Name *
              </label>
              <input
                type="text"
                required
                value={road}
                onChange={(e) => setRoad(e.target.value)}
                placeholder="e.g. JM Road"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Locality / Area
              </label>
              <input
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Shivajinagar"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Municipal Ward
              </label>
              <input
                type="text"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                placeholder="e.g. Ward 14"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Latitude Coordinates
              </label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Longitude Coordinates
              </label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Timeline & Contractor */}
        <div className="space-y-4 pt-4 border-t border-[var(--border)]">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--teal)] block border-b border-[var(--border)] pb-2">
            3. Timeline, Contractor & Budget
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Sanctioned Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Contractual Completion Deadline (Immutable Baseline) *
              </label>
              <input
                type="date"
                required
                value={originalEndDate}
                onChange={(e) => setOriginalEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Executing Contractor / Agency *
              </label>
              <input
                type="text"
                required
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
                placeholder="e.g. L&T Infrastructure / BBMP In-House"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Sanctioned Budget (in ₹ Lakhs)
              </label>
              <input
                type="number"
                value={budgetLakhs}
                onChange={(e) => setBudgetLakhs(e.target.value)}
                placeholder="e.g. 85"
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
            disabled={submitting}
            className="btn-primary text-xs sm:text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? 'Registering Work Order...' : 'Publish Public Work Order'}
          </button>
        </div>
      </form>
    </div>
  )
}
