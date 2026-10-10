import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Eye, Grid, Layers, Sparkles } from 'lucide-react'
import type { Project, Department } from '../../types'
import { ProjectCard } from './ProjectCard'

interface DepthCarouselProps {
  projects: Project[]
  departmentMap: Map<string, Department>
  onViewAll?: () => void
}

export function DepthCarousel({ projects, departmentMap }: DepthCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragDeltaX, setDragDeltaX] = useState(0)
  const [isAutoPlay, setIsAutoPlay] = useState(true)
  const [viewMode, setViewMode] = useState<'depth' | 'grid'>('depth')

  const containerRef = useRef<HTMLDivElement>(null)
  const autoPlayTimerRef = useRef<number | null>(null)

  const count = projects.length

  // Navigate next / prev
  const nextSlide = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % count)
  }, [count])

  const prevSlide = useCallback(() => {
    setActiveIndex(prev => (prev - 1 + count) % count)
  }, [count])

  const goToSlide = (idx: number) => {
    setActiveIndex(idx)
  }

  // Auto-play timer
  useEffect(() => {
    if (!isAutoPlay || isDragging || viewMode === 'grid') return

    autoPlayTimerRef.current = window.setInterval(() => {
      nextSlide()
    }, 4200)

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current)
    }
  }, [isAutoPlay, isDragging, nextSlide, viewMode])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'depth') return
      if (e.key === 'ArrowLeft') prevSlide()
      if (e.key === 'ArrowRight') nextSlide()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [prevSlide, nextSlide, viewMode])

  // Drag / Swipe handling
  const handlePointerDown = (e: React.PointerEvent) => {
    if (viewMode !== 'depth') return
    setIsDragging(true)
    setDragStartX(e.clientX)
    setDragDeltaX(0)
    setIsAutoPlay(false)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const delta = e.clientX - dragStartX
    setDragDeltaX(delta)
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)

    if (dragDeltaX > 55) {
      prevSlide()
    } else if (dragDeltaX < -55) {
      nextSlide()
    }

    setDragDeltaX(0)
    // Resume autoplay after 5s
    setTimeout(() => setIsAutoPlay(true), 5000)
  }

  if (count === 0) return null

  return (
    <div className="w-full select-none" onMouseEnter={() => setIsAutoPlay(false)} onMouseLeave={() => setIsAutoPlay(true)}>
      {/* Controls Header Strip */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF1FF] text-[#2F6BFF] text-xs font-bold border border-[#2F6BFF]/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-bungee text-[9px] tracking-wider">DEPTH COVERFLOW 3D</span>
          </div>
          <span className="text-xs text-[#64748B] hidden sm:inline">
            Active project <strong className="text-[#1E293B]">{activeIndex + 1}</strong> of {count}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle Button */}
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
              <span>3D Stage</span>
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
              <span>Grid</span>
            </button>
          </div>

          {/* Prev / Next Chevrons */}
          {viewMode === 'depth' && (
            <div className="flex items-center gap-1.5 ml-2">
              <button
                onClick={prevSlide}
                aria-label="Previous Project"
                className="w-8 h-8 rounded-full bg-white border border-[#CBD5E1] text-[#1E293B] hover:bg-[#F6F9FC] hover:border-[#2F6BFF] flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextSlide}
                aria-label="Next Project"
                className="w-8 h-8 rounded-full bg-white border border-[#CBD5E1] text-[#1E293B] hover:bg-[#F6F9FC] hover:border-[#2F6BFF] flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3D Depth Carousel Viewport */}
      {viewMode === 'depth' ? (
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-full h-[370px] sm:h-[400px] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
          style={{
            perspective: '1200px',
            perspectiveOrigin: 'center center'
          }}
        >
          {/* Ambient depth stage gradient */}
          <div className="absolute inset-0 bg-radial from-[#F0F5FF]/60 via-transparent to-transparent pointer-events-none" />

          {/* Cards 3D Stage */}
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{
              transformStyle: 'preserve-3d'
            }}
          >
            {projects.map((project, idx) => {
              // Calculate circular or linear offset
              let offset = idx - activeIndex

              // Handle wrap-around so cards flow smoothly
              if (offset > count / 2) offset -= count
              if (offset < -count / 2) offset += count

              const absOffset = Math.abs(offset)
              const isCenter = offset === 0

              // Only render cards within visible radius of 3 steps
              if (absOffset > 3) return null

              // 3D Coverflow positioning math
              // As cards recede, they rotate further "edge-on" and stack into thin slivers with frosted glass
              const rotateY = isCenter
                ? 0
                : offset > 0
                ? -Math.min(52, 38 + absOffset * 6)
                : Math.min(52, 38 + absOffset * 6)

              const translateX = isCenter
                ? dragDeltaX * 0.4
                : offset > 0
                ? offset * 180 + 130 + dragDeltaX * 0.2
                : offset * 180 - 130 + dragDeltaX * 0.2

              const translateZ = isCenter
                ? 80
                : -140 * absOffset

              const scale = isCenter ? 1.05 : Math.max(0.72, 1 - absOffset * 0.08)
              const opacity = isCenter ? 1 : Math.max(0.3, 1 - absOffset * 0.24)
              const blur = absOffset > 1 ? Math.min(absOffset * 1.5, 4) : 0
              const zIndex = 50 - absOffset

              return (
                <div
                  key={project.id}
                  onClick={(e) => {
                    if (!isCenter) {
                      e.preventDefault()
                      e.stopPropagation()
                      goToSlide(idx)
                    }
                  }}
                  className="absolute transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                  style={{
                    width: '360px',
                    maxWidth: '85vw',
                    transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                    opacity,
                    filter: `blur(${blur}px)`,
                    zIndex,
                    transformStyle: 'preserve-3d',
                    cursor: isCenter ? 'default' : 'pointer'
                  }}
                >
                  {/* Card Container with 3D Depth Elevation */}
                  <div
                    className={`relative rounded-2xl transition-all duration-300 ${
                      isCenter
                        ? 'shadow-[0_24px_50px_-12px_rgba(47,107,255,0.22),0_8px_16px_-4px_rgba(30,41,59,0.08)] ring-2 ring-[#2F6BFF]/40 bg-white'
                        : 'shadow-[0_12px_30px_-8px_rgba(30,41,59,0.12)] hover:ring-2 hover:ring-[#2F6BFF]/30 bg-white/95'
                    }`}
                  >
                    {/* Frosted Glass Overlay for Receding Cards */}
                    {!isCenter && (
                      <div className="absolute inset-0 rounded-2xl bg-white/35 backdrop-blur-[2px] z-20 pointer-events-none transition-opacity" />
                    )}

                    {/* Edge-on Depth Highlight Gradient */}
                    <div
                      className="absolute inset-0 rounded-2xl pointer-events-none z-10"
                      style={{
                        background:
                          offset > 0
                            ? 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(227,234,242,0.4) 100%)'
                            : offset < 0
                            ? 'linear-gradient(to left, rgba(255,255,255,0) 0%, rgba(227,234,242,0.4) 100%)'
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

          {/* Drag Instruction Cue */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-xs border border-[#E3EAF2] text-[11px] text-[#64748B] pointer-events-none shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2F6BFF] animate-pulse" />
            <span>Drag or click edge cards to spin depth carousel</span>
          </div>
        </div>
      ) : (
        /* Alternative Expanded 6-Card Grid Mode */
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

      {/* Pagination Dot Indicators */}
      {viewMode === 'depth' && (
        <div className="flex items-center justify-center gap-2 mt-5">
          {projects.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              aria-label={`Jump to project ${i + 1}`}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                i === activeIndex
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
