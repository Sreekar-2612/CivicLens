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
import type { Department, ProjectCategory, Project } from '../../types'
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

  // Live conflict detection on road input
  const conflictingProjects = road.trim().length > 2
    ? allProjects.filter(p =>
        p.road.toLowerCase().includes(road.trim().toLowerCase()) ||
        road.trim().toLowerCase().includes(p.road.toLowerCase())
      )
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
      locality: locality.trim() || 'Central Zone',
      ward: ward.trim(),
      location: {
        lat: parseFloat(lat) || 18.5204,
        lng: parseFloat(lng) || 73.8567,
      },
      startDate,
      originalEndDate,
      budgetLakhs: parseFloat(budgetLakhs) || 50,
      progressPercent: 0,
    }

    const valResult = validateProjectCreation(validationPayload)
    if (!valResult.isValid) {
      setErrorMessages(valResult.errors)
      return
    }

    setSubmitting(true)
    try {
      const newProj = await dataRepository.addProject({
        ...validationPayload,
        status: 'planned',
        confidenceIndicator: 'on_track',
      })

      navigate(`/projects/${newProj.id}`)
    } catch (err: any) {
      setErrorMessages([err?.message || 'Failed to submit work order to database.'])
    } finally {
      setSubmitting(false)
    }
  }

  // Unauthorized view
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
              Your active session is simulated as <strong className="capitalize">{user?.role || 'Resident'}</strong> ({user?.displayName}). Only authorized municipal department officers and administrators possess write authorization to register capital work orders.
            </p>
          </div>
          <div className="p-3 bg-white/80 rounded-xl text-xs text-gray-600 max-w-md mx-auto border border-rose-200">
            <strong>Testing Tip:</strong> Use the "Test Role Switcher" in the left sidebar to switch to <em>Department Officer (Roads)</em> or <em>Administrator</em>.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          to="/officer"
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Officer Command
        </Link>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Public Work Order</h1>
            <p className="text-xs text-gray-500">
              Register a capital excavation or road surface project. Pre-flight collision checks will run in real-time.
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

      {/* Live Pre-Flight Conflict Warning */}
      {conflictingProjects.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Live Pre-Flight Coordination Warning: {conflictingProjects.length} existing project(s) on "{road}"
          </div>
          <p className="text-xs text-amber-800">
            Other departments already have permits logged on this road corridor:
          </p>
          <div className="space-y-1">
            {conflictingProjects.map(cp => (
              <div key={cp.id} className="text-xs font-medium pl-3 border-l-2 border-amber-400">
                <span className="font-bold">{cp.title}</span> ({cp.category.replace('_', ' ')}) • {cp.startDate} to {cp.revisedEndDate || cp.originalEndDate}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block border-b pb-2">
            1. Work Order Details
          </span>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Project Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Indiranagar 100ft Road Smart Drain Rehabilitation & Resurfacing"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Public Purpose & Scope
            </label>
            <textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Describe why this excavation/construction is necessary and what public benefit it brings."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Authorizing Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.shortName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Project Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProjectCategory)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
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
        <div className="space-y-4 pt-4 border-t">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block border-b pb-2">
            2. Corridor & Geospatial Location
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Road / Street Name *
              </label>
              <input
                type="text"
                required
                value={road}
                onChange={(e) => setRoad(e.target.value)}
                placeholder="e.g. JM Road"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Locality / Area
              </label>
              <input
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Shivajinagar"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Municipal Ward
              </label>
              <input
                type="text"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                placeholder="e.g. Ward 14"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Latitude Coordinates
              </label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Longitude Coordinates
              </label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Timeline & Contractor */}
        <div className="space-y-4 pt-4 border-t">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block border-b pb-2">
            3. Timeline, Contractor & Budget
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Sanctioned Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Contractual Completion Deadline (Immutable Baseline) *
              </label>
              <input
                type="date"
                required
                value={originalEndDate}
                onChange={(e) => setOriginalEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Executing Contractor / Agency *
              </label>
              <input
                type="text"
                required
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
                placeholder="e.g. L&T Infrastructure / BBMP In-House"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Sanctioned Budget (in ₹ Lakhs)
              </label>
              <input
                type="number"
                value={budgetLakhs}
                onChange={(e) => setBudgetLakhs(e.target.value)}
                placeholder="e.g. 85"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 flex items-center justify-between border-t">
          <Link
            to="/officer"
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? 'Registering Work Order...' : 'Publish Public Work Order'}
          </button>
        </div>
      </form>
    </div>
  )
}
