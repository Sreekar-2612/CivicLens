import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Sparkles, Activity, Layers, MapPin } from 'lucide-react'

interface InfrastructureMarker {
  id: string
  name: string
  department: string
  status: 'ongoing' | 'planned' | 'approved' | 'completed'
  code: string
  xRatio: number
  yRatio: number
}

const HERO_MARKERS: InfrastructureMarker[] = [
  {
    id: 'm-1',
    name: 'FC Road Cross-Utility Trench',
    department: 'Water Supply & Drainage',
    status: 'ongoing',
    code: 'SEC-WTR-204',
    xRatio: 0.64,
    yRatio: 0.36
  },
  {
    id: 'm-2',
    name: 'JM Road Telecom Micro-Ducting',
    department: 'Smart City Fiber',
    status: 'approved',
    code: 'SEC-TEL-819',
    xRatio: 0.81,
    yRatio: 0.58
  },
  {
    id: 'm-3',
    name: 'Sub-Arterial HV Power Conduit',
    department: 'Electricity & Lighting',
    status: 'ongoing',
    code: 'SEC-PWR-112',
    xRatio: 0.48,
    yRatio: 0.74
  },
  {
    id: 'm-4',
    name: 'North Ring Stormwater Upgrade',
    department: 'Public Works Dept',
    status: 'completed',
    code: 'SEC-PWD-091',
    xRatio: 0.85,
    yRatio: 0.25
  }
]

interface ActiveTile {
  col: number
  row: number
  startTime: number
  duration: number
  maxAlpha: number
}

const TILE_SIZE = 36 // Mosaic tile width & height in px
const TILE_DURATION = 950 // Fade out lifetime in ms

export function MosaicMapTrail() {
  const containerRef = useRef<HTMLDivElement>(null)
  const baseCanvasRef = useRef<HTMLCanvasElement>(null)
  const trailCanvasRef = useRef<HTMLCanvasElement>(null)
  const revealCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const activeTilesRef = useRef<Map<string, ActiveTile>>(new Map())
  const animFrameIdRef = useRef<number | null>(null)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)

  const [hoveredMarker, setHoveredMarker] = useState<InfrastructureMarker | null>(null)
  const [markerScreenPos, setMarkerScreenPos] = useState<{ x: number; y: number } | null>(null)
  const [isReducedMotion, setIsReducedMotion] = useState(false)

  // Draw procedural realistic city map
  const renderCityMap = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, isReveal: boolean) => {
    ctx.clearRect(0, 0, width, height)

    // Base background colors matching StitchMCP design specifications
    if (!isReveal) {
      // Dim resting background
      ctx.fillStyle = '#080F20'
      ctx.fillRect(0, 0, width, height)

      // Very subtle grid background
      ctx.strokeStyle = 'rgba(25, 42, 77, 0.45)'
      ctx.lineWidth = 0.5
      const gridStep = 40
      for (let x = 0; x < width; x += gridStep) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += gridStep) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    } else {
      // Reveal layer background: rich deep navy with subtle luminous tint
      ctx.fillStyle = '#0B1736'
      ctx.fillRect(0, 0, width, height)

      // High-contrast coordinates mesh
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)'
      ctx.lineWidth = 0.75
      const gridStep = 36
      for (let x = 0; x < width; x += gridStep) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += gridStep) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    }

    // River / Canal curve running diagonally across lower quadrant
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-50, height * 0.78)
    ctx.bezierCurveTo(
      width * 0.35, height * 0.95,
      width * 0.65, height * 0.62,
      width + 50, height * 0.72
    )
    ctx.lineWidth = isReveal ? 38 : 32
    ctx.strokeStyle = isReveal ? 'rgba(6, 182, 212, 0.35)' : 'rgba(18, 35, 68, 0.75)'
    ctx.stroke()
    ctx.restore()

    // City blocks (urban parcels)
    const blockRows = 12
    const blockCols = 18
    const blockW = width / blockCols
    const blockH = height / blockRows

    for (let c = 0; c < blockCols; c++) {
      for (let r = 0; r < blockRows; r++) {
        // Pseudo-random footprint based on grid index
        const hash = Math.sin(c * 17.1 + r * 31.7) * 10000
        const rand = hash - Math.floor(hash)

        if (rand > 0.32) {
          const bx = c * blockW + 7
          const by = r * blockH + 7
          const bw = blockW - 14
          const bh = blockH - 14

          if (isReveal) {
            ctx.fillStyle = rand > 0.75 ? 'rgba(76, 215, 246, 0.10)' : 'rgba(30, 58, 102, 0.35)'
            ctx.strokeStyle = rand > 0.8 ? 'rgba(6, 182, 212, 0.4)' : 'rgba(56, 169, 245, 0.18)'
            ctx.lineWidth = 1
            ctx.fillRect(bx, by, bw, bh)
            ctx.strokeRect(bx, by, bw, bh)
          } else {
            ctx.fillStyle = 'rgba(14, 26, 52, 0.6)'
            ctx.strokeStyle = 'rgba(28, 48, 86, 0.45)'
            ctx.lineWidth = 0.5
            ctx.fillRect(bx, by, bw, bh)
            ctx.strokeRect(bx, by, bw, bh)
          }
        }
      }
    }

    // Street Network: Secondary Streets
    ctx.lineWidth = isReveal ? 2.5 : 1.2
    ctx.strokeStyle = isReveal ? 'rgba(226, 232, 240, 0.55)' : 'rgba(40, 62, 102, 0.5)'
    for (let c = 0; c <= blockCols; c++) {
      const sx = c * blockW
      ctx.beginPath()
      ctx.moveTo(sx, 0)
      ctx.lineTo(sx, height)
      ctx.stroke()
    }
    for (let r = 0; r <= blockRows; r++) {
      const sy = r * blockH
      ctx.beginPath()
      ctx.moveTo(0, sy)
      ctx.lineTo(width, sy)
      ctx.stroke()
    }

    // Major Arterials & Highways (diagonal and central thoroughfares)
    const avenues = [
      { x1: 0, y1: height * 0.35, x2: width, y2: height * 0.35, width: isReveal ? 6 : 3.5 },
      { x1: 0, y1: height * 0.62, x2: width, y2: height * 0.62, width: isReveal ? 5 : 3 },
      { x1: width * 0.32, y1: 0, x2: width * 0.32, y2: height, width: isReveal ? 5.5 : 3.5 },
      { x1: width * 0.68, y1: 0, x2: width * 0.68, y2: height, width: isReveal ? 6.5 : 4 },
      // Diagonal express route
      { x1: width * 0.15, y1: 0, x2: width * 0.85, y2: height, width: isReveal ? 5 : 3 }
    ]

    avenues.forEach(av => {
      ctx.beginPath()
      ctx.moveTo(av.x1, av.y1)
      ctx.lineTo(av.x2, av.y2)
      ctx.lineWidth = av.width
      ctx.strokeStyle = isReveal ? '#F8FAFC' : 'rgba(74, 98, 142, 0.7)'
      ctx.stroke()

      // Luminous center guideline in reveal mode
      if (isReveal) {
        ctx.beginPath()
        ctx.moveTo(av.x1, av.y1)
        ctx.lineTo(av.x2, av.y2)
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#38BDF8'
        ctx.stroke()
      }
    })

    // Subterranean Utility & Conduit Layers (Cyan dashed lines)
    if (isReveal) {
      ctx.save()
      ctx.setLineDash([8, 6])
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.85)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(width * 0.1, height * 0.35)
      ctx.lineTo(width * 0.68, height * 0.35)
      ctx.lineTo(width * 0.68, height * 0.74)
      ctx.lineTo(width * 0.95, height * 0.74)
      ctx.stroke()

      // Gas / Power conduits (Amber dashed lines)
      ctx.setLineDash([4, 8])
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.moveTo(width * 0.32, height * 0.15)
      ctx.lineTo(width * 0.32, height * 0.62)
      ctx.lineTo(width * 0.82, height * 0.62)
      ctx.stroke()
      ctx.restore()
    }

    // Intersections and Roundabout nodes
    const roundabouts = [
      { x: width * 0.32, y: height * 0.35, r: isReveal ? 16 : 12 },
      { x: width * 0.68, y: height * 0.35, r: isReveal ? 20 : 15 },
      { x: width * 0.68, y: height * 0.62, r: isReveal ? 18 : 14 }
    ]

    roundabouts.forEach(rb => {
      ctx.beginPath()
      ctx.arc(rb.x, rb.y, rb.r, 0, Math.PI * 2)
      ctx.fillStyle = isReveal ? 'rgba(6, 182, 212, 0.25)' : 'rgba(20, 36, 68, 0.8)'
      ctx.fill()
      ctx.strokeStyle = isReveal ? '#4CD7F6' : 'rgba(74, 98, 142, 0.8)'
      ctx.lineWidth = isReveal ? 2 : 1.2
      ctx.stroke()
    })
  }, [])

  // Initialize Canvas Layers on size change
  const resizeCanvases = useCallback(() => {
    const container = containerRef.current
    const baseCanvas = baseCanvasRef.current
    const trailCanvas = trailCanvasRef.current
    if (!container || !baseCanvas || !trailCanvas) return

    const rect = container.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.floor(rect.width)
    const h = Math.floor(rect.height)

    baseCanvas.width = w * dpr
    baseCanvas.height = h * dpr
    baseCanvas.style.width = `${w}px`
    baseCanvas.style.height = `${h}px`

    trailCanvas.width = w * dpr
    trailCanvas.height = h * dpr
    trailCanvas.style.width = `${w}px`
    trailCanvas.style.height = `${h}px`

    // Offscreen reveal canvas
    const offCanvas = document.createElement('canvas')
    offCanvas.width = w * dpr
    offCanvas.height = h * dpr
    const offCtx = offCanvas.getContext('2d')
    if (offCtx) {
      offCtx.scale(dpr, dpr)
      renderCityMap(offCtx, w, h, true)
    }
    revealCanvasRef.current = offCanvas

    // Base canvas rendering
    const baseCtx = baseCanvas.getContext('2d')
    if (baseCtx) {
      baseCtx.scale(dpr, dpr)
      renderCityMap(baseCtx, w, h, false)
    }
  }, [renderCityMap])

  // Activate a specific mosaic tile along cursor path
  const activateTile = useCallback((x: number, y: number, now: number, maxAlpha = 1.0) => {
    const col = Math.floor(x / TILE_SIZE)
    const row = Math.floor(y / TILE_SIZE)
    const key = `${col}_${row}`

    activeTilesRef.current.set(key, {
      col,
      row,
      startTime: now,
      duration: TILE_DURATION,
      maxAlpha
    })
  }, [])

  // Add tiles along line segment to avoid gaps during fast cursor gestures
  const addTilesAlongLine = useCallback((x0: number, y0: number, x1: number, y1: number, now: number) => {
    const dx = x1 - x0
    const dy = y1 - y0
    const dist = Math.hypot(dx, dy)
    const steps = Math.max(Math.ceil(dist / (TILE_SIZE * 0.45)), 1)

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const cx = x0 + dx * t
      const cy = y0 + dy * t
      activateTile(cx, cy, now, 1.0)

      // Staggered neighboring mosaic tiles for natural trail width
      if (i % 2 === 0) {
        activateTile(cx + TILE_SIZE * 0.65, cy, now, 0.65)
        activateTile(cx - TILE_SIZE * 0.65, cy, now, 0.65)
        activateTile(cx, cy + TILE_SIZE * 0.65, now, 0.65)
      }
    }
  }, [activateTile])

  // Trail Animation Frame Loop
  useEffect(() => {
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
        // Draw active mosaic tiles revealing bright map
        tiles.forEach((tile, key) => {
          const elapsed = timestamp - tile.startTime
          if (elapsed >= tile.duration) {
            tiles.delete(key)
            return
          }

          // Ease out fade
          const progress = elapsed / tile.duration
          const alpha = tile.maxAlpha * (1 - Math.pow(progress, 1.4))

          if (alpha <= 0.01) {
            tiles.delete(key)
            return
          }

          const tx = tile.col * TILE_SIZE * dpr
          const ty = tile.row * TILE_SIZE * dpr
          const tSize = TILE_SIZE * dpr

          trailCtx.save()
          trailCtx.globalAlpha = alpha

          // Clip and draw exact tile region from reveal canvas
          trailCtx.drawImage(
            revealCanvas,
            tx, ty, tSize, tSize,
            tx, ty, tSize, tSize
          )

          // Mosaic architectural edge stroke
          trailCtx.strokeStyle = `rgba(76, 215, 246, ${Math.min(alpha * 0.55, 0.6)})`
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
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
      }
    }
  }, [])

  // Event handlers for cursor tracking
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Accessibility check: prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setIsReducedMotion(mediaQuery.matches)
    const handleMotionChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleMotionChange)

    const handlePointerMove = (e: PointerEvent) => {
      if (isReducedMotion) return
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      if (x < 0 || x > rect.width || y < 0 || y > rect.height) return

      const now = performance.now()
      if (lastPosRef.current) {
        addTilesAlongLine(lastPosRef.current.x, lastPosRef.current.y, x, y, now)
      } else {
        activateTile(x, y, now, 1.0)
      }
      lastPosRef.current = { x, y }

      // Check proximity to infrastructure markers
      let closest: InfrastructureMarker | null = null
      let closestDist = 55
      for (const m of HERO_MARKERS) {
        const mx = m.xRatio * rect.width
        const my = m.yRatio * rect.height
        const dist = Math.hypot(mx - x, my - y)
        if (dist < closestDist) {
          closest = m
          closestDist = dist
          setMarkerScreenPos({ x: mx, y: my })
        }
      }
      setHoveredMarker(closest)
    }

    const handlePointerLeave = () => {
      lastPosRef.current = null
      setHoveredMarker(null)
    }

    // Touch tap reveal for mobile
    const handleTouchStart = (e: TouchEvent) => {
      const rect = container.getBoundingClientRect()
      const touch = e.touches[0]
      if (!touch) return
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      const now = performance.now()
      addTilesAlongLine(x - 20, y - 20, x + 20, y + 20, now)
    }

    container.addEventListener('pointermove', handlePointerMove, { passive: true })
    container.addEventListener('pointerleave', handlePointerLeave)
    container.addEventListener('touchstart', handleTouchStart, { passive: true })

    window.addEventListener('resize', resizeCanvases)
    resizeCanvases()

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange)
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerleave', handlePointerLeave)
      container.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('resize', resizeCanvases)
    }
  }, [resizeCanvases, activateTile, addTilesAlongLine, isReducedMotion])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden select-none pointer-events-auto bg-[#080F20]"
      aria-hidden="true"
    >
      {/* Base resting city map canvas */}
      <canvas
        ref={baseCanvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none"
      />

      {/* Dynamic Cursor Mosaic Trail Canvas */}
      <canvas
        ref={trailCanvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none mix-blend-screen"
      />

      {/* Atmospheric lighting gradient scrim to guarantee text contrast */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#080F20]/95 via-[#080F20]/80 to-[#080F20]/30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080F20] via-transparent to-transparent pointer-events-none" />

      {/* Interactive Infrastructure Pins */}
      {HERO_MARKERS.map((marker) => (
        <div
          key={marker.id}
          style={{
            left: `${marker.xRatio * 100}%`,
            top: `${marker.yRatio * 100}%`
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
          onMouseEnter={(e) => {
            const container = containerRef.current
            if (container) {
              const rect = container.getBoundingClientRect()
              setMarkerScreenPos({
                x: marker.xRatio * rect.width,
                y: marker.yRatio * rect.height
              })
            }
            setHoveredMarker(marker)
          }}
          onMouseLeave={() => setHoveredMarker(null)}
        >
          {/* Beacon pulse reticle */}
          <span className="relative flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#06B6D4] opacity-50" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4CD7F6] shadow-[0_0_12px_#06B6D4] border border-white" />
          </span>
        </div>
      ))}

      {/* Glassmorphic Interactive Marker Tooltip */}
      {hoveredMarker && markerScreenPos && (
        <div
          style={{
            left: `${markerScreenPos.x}px`,
            top: `${markerScreenPos.y - 14}px`
          }}
          className="absolute -translate-x-1/2 -translate-y-full z-30 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95"
        >
          <div className="bg-[#0F172A]/90 backdrop-blur-md border border-[#06B6D4]/40 rounded-xl px-3.5 py-2.5 shadow-[0_12px_32px_rgba(3,7,18,0.7),0_0_16px_rgba(6,182,212,0.25)] text-left min-w-[210px]">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-['JetBrains_Mono',monospace] text-[10px] text-[#4CD7F6] font-semibold tracking-wider">
                {hoveredMarker.code}
              </span>
              <span
                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${
                  hoveredMarker.status === 'ongoing'
                    ? 'bg-[#FFB020]/20 text-[#FFB020] border border-[#FFB020]/40'
                    : hoveredMarker.status === 'completed'
                    ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                    : 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40'
                }`}
              >
                {hoveredMarker.status}
              </span>
            </div>
            <div className="text-xs font-bold text-white font-['Plus_Jakarta_Sans',sans-serif] line-clamp-1">
              {hoveredMarker.name}
            </div>
            <div className="text-[11px] text-[#94A3B8] flex items-center gap-1 mt-0.5">
              <Layers className="w-3 h-3 text-[#06B6D4]" />
              <span>{hoveredMarker.department}</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom telemetry badge */}
      <div className="absolute bottom-3 right-4 hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#0F172A]/70 backdrop-blur-xs border border-white/10 text-[10px] text-[#94A3B8] font-['JetBrains_Mono',monospace] pointer-events-none">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
        <span>MOSAIC MAP TRAIL • GIS TELEMETRY ACTIVE</span>
      </div>
    </div>
  )
}
