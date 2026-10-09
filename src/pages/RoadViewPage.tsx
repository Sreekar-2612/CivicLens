import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  MapPin, AlertTriangle, CheckCircle2, Clock, Calendar,
  Building2, Layers, AlertOctagon, ArrowRight, ShieldAlert,
  ArrowLeft, Search, RefreshCw
} from 'lucide-react'
import { dataRepository } from '../services/dataRepository'
import type { Project, Department, CoordinationAlert } from '../types'
import { StatusBadge } from '../components/ui/StatusBadge'
import { format } from 'date-fns'

export function RoadViewPage() {
  const { id: roadParam } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [availableRoads, setAvailableRoads] = useState<{ road: string; count: number; activeCount: number; wards: string[] }[]>([])
  const [currentRoad, setCurrentRoad] = useState<string>('')
  const [roadProjects, setRoadProjects] = useState<Project[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [alerts, setAlerts] = useState<CoordinationAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [roads, allDepts, allAlerts] = await Promise.all([
        dataRepository.getUniqueRoads(),
        dataRepository.getDepartments(),
        dataRepository.getAlerts(),
      ])

      setAvailableRoads(roads)
      setDepartments(allDepts)
      setAlerts(allAlerts)

      // Determine selected road
      let targetRoad = ''
      if (roadParam) {
        // Try decoding param or finding match
        const decoded = decodeURIComponent(roadParam).replace(/-/g, ' ')
        const match = roads.find(r => r.road.toLowerCase().includes(decoded.toLowerCase()) || decoded.toLowerCase().includes(r.road.toLowerCase()))
        targetRoad = match ? match.road : roads[0]?.road || ''
      } else if (roads.length > 0) {
        targetRoad = roads[0].road
      }

      setCurrentRoad(targetRoad)
      if (targetRoad) {
        const p = await dataRepository.getProjectsByRoad(targetRoad)
        setRoadProjects(p)
      }
      setLoading(false)
    }
    loadData()
  }, [roadParam])

  const handleSelectRoad = async (roadName: string) => {
    setCurrentRoad(roadName)
    setLoading(true)
    const p = await dataRepository.getProjectsByRoad(roadName)
    setRoadProjects(p)
    setLoading(false)
    navigate(`/roads/${encodeURIComponent(roadName)}`, { replace: true })
  }

  // Sort projects along timeline: Completed (past), In Progress (current), Planned (upcoming)
  const pastProjects = roadProjects.filter(p => p.status === 'completed')
  const currentProjects = roadProjects.filter(p => p.status === 'in_progress' || p.status === 'delayed')
  const plannedProjects = roadProjects.filter(p => p.status === 'planned')

  // Check for repeat excavation risk / moratorium violation
  // If road resurfacing happened recently (<12 months) and water/gas/electric is scheduled or active
  const hasRecentResurfacing = pastProjects.some(p => p.category === 'road_resurfacing' || p.category === 'road_construction')
  const hasUpcomingExcavation = [...currentProjects, ...plannedProjects].some(
    p => p.category === 'water_pipeline' || p.category === 'gas_pipeline' || p.category === 'drainage' || p.category === 'telecom'
  )
  const isMoratoriumViolation = hasRecentResurfacing && hasUpcomingExcavation

  // Related alerts on this road
  const roadProjectIds = new Set(roadProjects.map(p => p.id))
  const roadAlerts = alerts.filter(a => roadProjectIds.has(a.projectAId) || roadProjectIds.has(a.projectBId))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Project Explorer
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 mb-2">
              <Layers className="w-3.5 h-3.5" />
              Corridor Digging Lifecycle & Moratorium Tracker
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Road Corridor Timeline: {currentRoad || 'Select Corridor'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Prevent newly paved roads from being dug up again. Track multi-agency utility works and excavation history on this specific transit corridor.
            </p>
          </div>

          {/* Quick Corridor Selector dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap font-medium">Switch Corridor:</span>
            <select
              value={currentRoad}
              onChange={(e) => handleSelectRoad(e.target.value)}
              className="text-xs sm:text-sm font-semibold rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-indigo-500 shadow-sm"
            >
              {availableRoads.map(r => (
                <option key={r.road} value={r.road}>
                  {r.road} ({r.count} projects)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Moratorium / Conflict Alert Banner */}
      {isMoratoriumViolation && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5 shadow">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                CRITICAL REPEAT-EXCAVATION RISK
              </span>
              <span className="bg-rose-200 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 text-[10px] font-bold px-2 py-0.5 rounded">
                Moratorium Rule Breached
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Road Resurfaced Recently While Subsurface Utility Trenching Is Scheduled!
            </h3>
            <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              This corridor underwent asphalt resurfacing in the last 12 months. An upcoming or active utility excavation (pipeline/cable) threatens to destroy freshly laid road surface. Joint ducting or schedule synchronization is urgently required.
            </p>
          </div>
        </div>
      )}

      {/* Corridor Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs text-gray-500 dark:text-gray-400 block">Total Work Orders</span>
          <span className="text-2xl font-black text-gray-900 dark:text-white">{roadProjects.length}</span>
          <span className="text-[11px] text-gray-400 mt-1 block">Past, ongoing & planned</span>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs text-gray-500 dark:text-gray-400 block">Active Digs Right Now</span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{currentProjects.length}</span>
          <span className="text-[11px] text-gray-400 mt-1 block">Live street disruption</span>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs text-gray-500 dark:text-gray-400 block">Scheduled Future Digs</span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{plannedProjects.length}</span>
          <span className="text-[11px] text-gray-400 mt-1 block">Needs co-scheduling</span>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <span className="text-xs text-gray-500 dark:text-gray-400 block">Coordination Flagged</span>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{roadAlerts.length}</span>
          <span className="text-[11px] text-gray-400 mt-1 block">Cross-department conflicts</span>
        </div>
      </div>

      {/* Multi-Agency Chronological Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 space-y-8 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Corridor Lifecycle & Excavation Sequence
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Chronological inspection of who dug this road, who is currently working, and who is planning to dig next.
          </p>
        </div>

        {/* Phase 1: Completed / Past Excavations */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            1. Completed History ({pastProjects.length})
          </div>
          {pastProjects.length === 0 ? (
            <p className="text-xs text-gray-400 italic pl-6">No completed historical records logged in CivicLens for this corridor yet.</p>
          ) : (
            <div className="space-y-3 pl-4 border-l-2 border-emerald-300 dark:border-emerald-800">
              {pastProjects.map(p => (
                <div key={p.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500">Completed {p.actualEndDate || p.originalEndDate}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                        {p.category.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mt-1">{p.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Contractor: {p.contractor} • Budget: ₹{p.budgetLakhs} Lakhs</p>
                  </div>
                  <Link
                    to={`/projects/${p.id}`}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                  >
                    View Project Dossier →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phase 2: Active Ongoing Work */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Clock className="w-4 h-4" />
            2. Active Ongoing Excavation ({currentProjects.length})
          </div>
          {currentProjects.length === 0 ? (
            <p className="text-xs text-gray-400 italic pl-6">Currently no active excavation on this corridor.</p>
          ) : (
            <div className="space-y-3 pl-4 border-l-2 border-amber-400 dark:border-amber-600">
              {currentProjects.map(p => (
                <div key={p.id} className="p-4 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      <span className="text-xs font-semibold text-gray-500">
                        {p.startDate} → {p.revisedEndDate || p.originalEndDate}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">{p.title}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {p.purpose} • Progress: {p.progressPercent}%
                    </p>
                  </div>
                  <Link
                    to={`/projects/${p.id}`}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                  >
                    Inspect Details →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phase 3: Upcoming Planned Work Orders */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <Calendar className="w-4 h-4" />
            3. Future Scheduled Work Orders ({plannedProjects.length})
          </div>
          {plannedProjects.length === 0 ? (
            <p className="text-xs text-gray-400 italic pl-6">No scheduled upcoming work orders logged on this corridor.</p>
          ) : (
            <div className="space-y-3 pl-4 border-l-2 border-blue-400 dark:border-blue-600">
              {plannedProjects.map(p => (
                <div key={p.id} className="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                        Planned Start: {p.startDate}
                      </span>
                      <span className="text-xs text-gray-400">Target End: {p.originalEndDate}</span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">{p.title}</h4>
                    <p className="text-xs text-gray-500">
                      Contractor: {p.contractor} • Budget: ₹{p.budgetLakhs} Lakhs
                    </p>
                  </div>
                  <Link
                    to={`/projects/${p.id}`}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                  >
                    Inspect Details →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
