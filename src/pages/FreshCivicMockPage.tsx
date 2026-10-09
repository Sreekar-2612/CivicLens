import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin, ShieldAlert, AlertTriangle, CheckCircle2, Clock,
  Layers, Search, Download, Camera, SlidersHorizontal, ChevronRight,
  ChevronDown, ExternalLink, ArrowUpRight, UserCheck, ShieldCheck, RefreshCw, X,
  Maximize2, Eye, Droplets, HardHat, Wifi, Zap
} from 'lucide-react'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Custom marker icon helper with rich road labels
const createCustomMarker = (color: string, label: string, subtext?: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background: #ffffff;
        border: 2px solid ${color};
        color: #1e293b;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 700;
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(30, 41, 59, 0.12);
        white-space: nowrap;
        display: flex;
        flex-direction: column;
        line-height: 1.2;
      ">
        <div style="display:flex; align-items:center; gap:5px;">
          <span style="display:inline-block; width:6px; height:6px; border-radius:999px; background:${color};"></span>
          <span>${label}</span>
        </div>
        ${subtext ? `<span style="font-size:9px; color:#64748b; font-weight:500; margin-left:11px;">${subtext}</span>` : ''}
      </div>
    `,
    iconSize: [130, 32],
    iconAnchor: [65, 16],
  })
}

// Sample mock corridor coordinates around Pune
const FC_ROAD_COORDS: [number, number][] = [
  [18.5285, 73.8440],
  [18.5240, 73.8420],
  [18.5195, 73.8405],
  [18.5150, 73.8390],
]

const JM_ROAD_COORDS: [number, number][] = [
  [18.5310, 73.8490],
  [18.5250, 73.8475],
  [18.5180, 73.8460],
]

const MODEL_COLONY_COORDS: [number, number][] = [
  [18.5360, 73.8370],
  [18.5320, 73.8420],
]

const KARVE_ROAD_COORDS: [number, number][] = [
  [18.5120, 73.8360],
  [18.5060, 73.8290],
  [18.5000, 73.8220],
]

export function FreshCivicMockPage() {
  const mapRef = useRef<L.Map | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'ongoing' | 'clash' | 'delayed' | 'approved'>('all')
  const [selectedWard, setSelectedWard] = useState('Ward 07 [Shivajinagar - Deccan]')
  const [viewMode, setViewMode] = useState<'citizen' | 'officer'>('officer')
  const [isClashAccordionOpen, setIsClashAccordionOpen] = useState(true)
  const [activeLayers, setActiveLayers] = useState({
    water: true,
    road: true,
    telecom: true,
    power: true,
  })
  const [showHearingModal, setShowHearingModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  return (
    <div className="min-h-screen bg-[#F6F9FC] text-[#1E293B] font-['Inter',sans-serif] flex flex-col">
      {/* Top Banner */}
      <div className="bg-[#2F6BFF] text-white px-4 py-1.5 text-xs font-medium flex items-center justify-between border-b border-[#2559D6]">
        <div className="flex items-center gap-2">
          <span className="bg-white/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]">
            Adjusted Fresh Civic Prototype
          </span>
          <span>Tight padding, prominent search &amp; ward selector, floating layer radar, and compact clash accordion.</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/projects" className="underline hover:text-white/80 text-xs">
            Back to App
          </Link>
        </div>
      </div>

      {/* Main Header with 3px Electric Blue bottom border */}
      <header className="bg-white border-b-3 border-[#2F6BFF] sticky top-0 z-40 shadow-xs">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2F6BFF] text-white flex items-center justify-center font-bold text-base shadow-xs">
                CL
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-base text-[#1E293B] tracking-tight">
                    CivicLens
                  </span>
                  <span className="bg-[#E3F7F5] text-[#12B5A6] text-[10px] font-bold px-2 py-0.2 rounded-full uppercase border border-[#12B5A6]/20">
                    PMC LIVE
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Prominent Ward Selector & Prominent Search Bar */}
          <div className="flex items-center gap-3 flex-1 max-w-2xl">
            {/* Prominent Ward Selector */}
            <div className="flex items-center gap-2 bg-[#F6F9FC] border-2 border-[#2F6BFF]/30 hover:border-[#2F6BFF] transition-colors rounded-xl px-3 py-1.5 text-xs font-bold text-[#1E293B] shadow-xs cursor-pointer">
              <MapPin className="w-4 h-4 text-[#2F6BFF] shrink-0" />
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className="bg-transparent border-0 text-xs font-bold text-[#1E293B] focus:ring-0 cursor-pointer pr-3"
              >
                <option>Ward 07 [Shivajinagar - Deccan]</option>
                <option>Ward 02 [Aundh - Baner]</option>
                <option>Ward 12 [Kothrud - Karve Rd]</option>
                <option>Ward 15 [Camp - Cantonment]</option>
              </select>
            </div>

            {/* Prominent Search Bar */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#2F6BFF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search road corridor, permit #, department, or contractor..."
                className="w-full bg-[#F6F9FC] border border-[#CBD5E1] hover:border-[#2F6BFF] focus:border-[#2F6BFF] focus:bg-white rounded-xl pl-9 pr-14 py-1.5 text-xs font-medium text-[#1E293B] placeholder-[#64748B] focus:outline-none transition-all shadow-xs"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-white border border-[#E3EAF2] text-[#64748B] px-1.5 py-0.5 rounded shadow-2xs">
                ⌘K
              </span>
            </div>
          </div>

          {/* Role switcher & Telemetry pill */}
          <div className="flex items-center gap-3">
            <div className="hidden xl:flex items-center gap-1.5 bg-[#E3F7F5] border border-[#12B5A6]/20 text-[#12B5A6] text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#12B5A6] animate-pulse"></span>
              <span>Telemetry: 4m ago</span>
            </div>

            <div className="bg-[#F6F9FC] p-0.5 border border-[#E3EAF2] rounded-lg flex items-center text-xs font-semibold">
              <button
                onClick={() => setViewMode('citizen')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  viewMode === 'citizen'
                    ? 'bg-white text-[#2F6BFF] shadow-xs font-bold'
                    : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                Citizen
              </button>
              <button
                onClick={() => setViewMode('officer')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  viewMode === 'officer'
                    ? 'bg-[#2F6BFF] text-white shadow-xs font-bold'
                    : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                Officer / Auditor
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Top Telemetry KPI Strip — Decreased padding, compact quantitative density */}
      <section className="max-w-[1600px] mx-auto px-4 lg:px-6 pt-3 pb-2 w-full">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Active Permits */}
          <div className="bg-white border border-[#E3EAF2] rounded-xl p-3 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                Active Permits
              </span>
              <span className="badge bg-[#E3F7F5] text-[#12B5A6] text-[10px] py-0 px-1.5">
                +2 this week
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#1E293B]">
                28
              </span>
              <span className="text-[11px] text-[#64748B] font-medium">
                Corridors active
              </span>
            </div>
            <p className="text-[10px] text-[#64748B] mt-1 border-t border-[#F1F5F9] pt-1">
              14 Water • 8 Telecom • 6 Road
            </p>
          </div>

          {/* Card 2: Taxpayer Outlay */}
          <div className="bg-white border border-[#E3EAF2] rounded-xl p-3 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                Taxpayer Outlay
              </span>
              <span className="text-[10px] font-semibold text-[#2F6BFF] bg-[#EAF1FF] px-1.5 py-0 rounded">
                Ward 07 Escrow
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#1E293B]">
                ₹142.8 Cr
              </span>
              <span className="text-[11px] text-[#12B5A6] font-bold">
                62% Disbursed
              </span>
            </div>
            <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-[#12B5A6] h-full rounded-full w-[62%]"></div>
            </div>
          </div>

          {/* Card 3: Schedule Variance */}
          <div className="bg-white border border-[#E3EAF2] rounded-xl p-3 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                Schedule Variance
              </span>
              <span className="badge bg-[#FFE9EA] text-[#D13B41] text-[10px] py-0 px-1.5">
                Critical Variance
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#D13B41]">
                +18.4 Days
              </span>
              <span className="text-[11px] text-[#64748B] font-medium">
                avg breach
              </span>
            </div>
            <p className="text-[10px] text-[#64748B] mt-1 border-t border-[#F1F5F9] pt-1">
              Locked baseline deadline active
            </p>
          </div>

          {/* Card 4: Repeat Digging Alerts */}
          <div className="bg-white border border-[#E3EAF2] rounded-xl p-3 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#C41F4F] uppercase tracking-wider">
                Repeat Digging
              </span>
              <span className="badge bg-[#FFE6EE] text-[#C41F4F] text-[10px] py-0 px-1.5">
                42% Clash Risk
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#C41F4F]">
                5 Corridors
              </span>
              <span className="text-[11px] text-[#64748B] font-medium">
                Re-excavation hazard
              </span>
            </div>
            <p className="text-[10px] text-[#64748B] mt-1 border-t border-[#F1F5F9] pt-1">
              Resurfaced &lt;90 days ago
            </p>
          </div>
        </div>
      </section>

      {/* Filter Tabs Bar */}
      <section className="max-w-[1600px] mx-auto px-4 lg:px-6 py-1.5 w-full flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-full font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-[#1E293B] text-white shadow-2xs'
                : 'bg-white text-[#64748B] border border-[#E3EAF2] hover:bg-[#F6F9FC]'
            }`}
          >
            All Permits (28)
          </button>
          <button
            onClick={() => setActiveFilter('ongoing')}
            className={`px-3 py-1 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'ongoing'
                ? 'bg-[#FFB020] text-[#1E293B] shadow-2xs font-bold'
                : 'bg-[#FFF4DB] text-[#9A6200] border border-[#FFB020]/30 hover:bg-[#FFEEC2]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFB020]"></span>
            Ongoing (11)
          </button>
          <button
            onClick={() => setActiveFilter('clash')}
            className={`px-3 py-1 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'clash'
                ? 'bg-[#F0386B] text-white shadow-2xs font-bold'
                : 'bg-[#FFE6EE] text-[#C41F4F] border border-[#F0386B]/30 hover:bg-[#FFD4E1]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#F0386B]"></span>
            Agency Clashes (5)
          </button>
          <button
            onClick={() => setActiveFilter('delayed')}
            className={`px-3 py-1 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'delayed'
                ? 'bg-[#FF5A5F] text-white shadow-2xs font-bold'
                : 'bg-[#FFE9EA] text-[#D13B41] border border-[#FF5A5F]/30 hover:bg-[#FFD8DA]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A5F]"></span>
            Delayed (4)
          </button>
          <button
            onClick={() => setActiveFilter('approved')}
            className={`px-3 py-1 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'approved'
                ? 'bg-[#8B6CF0] text-white shadow-2xs font-bold'
                : 'bg-[#F0EBFE] text-[#6A4FD1] border border-[#8B6CF0]/30 hover:bg-[#E5DCFD]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B6CF0]"></span>
            Approved (8)
          </button>
        </div>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden lg:flex items-center gap-1 text-xs font-semibold text-[#64748B] hover:text-[#1E293B] bg-white border border-[#E3EAF2] px-2.5 py-1 rounded-lg"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{isSidebarOpen ? 'Compact' : 'Expand'}</span>
        </button>
      </section>

      {/* Main Content Area */}
      <main className="max-w-[1600px] mx-auto px-4 lg:px-6 pb-6 flex-1 w-full flex flex-col lg:flex-row gap-4">
        {/* Dominant GIS Map Canvas (70% - 75%) */}
        <div className={`relative bg-white border border-[#E3EAF2] rounded-xl overflow-hidden shadow-xs min-h-[520px] lg:min-h-[680px] transition-all ${
          isSidebarOpen ? 'lg:w-[67%] xl:w-[72%]' : 'w-full'
        }`}>
          {/* Floating Map Controls & Layer Radar (Top-Right) */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 items-end">
            {/* Recenter Button */}
            <div className="bg-white/95 backdrop-blur border border-[#E3EAF2] rounded-lg p-1 shadow-sm flex items-center gap-1">
              <button
                onClick={() => mapRef.current?.flyTo([18.5240, 73.8420], 14)}
                title="Fit to Ward"
                className="p-1.5 bg-white hover:bg-[#F6F9FC] text-[#1E293B] border border-[#E3EAF2] rounded-lg shadow-xs text-xs font-semibold flex items-center gap-1"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#2F6BFF]" />
                <span className="hidden sm:inline">Fit Ward</span>
              </button>
            </div>

            {/* Floating Layer Radar Pills */}
            <div className="bg-white/95 backdrop-blur border border-[#E3EAF2] rounded-xl p-1.5 shadow-sm flex flex-col gap-1 text-[11px] font-semibold text-[#1E293B]">
              <span className="text-[9px] uppercase tracking-wider text-[#64748B] font-bold px-1.5 pt-0.5">
                Active Conduits:
              </span>
              <button
                onClick={() => setActiveLayers(prev => ({ ...prev, water: !prev.water }))}
                className={`flex items-center justify-between gap-3 px-2 py-1 rounded-lg transition-colors ${
                  activeLayers.water ? 'bg-[#EAF1FF] text-[#2F6BFF]' : 'text-[#94A3B8] hover:bg-[#F6F9FC]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Droplets className="w-3 h-3 text-[#2F6BFF]" />
                  <span>Water Mains (12)</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#2F6BFF]"></span>
              </button>
              <button
                onClick={() => setActiveLayers(prev => ({ ...prev, road: !prev.road }))}
                className={`flex items-center justify-between gap-3 px-2 py-1 rounded-lg transition-colors ${
                  activeLayers.road ? 'bg-[#FFF4DB] text-[#9A6200]' : 'text-[#94A3B8] hover:bg-[#F6F9FC]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <HardHat className="w-3 h-3 text-[#FFB020]" />
                  <span>Road Works (8)</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#FFB020]"></span>
              </button>
              <button
                onClick={() => setActiveLayers(prev => ({ ...prev, telecom: !prev.telecom }))}
                className={`flex items-center justify-between gap-3 px-2 py-1 rounded-lg transition-colors ${
                  activeLayers.telecom ? 'bg-[#F0EBFE] text-[#6A4FD1]' : 'text-[#94A3B8] hover:bg-[#F6F9FC]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-3 h-3 text-[#8B6CF0]" />
                  <span>Telecom Fiber (6)</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#8B6CF0]"></span>
              </button>
            </div>
          </div>

          {/* Leaflet Map with Clean Light Tiles */}
          <MapContainer
            ref={mapRef}
            center={[18.5240, 73.8420]}
            zoom={14}
            className="w-full h-full min-h-[520px] lg:min-h-[680px] z-0"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> &copy; OpenStreetMap'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            />

            {/* FC Road Corridor with Repeat Digging Clash */}
            {activeLayers.road && (
              <>
                <Polyline
                  positions={FC_ROAD_COORDS}
                  pathOptions={{
                    color: '#FFB020',
                    weight: 8,
                    opacity: 0.9,
                    lineCap: 'round',
                  }}
                />
                <Polyline
                  positions={FC_ROAD_COORDS}
                  pathOptions={{
                    color: '#F0386B',
                    weight: 5,
                    dashArray: '8, 8',
                    opacity: 0.95,
                  }}
                />
              </>
            )}

            {/* JM Road: Completed */}
            <Polyline
              positions={JM_ROAD_COORDS}
              pathOptions={{
                color: '#22C58B',
                weight: 6,
                opacity: 0.85,
              }}
            />

            {/* Model Colony: Delayed */}
            <Polyline
              positions={MODEL_COLONY_COORDS}
              pathOptions={{
                color: '#FF5A5F',
                weight: 6,
                opacity: 0.85,
              }}
            />

            {/* Karve Road: Approved */}
            {activeLayers.telecom && (
              <Polyline
                positions={KARVE_ROAD_COORDS}
                pathOptions={{
                  color: '#8B6CF0',
                  weight: 6,
                  opacity: 0.85,
                }}
              />
            )}

            {/* Rich Road Marker Labels */}
            <Marker
              position={[18.5285, 73.8440]}
              icon={createCustomMarker('#F0386B', 'FC Road [CLASH]', '1.4 km • Water vs 5G Duct')}
            >
              <Popup>
                <div className="p-1 font-['Inter']">
                  <span className="badge bg-[#FFE6EE] text-[#C41F4F] mb-1">Critical Clash</span>
                  <p className="font-bold text-xs text-[#1E293B]">Fergusson College Road</p>
                  <p className="text-[11px] text-[#64748B]">Water Pipeline cuts newly laid 5G Fiber</p>
                </div>
              </Popup>
            </Marker>

            <Marker
              position={[18.5250, 73.8475]}
              icon={createCustomMarker('#22C58B', 'JM Road [Done]', '2.1 km • Asphalt Resurfaced')}
            />

            <Marker
              position={[18.5340, 73.8395]}
              icon={createCustomMarker('#FF5A5F', 'Model Colony', '900m • Trenching Stalled')}
            />
          </MapContainer>

          {/* Docked Status Matrix Legend (Neat Bottom-Left Pill Bar) */}
          <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur border border-[#E3EAF2] rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-3 text-[11px] font-semibold text-[#1E293B]">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Status:</span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#38A9F5]"></span>
              <span>Planned</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#8B6CF0]"></span>
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#FFB020]"></span>
              <span>Ongoing</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#FF5A5F]"></span>
              <span>Delayed</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#22C58B]"></span>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1 bg-[#FFE6EE] text-[#C41F4F] px-1.5 py-0.5 rounded border border-[#F0386B]/20 font-bold">
              <span className="w-2 h-2 rounded-full bg-[#F0386B]"></span>
              <span>Repeat Clash</span>
            </div>
          </div>
        </div>

        {/* Detailed Inspection Panel (Tighter Padding, Compact Clash Accordion) */}
        {isSidebarOpen && (
          <div className="w-full lg:w-[33%] xl:w-[28%] flex flex-col gap-3">
            <div className="bg-white border border-[#E3EAF2] rounded-xl p-4 shadow-2xs flex flex-col gap-3">
              {/* Card Header & Status Badge */}
              <div className="flex items-center justify-between">
                <span className="badge ongoing text-[11px] py-0.5 px-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFB020]"></span>
                  Ongoing • Day 42 of 60
                </span>
                <span className="text-[11px] font-mono font-medium text-[#64748B]">
                  PMC-2024-TR-0082
                </span>
              </div>

              {/* Title & Location */}
              <div>
                <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-[#1E293B] leading-tight">
                  FC Road Smart Trenching &amp; Utility Ducting
                </h2>
                <p className="text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5 font-medium">
                  <MapPin className="w-3 h-3 text-[#2F6BFF]" />
                  Section: Goodluck Chowk to Dnyaneshwar Paduka (1.4 km)
                </p>
              </div>

              {/* Executing Agency & Contractor Rating */}
              <div className="grid grid-cols-2 gap-2 bg-[#F6F9FC] border border-[#E3EAF2] rounded-lg p-2.5 text-xs">
                <div>
                  <span className="text-[9px] text-[#64748B] uppercase font-bold tracking-wider">
                    Executing Dept
                  </span>
                  <p className="font-semibold text-[#1E293B] text-[11px] mt-0.2">
                    PMC Road &amp; Infra Div
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-[#64748B] uppercase font-bold tracking-wider">
                    Contractor
                  </span>
                  <p className="font-semibold text-[#1E293B] text-[11px] mt-0.2">
                    L&amp;T Urban Infra (4.8 ★)
                  </p>
                </div>
              </div>

              {/* Compact Collapsible Clash Warning Accordion */}
              <div className="border border-[#F0386B]/30 rounded-xl overflow-hidden shadow-2xs">
                {/* Diagonal Clash Hatch Top Header */}
                <div className="h-1.5 clash-hatch border-b border-[#F0386B]/20"></div>

                {/* Collapsible Accordion Header */}
                <button
                  onClick={() => setIsClashAccordionOpen(!isClashAccordionOpen)}
                  className="w-full bg-[#FFE6EE] px-3 py-2 flex items-center justify-between text-left hover:bg-[#FFDDE7] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#C41F4F] shrink-0" />
                    <div>
                      <span className="font-['Plus_Jakarta_Sans'] font-bold text-xs text-[#C41F4F]">
                        Repeat Digging &amp; Agency Conflict
                      </span>
                      <span className="ml-1.5 bg-[#C41F4F] text-white text-[8px] font-extrabold px-1 rounded uppercase">
                        URGENT
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#C41F4F]">
                    <span>₹38.4L</span>
                    {isClashAccordionOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Collapsible Content */}
                {isClashAccordionOpen && (
                  <div className="p-3 bg-[#FFE6EE] border-t border-[#F0386B]/20 text-xs">
                    <p className="text-[#1E293B] font-semibold text-[11px]">
                      Water Supply Dept vs 5G Telecom Duct Overlap
                    </p>
                    <p className="text-[#64748B] text-[11px] mt-1 leading-relaxed">
                      Piped water replacement scheduled 24 Oct cuts across newly laid high-density telecom conduits. Re-excavation penalty flagged under PMC Section 42 Bylaws.
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-[#F0386B]/20 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-[#64748B]">
                          Preventable Loss
                        </span>
                        <p className="font-['Plus_Jakarta_Sans'] text-sm font-extrabold text-[#C41F4F]">
                          ₹38.4 Lakh
                        </p>
                      </div>
                      <button
                        onClick={() => setShowHearingModal(true)}
                        className="bg-white hover:bg-[#F6F9FC] text-[#C41F4F] border border-[#F0386B]/30 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <span>Summon Hearing</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Locked Contractual Milestones with Immutable Deadline */}
              <div className="bg-white border border-[#E3EAF2] rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2F6BFF]" />
                    Contractual Milestones
                  </span>
                  <span className="badge delayed text-[10px] py-0 px-1.5">
                    +18d Slippage
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between py-0.5 border-b border-[#F1F5F9]">
                    <span className="text-[#64748B]">Tender Sanction:</span>
                    <span className="font-semibold text-[#1E293B]">12 Jun 2024</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-[#F1F5F9]">
                    <span className="text-[#64748B]">Target Completion:</span>
                    <span className="font-semibold text-[#1E293B]">15 Oct 2024</span>
                  </div>
                  <div className="flex justify-between py-0.5 bg-[#EAF1FF] px-1.5 rounded">
                    <span className="text-[#2F6BFF] font-semibold">Revised Freeze Date:</span>
                    <span className="font-bold text-[#2F6BFF]">02 Nov 2024</span>
                  </div>
                </div>

                <p className="text-[10px] text-[#64748B] italic">
                  Immutable lock: Zero unpenalized extensions allowed.
                </p>
              </div>

              {/* Action Buttons: One Primary Button in Electric Blue */}
              <div className="pt-1 flex flex-col gap-2">
                <button
                  onClick={() => setShowReportModal(true)}
                  className="btn-primary w-full text-xs py-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Report Stalled Work / Hazard</span>
                </button>

                <button
                  onClick={() => {
                    setToastMessage('Public Audit Certificate & Tender Bill downloaded.')
                  }}
                  className="w-full bg-white hover:bg-[#F6F9FC] text-[#64748B] hover:text-[#1E293B] border border-[#E3EAF2] text-[11px] font-semibold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Audit PDF (6.2 MB)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Joint Hearing Modal */}
      {showHearingModal && (
        <div className="fixed inset-0 bg-[#1E293B]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-[#E3EAF2] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#E3EAF2] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-[#FFE6EE] text-[#C41F4F] rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-[#1E293B]">
                    Summon Inter-Agency Hearing
                  </h3>
                  <p className="text-xs text-[#64748B]">FC Road Trenching vs Water Feeder Conflict</p>
                </div>
              </div>
              <button
                onClick={() => setShowHearingModal(false)}
                className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-2.5 text-xs text-[#1E293B]">
              <p className="leading-relaxed">
                You are issuing an urgent joint coordination notice to <strong>Executive Engineer (Water Supply)</strong> and <strong>Project Director (Telecom Ducting)</strong>.
              </p>
              <div className="bg-[#FFF4DB] border border-[#FFB020]/30 rounded-xl p-2.5 text-[#9A6200]">
                <strong>Proposed Dig-Once Mandate:</strong> Consolidate both pipeline excavation and fiber duct laying into a unified 14-day window commencing <strong>01-Nov-2024</strong>.
              </div>
              <label className="block text-[#64748B] font-semibold mt-1">
                Official Resolution Note:
              </label>
              <textarea
                defaultValue="Mandating joint trench sharing to preserve newly resurfaced asphalt. Penalty of ₹50,000/day applicable for individual digging."
                rows={3}
                className="w-full bg-[#F6F9FC] border border-[#E3EAF2] rounded-lg p-2 text-xs text-[#1E293B] focus:border-[#2F6BFF] focus:outline-none"
              ></textarea>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-[#E3EAF2] pt-3">
              <button
                onClick={() => setShowHearingModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowHearingModal(false)
                  setToastMessage('Joint Hearing Notice officially dispatched to all department heads.')
                }}
                className="btn-primary text-xs py-1.5 px-3"
              >
                Issue Digital Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-[#1E293B]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-[#E3EAF2] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#E3EAF2] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-[#EAF1FF] text-[#2F6BFF] rounded-lg">
                  <Camera className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-[#1E293B]">
                    Submit Citizen Ground Report
                  </h3>
                  <p className="text-xs text-[#64748B]">Geotagged ground observation for FC Road</p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-2.5 text-xs text-[#1E293B]">
              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Observation Category:</label>
                <select className="w-full bg-[#F6F9FC] border border-[#E3EAF2] rounded-lg p-2 text-xs text-[#1E293B]">
                  <option>Stalled excavation / Missing safety barricades</option>
                  <option>Road re-dug within 30 days of paving</option>
                  <option>Severe dust / Water pipeline leak</option>
                  <option>Traffic bottleneck without warden</option>
                </select>
              </div>

              <div>
                <label className="block text-[#64748B] font-semibold mb-1">Description:</label>
                <textarea
                  placeholder="Describe ground condition, machinery idle duration, or safety hazards..."
                  rows={3}
                  className="w-full bg-[#F6F9FC] border border-[#E3EAF2] rounded-lg p-2 text-xs text-[#1E293B] focus:border-[#2F6BFF] focus:outline-none"
                ></textarea>
              </div>

              <div className="border-2 border-dashed border-[#E3EAF2] rounded-xl p-3 text-center text-[#64748B] hover:border-[#2F6BFF] transition-colors cursor-pointer bg-[#F6F9FC]">
                <Camera className="w-5 h-5 mx-auto text-[#2F6BFF] mb-1" />
                <span className="text-xs font-semibold text-[#1E293B]">Upload Geo-tagged Photo</span>
                <p className="text-[10px] text-[#94A3B8]">Captures instant GPS coordinates &amp; timestamp</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-[#E3EAF2] pt-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowReportModal(false)
                  setToastMessage('Ground Report #CL-2026-8812 logged with GPS proof.')
                }}
                className="btn-primary text-xs py-1.5 px-3"
              >
                Submit Ground Proof
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E293B] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs border border-[#334155] animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#12B5A6]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
