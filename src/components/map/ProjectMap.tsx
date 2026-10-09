import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import type { Project, Department } from '../../types'
import { PROJECT_STATUS_LABELS } from '../../types'
import { StatusBadge } from '../ui/StatusBadge'

// Fix Leaflet default icon issue with bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const statusColors: Record<string, string> = {
  planned: '#3b82f6',
  in_progress: '#10b981',
  delayed: '#ef4444',
  completed: '#22c55e',
  cancelled: '#94a3b8',
}

function createStatusIcon(status: string, deptColor?: string) {
  const color = statusColors[status] || '#64748b'
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 28px; height: 28px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      ">
        <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

// Pune center coordinates
const PUNE_CENTER: [number, number] = [18.5204, 73.8567]
const DEFAULT_ZOOM = 12

interface ProjectMapProps {
  projects: Project[]
  departments: Department[]
  selectedProject?: Project | null
  onSelectProject?: (project: Project | null) => void
  height?: string
  center?: [number, number]
  zoom?: number
}

function FitBounds({ projects }: { projects: Project[] }) {
  const map = useMap()

  useEffect(() => {
    if (projects.length > 0) {
      const bounds = L.latLngBounds(projects.map(p => [p.location.lat, p.location.lng]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }, [projects, map])

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
}: ProjectMapProps) {
  const deptMap = new Map(departments.map(d => [d.id, d]))

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds projects={projects} />
        {projects.map(project => {
          const dept = deptMap.get(project.departmentId)
          return (
            <Marker
              key={project.id}
              position={[project.location.lat, project.location.lng]}
              icon={createStatusIcon(project.status, dept?.color)}
              eventHandlers={{
                click: () => onSelectProject?.(project),
              }}
            >
              <Popup maxWidth={280} minWidth={220}>
                <div style={{ fontFamily: 'Inter, sans-serif' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 4px', lineHeight: 1.3, color: '#0f172a' }}>
                    {project.title}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 8px' }}>
                    {project.road}, {project.locality}
                  </p>
                  {dept && (
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 4px' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: dept.color, marginRight: 4 }} />
                      {dept.shortName}
                    </p>
                  )}
                  <p style={{ fontSize: '0.75rem', margin: '0 0 8px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '1px 8px',
                      borderRadius: 9999,
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      backgroundColor: statusColors[project.status] + '20',
                      color: statusColors[project.status],
                    }}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                  </p>
                  <Link
                    to={`/projects/${project.id}`}
                    style={{ fontSize: '0.75rem', color: '#0d9488', fontWeight: 500 }}
                  >
                    View Details →
                  </Link>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur rounded-lg shadow-md px-3 py-2.5 text-xs">
        <p className="font-semibold text-[var(--navy-700)] mb-1.5">Project Status</p>
        <div className="space-y-1">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
              <span className="text-[var(--neutral-600)] capitalize">{status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
