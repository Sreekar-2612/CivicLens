import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import {
  Layers, MapPin, ExternalLink, Globe, Compass,
  Eye, CheckCircle2, AlertTriangle, ShieldCheck
} from 'lucide-react'
import type { Project, Department, Report } from '../../types'
import { PROJECT_STATUS_LABELS } from '../../types'

import { CURRENT_REGION, geocodeCity } from '../../config/regionConfig'

// Status Solid Colors matching extraordinary aesthetic
const statusColors: Record<string, { solid: string; glow: string; text: string; bg: string }> = {
  planned: { solid: '#0284C7', glow: 'rgba(2, 132, 199, 0.3)', text: '#0369A1', bg: '#E0F2FE' },
  in_progress: { solid: '#D97706', glow: 'rgba(217, 119, 6, 0.35)', text: '#92400E', bg: '#FEF3C7' },
  delayed: { solid: '#DC2626', glow: 'rgba(220, 38, 38, 0.4)', text: '#991B1B', bg: '#FEE2E2' },
  completed: { solid: '#059669', glow: 'rgba(5, 150, 105, 0.3)', text: '#065F46', bg: '#ECFDF5' },
  approved: { solid: '#7C3AED', glow: 'rgba(124, 58, 237, 0.3)', text: '#5B21B6', bg: '#EDE9FE' },
  cancelled: { solid: '#64748B', glow: 'rgba(100, 116, 139, 0.2)', text: '#334155', bg: '#F1F5F9' },
}

function createRealisticMarker(status: string, isSelected: boolean = false) {
  const conf = statusColors[status] || statusColors.cancelled
  const size = isSelected ? 34 : 28
  const half = size / 2

  return L.divIcon({
    className: 'realistic-marker-icon',
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${(status === 'in_progress' || status === 'delayed' || isSelected) ? `
          <div style="
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: ${conf.glow};
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            pointer-events: none;
          "></div>
        ` : ''}
        <div style="
          width: ${size - 4}px;
          height: ${size - 4}px;
          background: #ffffff;
          border: 3px solid ${conf.solid};
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        ">
          <div style="
            width: ${size > 30 ? 10 : 8}px;
            height: ${size > 30 ? 10 : 8}px;
            background: ${conf.solid};
            border-radius: 50%;
          "></div>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [half, half],
    popupAnchor: [0, -half - 4],
  })
}

interface ProjectMapProps {
  projects: Project[]
  reports?: Report[]
  departments: Department[]
  selectedProject?: Project | null
  onSelectProject?: (project: Project | null) => void
  onCitySearch?: (cityName: string, lat: number, lng: number) => void
  height?: string
  center?: [number, number]
  zoom?: number
  showControls?: boolean
}

function MapController({
  projects,
  reports,
  selectedProject,
  customTarget,
  center,
  resetTrigger
}: {
  projects: Project[]
  reports: Report[]
  selectedProject?: Project | null
  customTarget?: [number, number] | null
  center?: [number, number]
  resetTrigger: number
}) {
  const map = useMap()

  // Fly to center prop whenever it changes
  useEffect(() => {
    if (center) {
      map.flyTo(center, 13, { animate: true, duration: 1.0 })
    }
  }, [center, map])

  // Fly to custom searched target location
  useEffect(() => {
    if (customTarget) {
      map.flyTo(customTarget, 14, { animate: true, duration: 1.2 })
    }
  }, [customTarget, map])

  // Fly to selected project
  useEffect(() => {
    if (selectedProject) {
      map.flyTo([selectedProject.location.lat, selectedProject.location.lng], 15, {
        animate: true,
        duration: 0.8,
      })
    }
  }, [selectedProject, map])

  // Fit bounds when reset trigger changes or on initial load with projects if no center
  useEffect(() => {
    const locations: [number, number][] = [...projects.map(p => p.location), ...reports.map(r => r.location)]
      .filter(location => Number.isFinite(location.lat) && Number.isFinite(location.lng))
      .map(location => [location.lat, location.lng])
    if (locations.length > 0 && !center && !customTarget) {
      const bounds = L.latLngBounds(locations)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
    }
  }, [resetTrigger, projects, reports, center, customTarget, map])

  return null
}

export function ProjectMap({
  projects,
  reports = [],
  departments,
  selectedProject,
  onSelectProject,
  onCitySearch,
  height = '100%',
  center,
  zoom = CURRENT_REGION.defaultZoom,
  showControls = true,
}: ProjectMapProps) {
  const [basemap, setBasemap] = useState<'satellite' | 'urban' | 'light'>('satellite')
  const [resetTrigger, setResetTrigger] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [customTarget, setCustomTarget] = useState<[number, number] | null>(null)

  const deptMap = new Map(departments.map(d => [d.id, d]))

  // Calculate dynamic center if not passed
  const initialCenter: [number, number] = center || (projects.length > 0
    ? [
        projects.reduce((acc, p) => acc + p.location.lat, 0) / projects.length,
        projects.reduce((acc, p) => acc + p.location.lng, 0) / projects.length
      ]
    : [CURRENT_REGION.defaultLat, CURRENT_REGION.defaultLng])

  const handleResetView = () => {
    setCustomTarget(null)
    setResetTrigger(prev => prev + 1)
  }

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    const result = await geocodeCity(searchQuery.trim())
    setIsSearching(false)

    if (result) {
      setCustomTarget([result.lat, result.lng])
      if (onCitySearch) {
        onCitySearch(searchQuery.trim(), result.lat, result.lng)
      }
    } else {
      alert(`Location "${searchQuery}" not found. Try entering a city name (e.g. Guntur, Bengaluru, Mumbai).`)
    }
  }

  return (
    <div style={{ height, width: '100%' }} className="relative font-sans overflow-hidden select-none">
      {/* Global Location Search Bar (Top Left Overlay) */}
      {showControls && (
        <form
          onSubmit={handleGlobalSearch}
          className="absolute top-3 left-3 z-[1000] flex items-center bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-1 shadow-md max-w-xs sm:max-w-sm"
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any city or region globally..."
            className="px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none flex-1 min-w-[140px]"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="bg-[#021217] hover:bg-[#172a30] text-[#f1f3d8] hover:text-[#11e852] border border-[#e2c09c] text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
          >
            {isSearching ? 'Searching...' : 'Go'}
          </button>
        </form>
      )}

      {/* Floating Basemap Switcher (Top Right) */}
      {showControls && (
        <div className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-xl p-1 shadow-md flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setBasemap('satellite')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 border-none cursor-pointer ${
              basemap === 'satellite'
                ? 'bg-[#021217] text-[#11e852] border border-[#e2c09c] shadow-sm font-bold'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
            title="Ultra-realistic aerial satellite photography"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Satellite</span>
          </button>

          <button
            type="button"
            onClick={() => setBasemap('urban')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 border-none cursor-pointer ${
              basemap === 'urban'
                ? 'bg-[#021217] text-[#11e852] border border-[#e2c09c] shadow-sm font-bold'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
            title="Lush detailed urban street cartography"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Street</span>
          </button>

          <button
            type="button"
            onClick={() => setBasemap('light')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 border-none cursor-pointer ${
              basemap === 'light'
                ? 'bg-[#021217] text-[#11e852] border border-[#e2c09c] shadow-sm font-bold'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
            title="High contrast clean cartographic canvas"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Canvas</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
            title="Fit map to all active projects"
          >
            <MapPin className="w-4 h-4 text-[#088c2e]" />
          </button>
        </div>
      )}

      {/* The Leaflet Container */}
      <MapContainer
        center={initialCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <MapController
          projects={projects}
          reports={reports}
          selectedProject={selectedProject}
          customTarget={customTarget}
          center={center}
          resetTrigger={resetTrigger}
        />

        {/* 1. Realistic Satellite Basemap (Esri World Imagery + Reference Overlay) */}
        {basemap === 'satellite' && (
          <>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Earthstar Geographics'
              maxZoom={19}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </>
        )}

        {/* 2. Detailed Urban Cartography (OpenStreetMap Standard - No API Key Required) */}
        {basemap === 'urban' && (
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
        )}

        {/* 3. Clean Civic Canvas (Esri Light Gray Base) */}
        {basemap === 'light' && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            maxZoom={16}
          />
        )}

        {reports.filter(report => Number.isFinite(report.location.lat) && Number.isFinite(report.location.lng)).map(report => (
          <Marker key={`report-${report.id}`} position={[report.location.lat, report.location.lng]}
            icon={L.divIcon({ className: 'resident-issue-marker', html: '<div style="width:24px;height:24px;border-radius:50%;background:#ea580c;border:3px solid white;box-shadow:0 1px 5px #0005;color:white;text-align:center;font-weight:bold">!</div>', iconSize: [24, 24], iconAnchor: [12, 12] })}>
            <Popup><div className="space-y-2"><strong>Resident issue: {report.title}</strong><p>{report.referenceId}</p><p>Status: {report.status.replaceAll('_', ' ')}</p><p>{report.description}</p><Link to={`/reports/track?ref=${encodeURIComponent(report.referenceId)}`}>Track issue</Link></div></Popup>
          </Marker>
        ))}
        {/* Markers */}
        {projects.map(project => {
          const dept = deptMap.get(project.departmentId)
          const isSelected = selectedProject?.id === project.id
          const conf = statusColors[project.status] || statusColors.cancelled

          return (
            <Marker
              key={project.id}
              position={[project.location.lat, project.location.lng]}
              icon={createRealisticMarker(project.status, isSelected)}
              eventHandlers={{
                click: () => onSelectProject?.(project),
              }}
            >
              <Popup maxWidth={300} minWidth={240} className="realistic-popup">
                <div className="p-1 font-sans space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      style={{ background: conf.bg, color: conf.text }}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
                    >
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                    {project.budgetLakhs && (
                      <span className="text-xs font-extrabold text-slate-900">
                        ₹{project.budgetLakhs}L Sanctioned
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-snug font-heading">
                      {project.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#088c2e] shrink-0" />
                      <span>{project.road}, {project.ward}</span>
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                      <span>Physical Progress</span>
                      <span className="font-bold text-[#088c2e]">{project.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#11e852] h-1.5 rounded-full"
                        style={{ width: `${project.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {dept && (
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-medium text-slate-700">{dept.shortName}</span>
                      <span className="truncate max-w-[120px]">{project.contractor}</span>
                    </div>
                  )}

                  <div className="pt-1">
                    <Link
                      to={`/projects/${project.id}`}
                      className="w-full py-1.5 px-3 rounded-lg bg-[#021217] hover:bg-[#172a30] text-[#f1f3d8] hover:text-[#11e852] border border-[#e2c09c] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors no-underline shadow-xs"
                    >
                      <span>Open Project Audit</span>
                      <ExternalLink className="w-3 h-3 text-[#11e852]" />
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Docked Status Legend (Bottom Left Glassmorphism) */}
      {showControls && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-md px-3.5 py-2 text-xs font-semibold text-slate-800 flex items-center gap-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
            <span>Planned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
            <span>Approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
            <span>Ongoing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
            <span>Delayed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
            <span>Completed</span>
          </div>
        </div>
      )}
    </div>
  )
}
