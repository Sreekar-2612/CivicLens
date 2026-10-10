import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { MapPin, Sparkles, Layers, Activity } from 'lucide-react'
import { dataRepository } from '../../services/dataRepository'
import type { Project } from '../../types'

interface MapMarker {
  id: string
  title: string
  categoryLabel: string
  status: 'ongoing' | 'delayed' | 'completed' | 'scheduled'
  road: string
  xRatio: number
  yRatio: number
  color: string
}

const TILE_SIZE = 34 // Mosaic tile size in px
const TILE_DURATION = 950 // Lifetime of revealed tile in ms

export function GlobalMapBackground() {
  const location = useLocation()

  // 1. Explicit Exclusions:
  // Exclude BOTH background and mosaic trail from:
  // - The Report Issue page ('/report')
  // - The Assigning Role page ('/admin/assign', '/admin/roles', or '/admin?tab=assignment')
  const isExcluded = useMemo(() => {
    const pathname = location.pathname.toLowerCase()
    const search = location.search.toLowerCase()
    const hash = location.hash.toLowerCase()

    if (pathname === '/report' || pathname.startsWith('/report/')) {
      return true
    }

    if (
      pathname === '/admin/assign' ||
      pathname === '/admin/roles' ||
      (pathname === '/admin' && (search.includes('tab=assignment') || hash === '#assignment'))
    ) {
      return true
    }

    return false
  }, [location.pathname, location.search, location.hash])

  const containerRef = useRef<HTMLDivElement>(null)
  const baseCanvasRef = useRef<HTMLCanvasElement>(null)
  const trailCanvasRef = useRef<HTMLCanvasElement>(null)
  const revealCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const activeTilesRef = useRef<Map<string, { col: number; row: number; startTime: number; maxAlpha: number }>>(new Map())
  const animFrameIdRef = useRef<number | null>(null)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)

  const [markers, setMarkers] = useState<MapMarker[]>([])
  const [hoveredMarker, setHoveredMarker] = useState<MapMarker | null>(null)
  const [markerScreenPos, setMarkerScreenPos] = useState<{ x: number; y: number } | null>(null)
  const [isReducedMotion, setIsReducedMotion] = useState(false)

  // Load actual ongoing projects from data layer for markers
  useEffect(() => {
    if (isExcluded) return

    async function loadMarkers() {
      try {
        const projects = await dataRepository.getProjects()
        const active = projects.slice(0, 6)

        // Coordinates placed along organic intersections in open peripheral margins
        // so they never overlap or interfere with the centered max-w-7xl page content
        const positions = [
          { xRatio: 0.08, yRatio: 0.28, color: '#8B6F55' }, // Left periphery
          { xRatio: 0.92, yRatio: 0.24, color: '#B85C43' }, // Right periphery
          { xRatio: 0.06, yRatio: 0.68, color: '#5E8268' }, // Left bottom
          { xRatio: 0.94, yRatio: 0.62, color: '#A07E5A' }, // Right bottom
          { xRatio: 0.88, yRatio: 0.85, color: '#8B6F55' }, // Far bottom right
        ]

        const mapped: MapMarker[] = active.slice(0, 5).map((p, idx) => {
          const pos = positions[idx % positions.length]
          let status: MapMarker['status'] = 'ongoing'
          if (p.status === 'delayed') status = 'delayed'
          else if (p.status === 'completed') status = 'completed'
          else if (p.status === 'planned') status = 'scheduled'

          return {
            id: p.id,
            title: p.title,
            categoryLabel: p.category.replace(/_/g, ' '),
            status,
            road: p.road || 'Corridor',
            xRatio: pos.xRatio,
            yRatio: pos.yRatio,
            color: pos.color,
          }
        })

        setMarkers(mapped)
      } catch (e) {
        console.warn('Could not load map background markers:', e)
      }
    }

    loadMarkers()
  }, [isExcluded])

  // Draw procedural spider-web-like interconnected city map
  const renderSpiderWebCityMap = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, isReveal: boolean) => {
    ctx.clearRect(0, 0, width, height)

    // Palette tokens:
    // Warm beige: #F3EBDD, Soft cream: #FAF7F0, Off-white: #FFFDF8, Muted sand: #E5D8C5, Subtle taupe: #CFC0AA
    if (!isReveal) {
      // Base background: Soft cream with delicate paper warmth
      ctx.fillStyle = '#FAF7F0'
      ctx.fillRect(0, 0, width, height)
    } else {
      // Reveal layer: slightly richer warm sand undertone
      ctx.fillStyle = '#F3EBDD'
      ctx.fillRect(0, 0, width, height)
    }

    // Two primary radial hubs (city centers) that form organic spider-web geometries
    const hubs = [
      { cx: width * 0.38, cy: height * 0.42, maxR: Math.max(width, height) * 0.6 },
      { cx: width * 0.72, cy: height * 0.55, maxR: Math.max(width, height) * 0.5 }
    ]

    // 1. Concentric Ring Roads (Spider-Web Rings)
    hubs.forEach(hub => {
      const ringSteps = 9
      for (let i = 1; i <= ringSteps; i++) {
        const r = (hub.maxR / ringSteps) * i
        ctx.beginPath()
        ctx.arc(hub.cx, hub.cy, r, 0, Math.PI * 2)

        if (isReveal) {
          ctx.strokeStyle = i % 3 === 0 ? 'rgba(140, 119, 93, 0.45)' : 'rgba(165, 145, 120, 0.32)'
          ctx.lineWidth = i % 3 === 0 ? 1.5 : 0.8
        } else {
          ctx.strokeStyle = i % 3 === 0 ? 'rgba(185, 172, 152, 0.22)' : 'rgba(205, 194, 176, 0.14)'
          ctx.lineWidth = i % 3 === 0 ? 1.0 : 0.5
        }
        ctx.stroke()
      }
    })

    // 2. Radial Arteries (Spokes of the web spreading outwards)
    const radialAngles = [
      0.0, 0.38, 0.72, 1.15, 1.55, 1.95, 2.35, 2.78, 3.14, 3.52, 3.92, 4.32, 4.75, 5.15, 5.58, 5.95
    ]

    hubs.forEach((hub, hIdx) => {
      radialAngles.forEach((angle, aIdx) => {
        const isMajorAvenue = (aIdx + hIdx) % 3 === 0
        const len = hub.maxR * (0.85 + ((aIdx * 7) % 5) * 0.05)
        const ex = hub.cx + Math.cos(angle) * len
        const ey = hub.cy + Math.sin(angle) * len

        ctx.beginPath()
        ctx.moveTo(hub.cx, hub.cy)
        ctx.lineTo(ex, ey)

        if (isReveal) {
          ctx.strokeStyle = isMajorAvenue ? 'rgba(110, 90, 68, 0.55)' : 'rgba(145, 125, 102, 0.36)'
          ctx.lineWidth = isMajorAvenue ? 2.0 : 1.0
        } else {
          ctx.strokeStyle = isMajorAvenue ? 'rgba(165, 150, 128, 0.26)' : 'rgba(195, 182, 162, 0.16)'
          ctx.lineWidth = isMajorAvenue ? 1.2 : 0.6
        }
        ctx.stroke()
      })
    })

    // 3. Interconnecting Web Cross-Streets between adjacent radials
    hubs.forEach(hub => {
      for (let rIdx = 2; rIdx <= 8; rIdx += 2) {
        const radius = (hub.maxR / 9) * rIdx
        for (let a = 0; a < radialAngles.length; a++) {
          const a1 = radialAngles[a]
          const a2 = radialAngles[(a + 1) % radialAngles.length]

          const x1 = hub.cx + Math.cos(a1) * radius
          const y1 = hub.cy + Math.sin(a1) * radius
          const x2 = hub.cx + Math.cos(a2) * radius
          const y2 = hub.cy + Math.sin(a2) * radius

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)

          if (isReveal) {
            ctx.strokeStyle = 'rgba(160, 140, 115, 0.35)'
            ctx.lineWidth = 0.8
          } else {
            ctx.strokeStyle = 'rgba(205, 194, 176, 0.14)'
            ctx.lineWidth = 0.5
          }
          ctx.stroke()
        }
      }
    })

    // 4. Organic Canal / River Curve cutting gently across terrain
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-50, height * 0.65)
    ctx.bezierCurveTo(
      width * 0.30, height * 0.85,
      width * 0.60, height * 0.45,
      width + 50, height * 0.52
    )
    if (isReveal) {
      ctx.lineWidth = 26
      ctx.strokeStyle = 'rgba(195, 178, 155, 0.38)'
    } else {
      ctx.lineWidth = 22
      ctx.strokeStyle = 'rgba(225, 214, 195, 0.25)'
    }
    ctx.stroke()
    ctx.restore()

    // 5. Irregular City Blocks & Subtle Parcel Fills
    const cols = 20
    const rows = 14
    const cellW = width / cols
    const cellH = height / rows

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const hash = Math.sin(c * 19.3 + r * 37.1) * 10000
        const rand = hash - Math.floor(hash)

        if (rand > 0.42) {
          const bx = c * cellW + 6
          const by = r * cellH + 6
          const bw = cellW - 12
          const bh = cellH - 12

          if (isReveal) {
            ctx.fillStyle = rand > 0.8 ? 'rgba(215, 200, 178, 0.28)' : 'rgba(229, 216, 197, 0.18)'
            ctx.strokeStyle = 'rgba(180, 160, 135, 0.22)'
            ctx.lineWidth = 0.6
            ctx.fillRect(bx, by, bw, bh)
            ctx.strokeRect(bx, by, bw, bh)
          } else {
            ctx.fillStyle = 'rgba(243, 235, 221, 0.14)'
            ctx.strokeStyle = 'rgba(215, 205, 188, 0.10)'
            ctx.lineWidth = 0.4
            ctx.fillRect(bx, by, bw, bh)
            ctx.strokeRect(bx, by, bw, bh)
          }
        }
      }
    }

    // 6. Delicate Intersection Roundabout Nodes
    const centralNodes = [
      { x: hubs[0].cx, y: hubs[0].cy, r: isReveal ? 14 : 10 },
      { x: hubs[1].cx, y: hubs[1].cy, r: isReveal ? 12 : 9 },
      { x: width * 0.55, y: height * 0.48, r: isReveal ? 10 : 7 }
    ]

    centralNodes.forEach(node => {
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
      if (isReveal) {
        ctx.fillStyle = 'rgba(229, 216, 197, 0.6)'
        ctx.strokeStyle = 'rgba(140, 119, 93, 0.5)'
        ctx.lineWidth = 1.2
      } else {
        ctx.fillStyle = 'rgba(243, 235, 221, 0.4)'
        ctx.strokeStyle = 'rgba(195, 182, 162, 0.25)'
        ctx.lineWidth = 0.8
      }
      ctx.fill()
      ctx.stroke()
    })
  }, [])

  // Canvas Resize handler
  const resizeCanvases = useCallback(() => {
    const container = containerRef.current
    const baseCanvas = baseCanvasRef.current
    const trailCanvas = trailCanvasRef.current
    if (!container || !baseCanvas || !trailCanvas) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = window.innerWidth
    const h = window.innerHeight

    baseCanvas.width = w * dpr
    baseCanvas.height = h * dpr
    baseCanvas.style.width = `${w}px`
    baseCanvas.style.height = `${h}px`

    trailCanvas.width = w * dpr
    trailCanvas.height = h * dpr
    trailCanvas.style.width = `${w}px`
    trailCanvas.style.height = `${h}px`

    // Offscreen revealed canvas
    const offCanvas = document.createElement('canvas')
    offCanvas.width = w * dpr
    offCanvas.height = h * dpr
    const offCtx = offCanvas.getContext('2d')
    if (offCtx) {
      offCtx.scale(dpr, dpr)
      renderSpiderWebCityMap(offCtx, w, h, true)
    }
    revealCanvasRef.current = offCanvas

    // Base canvas rendering
    const baseCtx = baseCanvas.getContext('2d')
    if (baseCtx) {
      baseCtx.scale(dpr, dpr)
      renderSpiderWebCityMap(baseCtx, w, h, false)
    }
  }, [renderSpiderWebCityMap])

  // Activate tile along cursor trajectory
  const activateTile = useCallback((x: number, y: number, now: number, maxAlpha = 1.0) => {
    const col = Math.floor(x / TILE_SIZE)
    const row = Math.floor(y / TILE_SIZE)
    const key = `${col}_${row}`

    activeTilesRef.current.set(key, {
      col,
      row,
      startTime: now,
      maxAlpha
    })
  }, [])

  // Interpolate tiles to avoid gaps during fast cursor movements
  const addTilesAlongLine = useCallback((x0: number, y0: number, x1: number, y1: number, now: number) => {
    const dx = x1 - x0
    const dy = y1 - y0
    const dist = Math.hypot(dx, dy)
    const steps = Math.max(Math.ceil(dist / (TILE_SIZE * 0.5)), 1)

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const cx = x0 + dx * t
      const cy = y0 + dy * t
      activateTile(cx, cy, now, 0.95)

      // Light neighboring tiles for connected organic trail
      if (i % 2 === 0) {
        activateTile(cx + TILE_SIZE * 0.7, cy, now, 0.55)
        activateTile(cx - TILE_SIZE * 0.7, cy, now, 0.55)
      }
    }
  }, [activateTile])

  // 60 FPS animation loop for smooth mosaic fade-out
  useEffect(() => {
    if (isExcluded) return

    const trailCanvas = trailCanvasRef.current
    if (!trailCanvas) return
    const trailCtx = trailCanvas.getContext('2d')
    if (!trailCtx) return

    let isRunning = true

    const loop = (timestamp: number) => {
      if (!isRunning) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height)

      const revealCanvas = revealCanvasRef.current
      const tiles = activeTilesRef.current

      if (revealCanvas && tiles.size > 0) {
        tiles.forEach((tile, key) => {
          const elapsed = timestamp - tile.startTime
          if (elapsed >= TILE_DURATION) {
            tiles.delete(key)
            return
          }

          // Ease out decay
          const progress = elapsed / TILE_DURATION
          const alpha = tile.maxAlpha * (1 - Math.pow(progress, 1.5))

          if (alpha <= 0.01) {
            tiles.delete(key)
            return
          }

          const tx = tile.col * TILE_SIZE * dpr
          const ty = tile.row * TILE_SIZE * dpr
          const tSize = TILE_SIZE * dpr

          trailCtx.save()
          trailCtx.globalAlpha = alpha

          // Reveal slice from revealed map
          trailCtx.drawImage(
            revealCanvas,
            tx, ty, tSize, tSize,
            tx, ty, tSize, tSize
          )

          // Delicate warm beige mosaic tile border
          trailCtx.strokeStyle = `rgba(165, 142, 115, ${alpha * 0.45})`
          trailCtx.lineWidth = 1 * dpr
          trailCtx.strokeRect(tx + 0.5, ty + 0.5, tSize - 1, tSize - 1)

          trailCtx.restore()
        })
      }

      animFrameIdRef.current = requestAnimationFrame(loop)
    }

    animFrameIdRef.current = requestAnimationFrame(loop)

    return () => {
      isRunning = false
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current)
    }
  }, [isExcluded])

  // Pointer tracking & window events
  useEffect(() => {
    if (isExcluded) return

    // Accessibility check: prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setIsReducedMotion(mediaQuery.matches)
    const handleMotionChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleMotionChange)

    const handlePointerMove = (e: PointerEvent) => {
      if (isReducedMotion) return
      const x = e.clientX
      const y = e.clientY

      const now = performance.now()
      if (lastPosRef.current) {
        addTilesAlongLine(lastPosRef.current.x, lastPosRef.current.y, x, y, now)
      } else {
        activateTile(x, y, now, 0.95)
      }
      lastPosRef.current = { x, y }
    }

    const handlePointerLeave = () => {
      lastPosRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerleave', handlePointerLeave)
    window.addEventListener('resize', resizeCanvases)

    resizeCanvases()

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', handlePointerLeave)
      window.removeEventListener('resize', resizeCanvases)
    }
  }, [isExcluded, resizeCanvases, activateTile, addTilesAlongLine, isReducedMotion])

  // Do not render anything on excluded routes
  if (isExcluded) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-screen h-screen overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* Base resting delicate spider-web city map strictly at -z-10 behind all page content */}
      <canvas
        ref={baseCanvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none -z-10"
      />

      {/* Dynamic Cursor Mosaic Trail Canvas strictly at -z-10 behind all page content */}
      <canvas
        ref={trailCanvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none -z-10"
      />

      {/* Subtle soft paper texture vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background: 'radial-gradient(circle at 50% 40%, transparent 40%, rgba(243, 235, 221, 0.35) 100%)',
        }}
      />

      {/* Subtle Ongoing Public Works Markers */}
      {markers.map((marker) => (
        <div
          key={marker.id}
          style={{
            left: `${marker.xRatio * 100}%`,
            top: `${marker.yRatio * 100}%`,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-10 cursor-pointer group"
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            setMarkerScreenPos({ x: rect.left + rect.width / 2, y: rect.top })
            setHoveredMarker(marker)
          }}
          onMouseLeave={() => setHoveredMarker(null)}
          onFocus={() => {
            setHoveredMarker(marker)
          }}
          onBlur={() => setHoveredMarker(null)}
          tabIndex={0}
          role="button"
          aria-label={`Ongoing work: ${marker.title}`}
        >
          {/* Subtle understated marker pin with muted tone */}
          <div className="relative flex items-center justify-center">
            <span
              className="animate-ping absolute inline-flex h-4 w-4 rounded-full opacity-35"
              style={{ backgroundColor: marker.color }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2 border border-[#FFFDF8] shadow-xs"
              style={{ backgroundColor: marker.color }}
            />
          </div>

          {/* Tiny unobtrusive label chip (visible on tablet and desktop) */}
          <div className="hidden md:inline-flex items-center gap-1 ml-2.5 px-2 py-0.5 rounded-full bg-[#FFFDF8]/85 backdrop-blur-xs border border-[#E5D8C5] text-[9px] text-[#5A4834] font-medium shadow-2xs">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: marker.color }}
            />
            <span className="truncate max-w-[120px]">{marker.categoryLabel}</span>
          </div>
        </div>
      ))}

      {/* Compact Glassmorphic Tooltip on Hover */}
      {hoveredMarker && markerScreenPos && (
        <div
          style={{
            left: `${markerScreenPos.x}px`,
            top: `${markerScreenPos.y - 10}px`,
          }}
          className="fixed -translate-x-1/2 -translate-y-full z-40 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="bg-[#FFFDF8]/95 backdrop-blur-md border border-[#E5D8C5] rounded-xl px-3 py-2 shadow-[0_8px_24px_rgba(139,111,85,0.12)] text-left min-w-[190px]">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#8B6F55]">
                {hoveredMarker.categoryLabel}
              </span>
              <span
                className={`text-[8px] uppercase font-bold px-1.5 py-0.2 rounded-full border ${
                  hoveredMarker.status === 'completed'
                    ? 'bg-[#E1F8EF] text-[#0E7A55] border-[#22C58B]/30'
                    : hoveredMarker.status === 'delayed'
                    ? 'bg-[#FFE9EA] text-[#D13B41] border-[#FF5A5F]/30'
                    : 'bg-[#FFF4DB] text-[#9A6200] border-[#FFB020]/30'
                }`}
              >
                {hoveredMarker.status}
              </span>
            </div>
            <p className="text-xs font-bold text-[#1E293B] line-clamp-1">
              {hoveredMarker.title}
            </p>
            <p className="text-[10px] text-[#64748B] flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-[#8B6F55]" />
              <span>{hoveredMarker.road}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
