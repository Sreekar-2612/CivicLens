import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  FileText, MapPin, Camera, AlertTriangle, CheckCircle2,
  ShieldCheck, Upload, ArrowRight, ArrowLeft, Copy, Check,
  Clock, Sparkles, AlertCircle
} from 'lucide-react'
import { dataRepository } from '../services/dataRepository'
import { uploadEvidenceFile } from '../services/storageService'
import { useAuth } from '../context/AuthContext'
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
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [submitError, setSubmitError] = useState('')
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
    setPhotoFile(null)
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
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const { user, signInWithGoogle } = useAuth()
  const isAuthenticated = Boolean(user && !user.isDemoUser)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      alert('Authentication Required: Please sign in with your Google Account to raise an issue.')
      signInWithGoogle()
      return
    }
    if (!title.trim() || !description.trim()) return

    setSubmitting(true)
    setSubmitError('')
    try {
      const evidencePath = photoFile ? await uploadEvidenceFile(photoFile) : (photoPreview?.startsWith('https://') ? photoPreview : undefined)
      const newReport = await dataRepository.addReport({
        projectId: selectedProjectId || undefined,
        road: road.trim(),
        category,
        title: title.trim(),
        description: description.trim(),
        location: {
          lat: parseFloat(lat) || 18.5204,
          lng: parseFloat(lng) || 73.8567,
        },
        locationDescription: locationDescription.trim() || road || 'Public Right-of-Way',
        photoUrl: evidencePath,
        evidenceUrl: evidencePath,
        reporterName: isAnonymous ? 'Anonymous Resident' : (user?.displayName || reporterName.trim() || 'Authenticated Resident'),
        reporterContact: isAnonymous ? undefined : (user?.email || reporterContact.trim() || undefined),
      })
      setSubmittedReport({ id: newReport.id, referenceId: newReport.referenceId })

    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not submit report. Please try again.')
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
      <div className="min-h-screen bg-[var(--bg)] font-sans max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-xl border border-[var(--border)] p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-[var(--teal-soft)] text-[var(--teal)] rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[var(--text)] font-heading">
              Report Submitted Successfully
            </h2>
            <p className="text-xs sm:text-sm text-[var(--muted)] max-w-md mx-auto">
              Your report has been recorded. Save the reference number to check its status.
            </p>
          </div>

          {/* Reference tracking box */}
          <div className="bg-[#F8FAFC] p-5 rounded-xl border border-dashed border-[var(--border)] space-y-2">
            <span className="text-xs uppercase font-semibold text-[var(--muted)]">
              Grievance Reference Code
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono font-bold text-[var(--primary)] tracking-wider">
                {submittedReport.referenceId}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-2 rounded-lg bg-white border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                title="Copy Code"
              >
                {copied ? <Check className="w-4 h-4 text-[var(--teal)]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              Save this reference number to check officer acknowledgement and audit resolution timeline.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={`/reports/track?ref=${encodeURIComponent(submittedReport.referenceId)}`}
              className="btn-primary text-xs flex items-center justify-center gap-2 no-underline"
            >
              <Clock className="w-4 h-4" />
              Track Status Now
            </Link>
            <Link
              to="/projects"
              className="px-5 py-2.5 rounded-lg border border-[var(--border)] font-semibold text-xs text-[var(--text)] hover:bg-[#F8FAFC] transition-colors no-underline"
            >
              Browse Projects
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] mb-3 no-underline"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Project Explorer
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#FFE9EA] text-[#D13B41]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] font-heading tracking-tight">
              Submit Citizen Ground-Truth Report
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
              Empower civic accountability. Report stalled excavations, safety hazards, or broken roads directly to municipal oversight boards.
            </p>
          </div>
        </div>
      </div>
      {/* Auth Gate Warning Banner if unauthenticated */}
      {!isAuthenticated && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
              <ShieldCheck className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Google Authentication Required</h3>
              <p className="text-xs text-amber-700">You must be signed in with your Google account to lodge citizen ground reports.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="px-4 py-2 bg-[#021217] hover:bg-[#172a30] text-[#f1f3d8] hover:text-[#11e852] border border-[#e2c09c] font-bold text-xs rounded-lg flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Step 1: Link to Project or Location */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
              1. Location & Project Context
            </span>
            <span className="text-xs text-[var(--muted)]">Step 1 of 4</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
              Link to Known Public Works Project (Optional but recommended)
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
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
              <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                Road / Street Name *
              </label>
              <input
                type="text"
                required
                value={road}
                onChange={(e) => setRoad(e.target.value)}
                placeholder="e.g. Indiranagar 100ft Road, JM Road"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                Exact Landmark / Street Position
              </label>
              <input
                type="text"
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
                placeholder="e.g. Opposite Metro Pillar 42, Near KFC junction"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Grievance Category */}
        <div className="space-y-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
              2. Nature of Concern
            </span>
            <span className="text-xs text-[var(--muted)]">Step 2 of 4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map(cat => (
              <label
                key={cat.value}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  category === cat.value
                    ? 'border-[var(--primary)] bg-[var(--primary-soft)] ring-1 ring-[var(--primary)]'
                    : 'border-[var(--border)] hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="category"
                    value={cat.value}
                    checked={category === cat.value}
                    onChange={() => setCategory(cat.value)}
                    className="text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span className="font-semibold text-sm text-[var(--text)]">{cat.label}</span>
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-1 pl-5">
                  {cat.desc}
                </p>
              </label>
            ))}
          </div>
        </div>

        {/* Step 3: Description and Photo Evidence */}
        <div className="space-y-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
              3. Issue Details & Photo Evidence
            </span>
            <span className="text-xs text-[var(--muted)]">Step 3 of 4</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
              Summary Headline *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deep unbarricaded trench left open opposite bus stand for 10 days"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
              Detailed Ground Description *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide specific details: Are workers present? Are there caution signs? What is the impact on traffic or water supply?"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
            />
          </div>

          {/* Photo attachment area */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
              Photo Evidence (Upload or Pick Demonstration Sample)
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <label className="flex-1 w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-[var(--border)] rounded-xl hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                <Camera className="w-6 h-6 text-[var(--muted)] mb-1" />
                <span className="text-xs font-semibold text-[var(--text)]">Click to upload image</span>
                <span className="text-[10px] text-[var(--muted)]">JPG, PNG up to 10MB</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>

              {/* Sample Photo Chips for Quick Demo */}
              <div className="w-full sm:w-64 bg-[#F8FAFC] p-3 rounded-xl border border-[var(--border)] text-xs space-y-2">
                <span className="font-semibold text-[var(--text)] block">
                  Quick Demo Samples:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSamplePhoto('trench')}
                    className="px-2 py-1 rounded-lg bg-white border border-[var(--border)] text-[11px] hover:border-[var(--primary)] text-[var(--text)] cursor-pointer"
                  >
                    Open Trench
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSamplePhoto('pothole')}
                    className="px-2 py-1 rounded-lg bg-white border border-[var(--border)] text-[11px] hover:border-[var(--primary)] text-[var(--text)] cursor-pointer"
                  >
                    Sinkhole / Damage
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSamplePhoto('traffic')}
                    className="px-2 py-1 rounded-lg bg-white border border-[var(--border)] text-[11px] hover:border-[var(--primary)] text-[var(--text)] cursor-pointer"
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
                  className="w-40 h-28 object-cover rounded-xl border border-[var(--border)] shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(null); setPhotoFile(null) }}
                  className="absolute -top-2 -right-2 bg-[#FF5A5F] text-white rounded-full p-1 text-xs hover:bg-[#D13B41] border-none cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Step 4: Reporter Privacy & Submission */}
        <div className="space-y-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
              4. Citizen Privacy & Whistleblower Protection
            </span>
            <span className="text-xs text-[var(--muted)]">Step 4 of 4</span>
          </div>

          <div className="p-3.5 bg-[var(--teal-soft)] border border-[var(--teal)]/30 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[var(--teal)] shrink-0 mt-0.5" />
            <div className="text-xs text-[var(--teal)] font-medium">
              <span className="font-bold">Contact privacy:</span> Your name and contact details are available to authorized municipal staff handling the report. They are not shown in the public report feed.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <label htmlFor="anonymous" className="text-xs font-semibold text-[var(--text)] cursor-pointer">
              Submit 100% anonymously (No contact details collected)
            </label>
          </div>

          {!isAnonymous && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="e.g. Ramesh Kulkarni"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Mobile / Email for SMS Status Updates
                </label>
                <input
                  type="text"
                  value={reporterContact}
                  onChange={(e) => setReporterContact(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[#F8FAFC] text-[var(--text)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        {submitError && (
          <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {submitError}
          </p>
        )}
        <div className="pt-4 flex items-center justify-between border-t border-[var(--border)]">
          <p className="text-[11px] text-[var(--muted)] max-w-sm">
            By submitting, you attest that this report reflects genuine civic conditions in good faith.
          </p>
          {isAuthenticated ? (
            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: '#021217',
                color: '#f1f3d8',
                border: '1px solid #e2c09c',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(2, 18, 23, 0.25)',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Lodging Report...' : 'Lodge Ground Report'}
              <ArrowRight className="w-4 h-4 text-[#11e852]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              style={{
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
              }}
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Sign in with Google to Submit</span>
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
