import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  MapPin, AlertTriangle, CheckCircle2, Clock, Calendar,
  Building2, Layers, AlertOctagon, ArrowRight, ShieldAlert,
  ArrowLeft, Search, RefreshCw, ChevronRight
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

  const pastProjects = roadProjects.filter(p => p.status === 'completed')
  const currentProjects = roadProjects.filter(p => p.status === 'in_progress' || p.status === 'delayed')
  const plannedProjects = roadProjects.filter(p => p.status === 'planned')

  const hasRecentResurfacing = pastProjects.some(p => p.category === 'road_resurfacing' || p.category === 'road_construction')
  const hasUpcomingExcavation = [...currentProjects, ...plannedProjects].some(
    p => p.category === 'water_pipeline' || p.category === 'gas_pipeline' || p.category === 'drainage' || p.category === 'telecom'
  )
  const isMoratoriumViolation = hasRecentResurfacing && hasUpcomingExcavation

  const roadProjectIds = new Set(roadProjects.map(p => p.id))
  const roadAlerts = alerts.filter(a => roadProjectIds.has(a.projectAId) || roadProjectIds.has(a.projectBId))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center text-xs font-bold text-[#64748B] hover:text-[#2F6BFF] mb-2 no-underline"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Permits Explorer
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAF1FF] text-[#2F6BFF] border border-[#2F6BFF]/20 mb-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Repeat Digging Radar &amp; Moratorium Tracker</span>
            </div>
            <h1 className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl font-extrabold text-[#1E293B] tracking-tight">
              Corridor Timeline: {currentRoad || 'Select Corridor'}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
              Prevent newly paved roads from being dug up again. Track multi-agency utility works and repeat excavation frequency on this transit corridor.
            </p>
          </div>

          {/* Quick Corridor Selector dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B] whitespace-nowrap font-bold">Switch Corridor:</span>
            <select
              value={currentRoad}
              onChange={(e) => handleSelectRoad(e.target.value)}
              className="text-xs font-bold rounded-xl border border-[#CBD5E1] bg-white text-[#1E293B] px-3 py-2 focus:border-[#2F6BFF] focus:outline-none shadow-2xs cursor-pointer"
            >
              {availableRoads.map(r => (
                <option key={r.road} value={r.road}>
                  {r.road} ({r.count} permits)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Moratorium / Repeat Excavation Hatch Banner */}
      {isMoratoriumViolation && (
        <div className="border border-[#F0386B]/30 rounded-2xl overflow-hidden shadow-2xs">
          <div className="h-2 clash-hatch border-b border-[#F0386B]/20"></div>
          <div className="p-4 bg-[#FFE6EE] flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#C41F4F] text-white shrink-0 mt-0.5 shadow-xs">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C41F4F]">
                  CRITICAL REPEAT-EXCAVATION RISK
                </span>
                <span className="bg-[#C41F4F] text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                  Moratorium Breached
                </span>
              </div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#1E293B]">
                Road Resurfaced Recently While Subsurface Utility Trenching Is Scheduled!
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                This corridor underwent asphalt resurfacing in the last 12 months. An upcoming or active utility excavation (water/power/telecom) threatens to slice into the fresh asphalt. Co-ducting or schedule synchronization is required under Pune Section 42 Bylaws.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Corridor Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-[#E3EAF2] shadow-2xs">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">Total Work Orders</span>
          <span className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#1E293B]">{roadProjects.length}</span>
          <span className="text-[10px] text-[#64748B] mt-0.5 block">Historical &amp; planned</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E3EAF2] shadow-2xs">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">Active Digs Right Now</span>
          <span className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#FFB020]">{currentProjects.length}</span>
          <span className="text-[10px] text-[#64748B] mt-0.5 block">Live street trenches</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E3EAF2] shadow-2xs">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">Scheduled Future Digs</span>
          <span className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#2F6BFF]">{plannedProjects.length}</span>
          <span className="text-[10px] text-[#64748B] mt-0.5 block">Opportunity to Dig-Once</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E3EAF2] shadow-2xs">
          <span className="text-[10px] font-bold text-[#C41F4F] uppercase block">Clashes Flagged</span>
          <span className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#C41F4F]">{roadAlerts.length}</span>
          <span className="text-[10px] text-[#64748B] mt-0.5 block">Inter-agency overlaps</span>
        </div>
      </div>

      {/* Multi-Agency Chronological Timeline */}
      <div className="bg-white rounded-2xl border border-[#E3EAF2] p-5 sm:p-6 space-y-6 shadow-2xs">
        <div>
          <h2 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#1E293B]">
            Corridor Lifecycle &amp; Excavation Sequence
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Chronological inspection of which agencies dug this road, who is on site right now, and who plans to dig next.
          </p>
        </div>

        {/* Phase 1: Completed / Past Excavations */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0E7A55]">
            <CheckCircle2 className="w-4 h-4 text-[#12B5A6]" />
            <span>1. Completed Works ({pastProjects.length})</span>
          </div>
          {pastProjects.length === 0 ? (
            <p className="text-xs text-[#94A3B8] italic pl-6">No completed historical records logged in CivicLens for this corridor yet.</p>
          ) : (
            <div className="space-y-2.5 pl-3.5 border-l-2 border-[#12B5A6]/40">
              {pastProjects.map(p => (
                <div key={p.id} className="p-3 rounded-xl bg-[#F6F9FC] border border-[#E3EAF2] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[#64748B]">Completed {p.actualEndDate || p.originalEndDate}</span>
                      <span className="badge completed text-[10px] py-0 px-1.5">
                        {p.category.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-xs text-[#1E293B] mt-0.5">{p.title}</h4>
                    <p className="text-[11px] text-[#64748B] mt-0.2">Contractor: {p.contractor} • Outlay: ₹{p.budgetLakhs}L</p>
                  </div>
                  <Link
                    to={`/projects/${p.id}`}
                    className="text-xs font-bold text-[#2F6BFF] hover:underline shrink-0 no-underline"
                  >
                    View Project Dossier →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phase 2: Active Ongoing Work */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9A6200]">
            <Clock className="w-4 h-4 text-[#FFB020]" />
            <span>2. Active On-Street Disruption ({currentProjects.length})</span>
          </div>
          {currentProjects.length === 0 ? (
            <p className="text-xs text-[#94A3B8] italic pl-6">No active ongoing trenches on this corridor right now.</p>
          ) : (
            <div className="space-y-2.5 pl-3.5 border-l-2 border-[#FFB020]">
              {currentProjects.map(p => (
                <div key={p.id} className="p-3.5 rounded-xl bg-[#FFF4DB]/50 border border-[#FFB020]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="badge ongoing text-[10px] py-0 px-1.5">
                        {p.progressPercent}% Complete
                      </span>
                      <span className="text-[10px] font-mono text-[#64748B]">{p.id}</span>
                    </div>
                    <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-xs text-[#1E293B] mt-0.5">{p.title}</h4>
                    <p className="text-[11px] text-[#64748B] mt-0.2">
                      Contractor: {p.contractor} • Original Deadline: {p.originalEndDate}
                      {p.revisedEndDate && <span className="text-[#D13B41] font-bold ml-1">(Delayed to {p.revisedEndDate})</span>}
                    </p>
                  </div>
                  <Link
                    to={`/projects/${p.id}`}
                    className="btn-primary text-xs py-1.5 px-3 shrink-0 no-underline"
                  >
                    Inspect Permit
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phase 3: Planned Upcoming Digs */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1B7FC4]">
            <Calendar className="w-4 h-4 text-[#38A9F5]" />
            <span>3. Future Scheduled Work Orders ({plannedProjects.length})</span>
          </div>
          {plannedProjects.length === 0 ? (
            <p className="text-xs text-[#94A3B8] italic pl-6">No future excavation permits queued for this corridor.</p>
          ) : (
            <div className="space-y-2.5 pl-3.5 border-l-2 border-[#38A9F5]">
              {plannedProjects.map(p => (
                <div key={p.id} className="p-3 rounded-xl bg-[#E6F4FE]/50 border border-[#38A9F5]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="badge planned text-[10px] py-0 px-1.5">
                      Scheduled {p.startDate} to {p.originalEndDate}
                    </span>
                    <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-xs text-[#1E293B] mt-1">{p.title}</h4>
                    <p className="text-[11px] text-[#64748B]">Agency: {p.contractor} • Budget: ₹{p.budgetLakhs}L</p>
                  </div>
                  <Link
                    to={`/projects/${p.id}`}
                    className="text-xs font-bold text-[#2F6BFF] hover:underline shrink-0 no-underline"
                  >
                    Review Schedule →
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
