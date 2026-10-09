import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  FileText, MapPin, Camera, AlertTriangle, CheckCircle2,
  ShieldCheck, Upload, ArrowRight, ArrowLeft, Copy, Check,
  Clock, Sparkles, AlertCircle
} from 'lucide-react'
import { dataRepository } from '../services/dataRepository'
import type { Project, ReportCategory } from '../types'
import { REPORT_CATEGORY_LABELS } from '../types'

const CATEGORIES: { value: ReportCategory; label: string; desc: string }[] = [
  { value: 'stalled_work', label: 'Stalled / Abandoned Work', desc: 'No workers or machinery on site for multiple days, leaving open pits' },
  { value: 'safety_hazard', label: 'Safety Hazard', desc: 'Unbarricaded trenches, exposed electrical cables, missing warning lights' },
  { value: 'road_damage', label: 'Road & Pavement Damage', desc: 'Potholes, broken asphalt, or sinkholes caused by utility works' },
  { value: 'traffic_disruption', label: 'Severe Traffic Chokepoint', desc: 'Uncoordinated lane closures or blocked intersections without diversion' },
  { value: 'water_disruption', label: 'Water / Sewage Disruption', desc: 'Burst pipeline, contaminated water, or broken drainage flooding street' },
  { value: 'quality_concern', label: 'Poor Quality Workmanship', desc: 'Substandard resurfacing, immediate crumbling, uneven patchwork' },
  { value: 'environmental', label: 'Dust & Environmental Neglect', desc: 'Excessive air pollution, debris dumping in storm drains' },
  { value: 'noise_complaint', label: 'Excessive Night Disruption', desc: 'Heavy drilling outside permitted municipal hours' },
]

export function ReportPage() {
  const [searchParams] = useSearchParams()
  const initialProjectId = searchParams.get('projectId') || ''
  const navigate = useNavigate()

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId)
  const [category, setCategory] = useState<ReportCategory>('stalled_work')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [road, setRoad] = useState('')
  const [locationDescription, setLocationDescription] = useState('')
  const [lat, setLat] = useState('18.5204')
  const [lng, setLng] = useState('73.8567')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [reporterName, setReporterName] = useState('')
  const [reporterContact, setReporterContact] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submittedReport, setSubmittedReport] = useState<{ id: string; referenceId: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadProjects() {
      const p = await dataRepository.getProjects()
      setProjects(p)
      if (initialProjectId) {
        const found = p.find(item => item.id === initialProjectId)
        if (found) {
          setSelectedProjectId(found.id)
          setRoad(found.road)
          setLocationDescription(`${found.road}, ${found.locality} (${found.ward})`)
          setLat(String(found.location.lat))
          setLng(String(found.location.lng))
          setTitle(`Ground issue observed on ${found.title}`)
        }
      }
    }
    loadProjects()
  }, [initialProjectId])

  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId)
    const found = projects.find(p => p.id === projId)
    if (found) {
      setRoad(found.road)
      setLocationDescription(`${found.road}, ${found.locality} (${found.ward})`)
      setLat(String(found.location.lat))
      setLng(String(found.location.lng))
      if (!title) {
        setTitle(`Ground concern: ${found.title}`)
      }
    }
  }

  // Sample photo simulator
  const handleSamplePhoto = (type: string) => {
    if (type === 'trench') {
      setPhotoPreview('https://images.unsplash.com/photo-1541888946425-d0fbb1861593?auto=format&fit=crop&w=600&q=80')
    } else if (type === 'pothole') {
      setPhotoPreview('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80')
    } else {
      setPhotoPreview('https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&w=600&q=80')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return

    setSubmitting(true)
    try {
      const newReport = await dataRepository.addReport({
        projectId: selectedProjectId || undefined,
        category,
        title: title.trim(),
        description: description.trim(),
        location: {
          lat: parseFloat(lat) || 18.5204,
          lng: parseFloat(lng) || 73.8567,
        },
        locationDescription: locationDescription.trim() || road || 'Public Right-of-Way',
        photoUrl: photoPreview || undefined,
        reporterName: isAnonymous ? undefined : reporterName.trim() || undefined,
        reporterContact: isAnonymous ? undefined : reporterContact.trim() || undefined,
      })

      setSubmittedReport({ id: newReport.id, referenceId: newReport.referenceId })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyCode = () => {
    if (submittedReport) {
      navigator.clipboard.writeText(submittedReport.referenceId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (submittedReport) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              Report Submitted Successfully
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Your ground-truthing report has been routed to the relevant civic engineering team and added to the public transparency log.
            </p>
          </div>

          {/* Reference tracking box */}
          <div className="bg-gray-50 dark:bg-gray-900/60 p-5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 space-y-2">
            <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
              Grievance Reference Code
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
                {submittedReport.referenceId}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 transition-colors"
                title="Copy Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              Save this reference number to check officer acknowledgement and audit resolution timeline.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={`/reports/track?ref=${encodeURIComponent(submittedReport.referenceId)}`}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Track Status Now
            </Link>
            <Link
              to="/projects"
              className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 font-semibold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              Browse Projects
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Project Explorer
        </Link>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Submit Citizen Ground-Truth Report
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Empower civic accountability. Report stalled excavations, safety hazards, or broken roads directly to municipal oversight boards.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Step 1: Link to Project or Location */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              1. Location & Project Context
            </span>
            <span className="text-xs text-gray-400">Step 1 of 4</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Link to Known Public Works Project (Optional but recommended)
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- No specific project / General civic hazard --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.ward}] {p.title} — {p.road}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Road / Street Name *
              </label>
              <input
                type="text"
                required
                value={road}
                onChange={(e) => setRoad(e.target.value)}
                placeholder="e.g. Indiranagar 100ft Road, JM Road"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Exact Landmark / Street Position
              </label>
              <input
                type="text"
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
                placeholder="e.g. Opposite Metro Pillar 42, Near KFC junction"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Grievance Category */}
        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              2. Nature of Concern
            </span>
            <span className="text-xs text-gray-400">Step 2 of 4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map(cat => (
              <label
                key={cat.value}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  category === cat.value
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-400 ring-2 ring-indigo-500/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="category"
                    value={cat.value}
                    checked={category === cat.value}
                    onChange={() => setCategory(cat.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{cat.label}</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 pl-5">
                  {cat.desc}
                </p>
              </label>
            ))}
          </div>
        </div>

        {/* Step 3: Description and Photo Evidence */}
        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              3. Issue Details & Photo Evidence
            </span>
            <span className="text-xs text-gray-400">Step 3 of 4</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Summary Headline *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deep unbarricaded trench left open opposite bus stand for 10 days"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Detailed Ground Description *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide specific details: Are workers present? Are there caution signs? What is the impact on traffic or water supply?"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Photo attachment area */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Photo Evidence (Upload or Pick Demonstration Sample)
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <label className="flex-1 w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors">
                <Camera className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Click to upload image</span>
                <span className="text-[10px] text-gray-400">JPG, PNG up to 10MB</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>

              {/* Sample Photo Chips for Quick Demo */}
              <div className="w-full sm:w-64 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-2">
                <span className="font-semibold text-gray-600 dark:text-gray-300 block">
                  Quick Demo Samples:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSamplePhoto('trench')}
                    className="px-2 py-1 rounded bg-white dark:bg-gray-800 border text-[11px] hover:border-indigo-500 text-gray-700 dark:text-gray-300"
                  >
                    Open Trench
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSamplePhoto('pothole')}
                    className="px-2 py-1 rounded bg-white dark:bg-gray-800 border text-[11px] hover:border-indigo-500 text-gray-700 dark:text-gray-300"
                  >
                    Sinkhole / Damage
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSamplePhoto('traffic')}
                    className="px-2 py-1 rounded bg-white dark:bg-gray-800 border text-[11px] hover:border-indigo-500 text-gray-700 dark:text-gray-300"
                  >
                    Roadblock
                  </button>
                </div>
              </div>
            </div>

            {photoPreview && (
              <div className="mt-3 relative inline-block">
                <img
                  src={photoPreview}
                  alt="Evidence preview"
                  className="w-40 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 text-xs hover:bg-rose-700"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Step 4: Reporter Privacy & Submission */}
        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              4. Citizen Privacy & Whistleblower Protection
            </span>
            <span className="text-xs text-gray-400">Step 4 of 4</span>
          </div>

          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800 dark:text-emerald-300">
              <span className="font-bold">Public Privacy Guarantee:</span> Contact details are strictly restricted to municipal verification officers. Your name and phone number will NEVER be visible in the public transparency portal.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="anonymous" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
              Submit 100% anonymously (No contact details collected)
            </label>
          </div>

          {!isAnonymous && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="e.g. Ramesh Kulkarni"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Mobile / Email for SMS Status Updates
                </label>
                <input
                  type="text"
                  value={reporterContact}
                  onChange={(e) => setReporterContact(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4 flex items-center justify-between">
          <p className="text-[11px] text-gray-400 max-w-sm">
            By submitting, you attest that this report reflects genuine civic conditions in good faith.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'Lodging Report...' : 'Lodge Ground Report'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
