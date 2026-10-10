import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Grid, Layers, Sparkles } from 'lucide-react'
import type { Project, Department } from '../../types'
import { ProjectCard } from './ProjectCard'

interface DepthCarouselProps {
  projects: Project[]
  departmentMap: Map<string, Department>
  onViewAll?: () => void
}

export function DepthCarousel({ projects, departmentMap }: DepthCarouselProps) {
  const [viewMode, setViewMode] = useState<'depth' | 'grid'>('depth')
  const [renderProgress, setRenderProgress] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number | null>(null)

  // Floating point progress values
  const currentProgressRef = useRef(0)
  const targetProgressRef = useRef(0)
  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartProgressRef = useRef(0)

  const count = projects.length

  // Main 60 FPS animation loop for continuous rolling and smooth lerp
  useEffect(() => {
    if (viewMode !== 'depth' || count === 0) return

    let lastTime = performance.now()

    const animate = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1) // delta in seconds
      lastTime = currentTime

      // Continuous ambient rolling motion:
      // If not dragging: roll continuously. Slow down slightly on hover for reading comfort.
      if (!isDraggingRef.current) {
        const speed = isHovered ? 0.12 : 0.28 // units per second
        targetProgressRef.current += speed * dt
      }

      // Smooth lerp (spring inertia interpolation)
      const diff = targetProgressRef.current - currentProgressRef.current
      currentProgressRef.current += diff * Math.min(dt * 8, 0.3)

      setRenderProgress(currentProgressRef.current)

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [viewMode, count, isHovered])

  // Mouse Wheel / Trackpad Scroll interaction: moves carousel smoothly
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (viewMode !== 'depth') return

    // Calculate effective scroll delta
    const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.0025
    targetProgressRef.current += delta
  }, [viewMode])

  // Pointer Drag handling
  const handlePointerDown = (e: React.PointerEvent) => {
    if (viewMode !== 'depth') return
    isDraggingRef.current = true
    dragStartXRef.current = e.clientX
    dragStartProgressRef.current = targetProgressRef.current
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - dragStartXRef.current
    // 320px drag moves 1 full card
    const progressDelta = -dx / 320
    targetProgressRef.current = dragStartProgressRef.current + progressDelta
  }

  const handlePointerUp = () => {
    isDraggingRef.current = false
  }

  // Next / Prev step buttons
  const stepSlide = (direction: number) => {
    // Snap to nearest integer + direction
    const currentNearest = Math.round(targetProgressRef.current)
    targetProgressRef.current = currentNearest + direction
  }

  // Card click: snap target directly to clicked card
  const handleCardClick = (targetIdx: number) => {
    const currentNorm = ((currentProgressRef.current % count) + count) % count
    let diff = targetIdx - currentNorm

    // Find shortest rotational path
    if (diff > count / 2) diff -= count
    if (diff < -count / 2) diff += count

    targetProgressRef.current = currentProgressRef.current + diff
  }

  if (count === 0) return null

  // Active integer index for indicator dots
  const activeNormalizedIndex = ((Math.round(renderProgress) % count) + count) % count

  return (
    <div
      className="w-full select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        isDraggingRef.current = false
      }}
    >
      {/* Header Controls Strip */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF1FF] text-[#2F6BFF] text-xs font-bold border border-[#2F6BFF]/20 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#2F6BFF]" />
            <span className="font-bungee text-[9px] tracking-wider">CONTINUOUS 3D COVERFLOW</span>
          </div>
          <span className="text-xs text-[#64748B] hidden sm:inline">
            Focus: <strong className="text-[#1E293B]">Project {activeNormalizedIndex + 1}</strong> of {count}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 3D Stage vs Grid View Switcher */}
          <div className="inline-flex p-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
            <button
              onClick={() => setViewMode('depth')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'depth'
                  ? 'bg-white text-[#2F6BFF] shadow-2xs font-bold'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3D Motion</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-[#2F6BFF] shadow-2xs font-bold'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
          </div>

          {/* Stepper Chevron Buttons */}
          {viewMode === 'depth' && (
            <div className="flex items-center gap-1.5 ml-2">
              <button
                onClick={() => stepSlide(-1)}
                aria-label="Previous Project"
                className="w-8 h-8 rounded-full bg-white border border-[#CBD5E1] text-[#1E293B] hover:bg-[#F6F9FC] hover:border-[#2F6BFF] flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => stepSlide(1)}
                aria-label="Next Project"
                className="w-8 h-8 rounded-full bg-white border border-[#CBD5E1] text-[#1E293B] hover:bg-[#F6F9FC] hover:border-[#2F6BFF] flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3D Depth Carousel Stage */}
      {viewMode === 'depth' ? (
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-full h-[380px] sm:h-[410px] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
          style={{
            perspective: '1200px',
            perspectiveOrigin: 'center center'
          }}
        >
          {/* Stage ambient lighting glow */}
          <div className="absolute inset-0 bg-radial from-[#EAF1FF]/70 via-transparent to-transparent pointer-events-none" />

          {/* 3D Transform Container */}
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{
              transformStyle: 'preserve-3d'
            }}
          >
            {projects.map((project, idx) => {
              // Normalized continuous offset relative to renderProgress
              const normProgress = ((renderProgress % count) + count) % count
              let diff = idx - normProgress

              // Infinite wrap-around math
              if (diff > count / 2) diff -= count
              if (diff < -count / 2) diff += count

              const absDiff = Math.abs(diff)

              // Only render cards currently within 3.5 units of view
              if (absDiff > 3.2) return null

              const isCenter = absDiff < 0.35

              // Continuous, smooth 3D Coverflow positioning math
              const sign = Math.sign(diff)
              const rotateY = -sign * Math.min(54, Math.pow(absDiff, 0.75) * 44)
              const translateX = diff * 210
              const translateZ = 70 - Math.min(absDiff * 140, 420)
              const scale = Math.max(0.72, 1.05 - absDiff * 0.10)
              const opacity = Math.max(0.2, 1 - absDiff * 0.28)
              const blur = absDiff > 1.2 ? Math.min((absDiff - 1.2) * 2.5, 4.5) : 0
              const zIndex = Math.round(100 - absDiff * 25)

              return (
                <div
                  key={project.id}
                  onClick={(e) => {
                    if (!isCenter) {
                      e.preventDefault()
                      e.stopPropagation()
                      handleCardClick(idx)
                    }
                  }}
                  className="absolute will-change-transform"
                  style={{
                    width: '360px',
                    maxWidth: '85vw',
                    transform: `translate3d(${translateX}px, 0px, ${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                    opacity,
                    filter: `blur(${blur}px)`,
                    zIndex,
                    transformStyle: 'preserve-3d',
                    cursor: isCenter ? 'default' : 'pointer'
                  }}
                >
                  {/* Card Container with Depth Elevation */}
                  <div
                    className={`relative rounded-2xl transition-all duration-200 ${
                      isCenter
                        ? 'shadow-[0_24px_50px_-12px_rgba(47,107,255,0.25),0_8px_16px_-4px_rgba(30,41,59,0.08)] ring-2 ring-[#2F6BFF]/40 bg-white'
                        : 'shadow-[0_12px_30px_-8px_rgba(30,41,59,0.12)] hover:ring-2 hover:ring-[#2F6BFF]/30 bg-white/95'
                    }`}
                  >
                    {/* Frosted Glass Overlay for Receding Cards */}
                    {!isCenter && (
                      <div className="absolute inset-0 rounded-2xl bg-white/35 backdrop-blur-[2px] z-20 pointer-events-none" />
                    )}

                    {/* Edge-on Depth Highlight Gradient */}
                    <div
                      className="absolute inset-0 rounded-2xl pointer-events-none z-10"
                      style={{
                        background:
                          diff > 0.3
                            ? 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(227,234,242,0.45) 100%)'
                            : diff < -0.3
                            ? 'linear-gradient(to left, rgba(255,255,255,0) 0%, rgba(227,234,242,0.45) 100%)'
                            : 'none'
                      }}
                    />

                    {/* Actual Project Card Content */}
                    <ProjectCard
                      project={project}
                      department={departmentMap.get(project.departmentId)}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Interactive Hint Pill */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/85 backdrop-blur-md border border-[#E3EAF2] text-[11px] text-[#64748B] pointer-events-none shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#2F6BFF] animate-ping" />
            <span>Scroll wheel or drag horizontally to roll carousel</span>
          </div>
        </div>
      ) : (
        /* Expanded Grid View Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-in fade-in duration-300">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              department={departmentMap.get(project.departmentId)}
            />
          ))}
        </div>
      )}

      {/* Pagination Pill Indicators */}
      {viewMode === 'depth' && (
        <div className="flex items-center justify-center gap-2 mt-5">
          {projects.map((_, i) => (
            <button
              key={i}
              onClick={() => handleCardClick(i)}
              aria-label={`Jump to project ${i + 1}`}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                i === activeNormalizedIndex
                  ? 'w-7 h-2 bg-[#2F6BFF]'
                  : 'w-2 h-2 bg-[#CBD5E1] hover:bg-[#94A3B8]'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
