import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import {
  Layers, MapPin, ExternalLink, Globe, Compass,
  Eye, CheckCircle2, AlertTriangle, ShieldCheck
} from 'lucide-react'
import type { Project, Department } from '../../types'
import { PROJECT_STATUS_LABELS } from '../../types'

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

// Pune Center
const PUNE_CENTER: [number, number] = [18.5204, 73.8567]
const DEFAULT_ZOOM = 13

interface ProjectMapProps {
  projects: Project[]
  departments: Department[]
  selectedProject?: Project | null
  onSelectProject?: (project: Project | null) => void
  height?: string
  center?: [number, number]
  zoom?: number
  showControls?: boolean
}

function MapController({
  projects,
  selectedProject,
  resetTrigger
}: {
  projects: Project[]
  selectedProject?: Project | null
  resetTrigger: number
}) {
  const map = useMap()

  // Fly to selected project
  useEffect(() => {
    if (selectedProject) {
      map.flyTo([selectedProject.location.lat, selectedProject.location.lng], 15, {
        animate: true,
        duration: 0.8,
      })
    }
  }, [selectedProject, map])

  // Fit bounds when reset trigger changes
  useEffect(() => {
    if (resetTrigger > 0 && projects.length > 0) {
      const bounds = L.latLngBounds(projects.map(p => [p.location.lat, p.location.lng]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
    }
  }, [resetTrigger, projects, map])

  return null
}

export function ProjectMap({
  projects,
  departments,
  selectedProject,
  onSelectProject,
  height = '100%',
  center = PUNE_CENTER,
  zoom = DEFAULT_ZOOM,
  showControls = true,
}: ProjectMapProps) {
  // Basemap style mode: 'satellite' | 'urban' | 'light'
  const [basemap, setBasemap] = useState<'satellite' | 'urban' | 'light'>('satellite')
  const [resetTrigger, setResetTrigger] = useState(0)
  const deptMap = new Map(departments.map(d => [d.id, d]))

  const handleResetView = () => {
    setResetTrigger(prev => prev + 1)
  }

  return (
    <div style={{ height, width: '100%' }} className="relative font-sans overflow-hidden select-none">
      {/* Floating Realistic Basemap Switcher (Top Right Glassmorphism) */}
      {showControls && (
        <div className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-xl p-1 shadow-md flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setBasemap('satellite')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 border-none cursor-pointer ${
              basemap === 'satellite'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
            title="Ultra-realistic aerial satellite photography with street overlays"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Realistic Satellite</span>
          </button>

          <button
            type="button"
            onClick={() => setBasemap('urban')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 border-none cursor-pointer ${
              basemap === 'urban'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
            title="Lush detailed urban street cartography"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Urban Street</span>
          </button>

          <button
            type="button"
            onClick={() => setBasemap('light')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 border-none cursor-pointer ${
              basemap === 'light'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
            title="High contrast clean cartographic canvas"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Civic Canvas</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
            title="Reset to Pune View"
          >
            <MapPin className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      )}

      {/* The Leaflet Container */}
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <MapController
          projects={projects}
          selectedProject={selectedProject}
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

        {/* 2. Detailed Urban Cartography (Carto Voyager) */}
        {basemap === 'urban' && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
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
                      <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                      <span>{project.road}, {project.ward}</span>
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                      <span>Physical Progress</span>
                      <span className="font-bold text-teal-600">{project.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-teal-600 h-1.5 rounded-full"
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
                      className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors no-underline shadow-xs"
                    >
                      <span>Open Project Audit</span>
                      <ExternalLink className="w-3 h-3" />
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
