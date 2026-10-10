import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Camera, ChevronDown, CheckCircle2, AlertTriangle, Clock,
  Maximize2, X, MapPin, Calendar, User, Sparkles, MessageSquare, ArrowRight
} from 'lucide-react'
import type { Report } from '../../types'
import { formatDistanceToNow, format } from 'date-fns'

interface StepAccordionProps {
  reports: Report[]
  projectId: string
  projectTitle: string
}

export function StepAccordion({ reports, projectId, projectTitle }: StepAccordionProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [isAutoPlay, setIsAutoPlay] = useState(true)
  const [modalImage, setModalImage] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const timerRef = useRef<number | null>(null)
  const count = reports.length

  // Auto-play timer with progress bar
  useEffect(() => {
    if (!isAutoPlay || count <= 1) {
      setProgress(0)
      return
    }

    const duration = 6000 // 6 seconds per step
    const interval = 60 // 60ms tick
    let elapsed = 0

    timerRef.current = window.setInterval(() => {
      elapsed += interval
      const pct = Math.min((elapsed / duration) * 100, 100)
      setProgress(pct)

      if (elapsed >= duration) {
        elapsed = 0
        setActiveStep(prev => (prev + 1) % count)
      }
    }, interval)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isAutoPlay, count, activeStep])

  const handleStepClick = (index: number) => {
    setActiveStep(index)
    setProgress(0)
    setIsAutoPlay(false)
  }

  // Fallback representative photos if report has no photo
  const getPhotoForReport = (report: Report, idx: number) => {
    if (report.photoUrl && report.photoUrl.trim() !== '') return report.photoUrl
    if (report.evidenceUrl && report.evidenceUrl.trim() !== '') return report.evidenceUrl

    const fallbacks = [
      'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80'
    ]
    return fallbacks[idx % fallbacks.length]
  }

  // If no citizen reports exist for this project
  if (count === 0) {
    return (
      <div className="bg-white border border-[#E3EAF2] rounded-2xl p-6 sm:p-8 text-center shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-[#EAF1FF] text-[#2F6BFF] flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
          <Camera className="w-6 h-6" />
        </div>
        <h3 className="font-['Plus_Jakarta_Sans'] text-base sm:text-lg font-bold text-[#1E293B] mb-1.5">
          No Citizen Fieldwork Reports Yet
        </h3>
        <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto mb-5 leading-relaxed">
          Be the first resident to document ground progress or report safety issues, trenching delays, or barricade breaches for this work order.
        </p>
        <Link
          to={`/report?project=${projectId}`}
          className="btn-primary text-xs py-2.5 px-5 shadow-sm inline-flex items-center gap-2 no-underline"
        >
          <Camera className="w-4 h-4" />
          <span>Upload Field Photo &amp; Report Issue</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    )
  }

  const currentReport = reports[activeStep]
  const currentPhoto = getPhotoForReport(currentReport, activeStep)

  return (
    <div
      className="bg-white border border-[#E3EAF2] rounded-2xl p-5 sm:p-7 shadow-xs"
      onMouseEnter={() => setIsAutoPlay(false)}
      onMouseLeave={() => setIsAutoPlay(true)}
    >
      {/* Header section with brand tags */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#F1F5F9]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bungee bg-[#E3F7F5] text-[#12B5A6] text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-[#12B5A6]/20">
              CITIZEN TELEMETRY
            </span>
            <span className="text-xs text-[#64748B] font-semibold">
              Step Accordion • {count} Field Observations
            </span>
          </div>
          <h2 className="font-['Plus_Jakarta_Sans'] text-lg sm:text-xl font-extrabold text-[#1E293B]">
            Resident Ground Reports &amp; Photo Evidence
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Geotagged photos and observations uploaded by residents for this project corridor
          </p>
        </div>

        <Link
          to={`/report?project=${projectId}`}
          className="btn-primary text-xs py-2 px-4 shadow-2xs inline-flex items-center gap-1.5 no-underline whitespace-nowrap self-start sm:self-auto"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Report New Issue</span>
        </Link>
      </div>

      {/* Main Split Layout: Accordion on Left, Sliding Picture Display on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Numbered Step Accordion (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {reports.map((report, idx) => {
            const isActive = idx === activeStep
            const stepNum = String(idx + 1).padStart(2, '0')

            return (
              <div
                key={report.id}
                onClick={() => handleStepClick(idx)}
                className={`rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                  isActive
                    ? 'border-[#2F6BFF] bg-[#F6F9FC] shadow-sm'
                    : 'border-[#E3EAF2] bg-white hover:border-[#CBD5E1] hover:bg-[#FAFCFE]'
                }`}
              >
                {/* Step Item Header with Morphing Pill Shape */}
                <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Morphing Pill Step Badge */}
                    <div
                      className={`relative flex items-center justify-center font-['JetBrains_Mono',monospace] text-xs font-bold transition-all duration-300 rounded-full shrink-0 ${
                        isActive
                          ? 'bg-[#2F6BFF] text-white px-3 py-1 shadow-2xs min-w-[70px]'
                          : 'bg-[#F1F5F9] text-[#64748B] px-2.5 py-1 min-w-[36px]'
                      }`}
                    >
                      <span>STEP {stepNum}</span>
                      {/* Animated Progress indicator inside pill when autoplay is on */}
                      {isActive && isAutoPlay && count > 1 && (
                        <div
                          className="absolute bottom-0 left-2 right-2 h-0.5 bg-white/70 rounded-full overflow-hidden"
                        >
                          <div
                            className="h-full bg-white transition-all duration-75"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Report Title and Status Tag */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono text-[#64748B] font-bold">
                          {report.referenceId}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-bold px-2 py-0.2 rounded-full border ${
                            report.status === 'resolved'
                              ? 'bg-[#E1F8EF] text-[#0E7A55] border-[#22C58B]/30'
                              : report.status === 'escalated'
                              ? 'bg-[#FFE9EA] text-[#D13B41] border-[#FF5A5F]/30'
                              : report.status === 'acknowledged'
                              ? 'bg-[#E6F4FE] text-[#1B7FC4] border-[#38A9F5]/30'
                              : 'bg-[#FFF4DB] text-[#9A6200] border-[#FFB020]/30'
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>
                      <h4
                        className={`text-xs sm:text-sm font-bold truncate transition-colors ${
                          isActive ? 'text-[#2F6BFF]' : 'text-[#1E293B]'
                        }`}
                      >
                        {report.title}
                      </h4>
                    </div>
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-[#64748B] shrink-0 transition-transform duration-300 ${
                      isActive ? 'rotate-180 text-[#2F6BFF]' : ''
                    }`}
                  />
                </div>

                {/* Expanded Accordion Body */}
                {isActive && (
                  <div className="px-3.5 sm:px-4 pb-4 pt-1 border-t border-[#E3EAF2]/60 animate-in fade-in duration-200">
                    <p className="text-xs text-[#334155] leading-relaxed mb-3">
                      {report.description}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#64748B] mb-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#2F6BFF] shrink-0" />
                        <span className="truncate">{report.locationDescription}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                        <span>{format(new Date(report.createdAt), 'dd MMM yyyy, hh:mm a')}</span>
                      </div>
                    </div>

                    {/* Official Municipal Response if present */}
                    {report.officerResponse && (
                      <div className="p-3 rounded-xl bg-[#EAF1FF] border border-[#2F6BFF]/20 text-xs text-[#1E293B] mt-2">
                        <div className="flex items-center gap-1.5 text-[#2F6BFF] font-bold text-[11px] mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Official Department Response</span>
                        </div>
                        <p className="text-[11px] text-[#334155] leading-relaxed">
                          {report.officerResponse}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right Side: Dynamic Sliding Picture Showcase Window (5 cols) */}
        <div className="lg:col-span-5 sticky top-20">
          <div className="bg-[#080F20] border border-[#1E293B] rounded-2xl overflow-hidden shadow-lg relative group">
            {/* Top Evidence Badge Header */}
            <div className="p-3 bg-[#0F172A] border-b border-[#1E293B] flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#4CD7F6] font-semibold">
                  EVIDENCE PHOTO • STEP {String(activeStep + 1).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[10px] text-[#94A3B8] font-mono">
                {currentReport.referenceId}
              </span>
            </div>

            {/* Photo Container with Smooth Fade / Morph Transition */}
            <div className="relative aspect-4/3 w-full bg-[#050D25] overflow-hidden">
              <img
                key={currentPhoto}
                src={currentPhoto}
                alt={currentReport.title}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 animate-in fade-in duration-300"
              />

              {/* Scrim Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#080F20] via-transparent to-transparent opacity-80" />

              {/* Fullscreen Magnifier Action Button */}
              <button
                onClick={() => setModalImage(currentPhoto)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-95 cursor-pointer shadow-md"
                aria-label="View photo fullscreen"
              >
                <Maximize2 className="w-4 h-4 text-[#4CD7F6]" />
              </button>

              {/* Photo Overlay Floating Details */}
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#06B6D4]/30 backdrop-blur-md border border-[#06B6D4]/40 text-[#4CD7F6] text-[10px] font-semibold mb-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{currentReport.locationDescription}</span>
                </div>
                <p className="text-xs font-bold text-white line-clamp-1">
                  {currentReport.title}
                </p>
                <p className="text-[10px] text-[#94A3B8]">
                  Uploaded {formatDistanceToNow(new Date(currentReport.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Footer with Inspector Telemetry */}
            <div className="p-3 bg-[#0B132B] flex items-center justify-between text-[11px] text-[#94A3B8] font-mono border-t border-[#1E293B]">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-[#38BDF8]" />
                <span>Verified Resident</span>
              </span>
              <button
                onClick={() => setModalImage(currentPhoto)}
                className="text-[#38BDF8] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Inspect Fullscreen</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Photo Lightbox Modal */}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setModalImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#080F20] border border-[#1E293B] rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setModalImage(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={modalImage}
              alt="Uploaded Resident Fieldwork Evidence"
              className="max-h-[75vh] w-auto mx-auto object-contain"
            />
            <div className="p-4 bg-[#0B132B] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-[#1E293B]">
              <div>
                <p className="text-sm font-bold text-white">{currentReport.title}</p>
                <p className="text-xs text-[#94A3B8]">{currentReport.locationDescription} • Ref {currentReport.referenceId}</p>
              </div>
              <span className="text-[10px] font-mono bg-[#06B6D4]/20 text-[#4CD7F6] border border-[#06B6D4]/40 px-2.5 py-1 rounded-full uppercase">
                Citizen Ground Evidence
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
