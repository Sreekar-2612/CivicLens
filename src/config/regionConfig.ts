// ============================================================
// SpadeWork — Global Region & Map Configuration
// Generalizes map centering, geocoding, and municipal branding for any city
// ============================================================

export interface RegionConfig {
  cityName: string
  authorityName: string
  defaultLat: number
  defaultLng: number
  defaultZoom: number
}

export const CURRENT_REGION: RegionConfig = {
  cityName: import.meta.env.VITE_CITY_NAME || 'Metropolitan Area',
  authorityName: import.meta.env.VITE_AUTHORITY_NAME || 'Civic Works Authority',
  defaultLat: Number(import.meta.env.VITE_DEFAULT_LAT) || 18.5204,
  defaultLng: Number(import.meta.env.VITE_DEFAULT_LNG) || 73.8567,
  defaultZoom: 13,
}

// Curated instant coordinates dictionary for zero-latency response for popular cities
const POPULAR_CITIES: Record<string, { lat: number; lng: number; displayName: string }> = {
  guntur: { lat: 16.3067, lng: 80.4365, displayName: 'Guntur, Andhra Pradesh, India' },
  vijayawada: { lat: 16.5062, lng: 80.6480, displayName: 'Vijayawada, Andhra Pradesh, India' },
  visakhapatnam: { lat: 17.6868, lng: 83.2185, displayName: 'Visakhapatnam, Andhra Pradesh, India' },
  vizag: { lat: 17.6868, lng: 83.2185, displayName: 'Visakhapatnam, Andhra Pradesh, India' },
  hyderabad: { lat: 17.3850, lng: 78.4867, displayName: 'Hyderabad, Telangana, India' },
  bengaluru: { lat: 12.9716, lng: 77.5946, displayName: 'Bengaluru, Karnataka, India' },
  bangalore: { lat: 12.9716, lng: 77.5946, displayName: 'Bengaluru, Karnataka, India' },
  mumbai: { lat: 19.0760, lng: 72.8777, displayName: 'Mumbai, Maharashtra, India' },
  delhi: { lat: 28.6139, lng: 77.2090, displayName: 'New Delhi, Delhi, India' },
  'new delhi': { lat: 28.6139, lng: 77.2090, displayName: 'New Delhi, Delhi, India' },
  chennai: { lat: 13.0827, lng: 80.2707, displayName: 'Chennai, Tamil Nadu, India' },
  kolkata: { lat: 22.5726, lng: 88.3639, displayName: 'Kolkata, West Bengal, India' },
  pune: { lat: 18.5204, lng: 73.8567, displayName: 'Pune, Maharashtra, India' },
  ahmedabad: { lat: 23.0225, lng: 72.5714, displayName: 'Ahmedabad, Gujarat, India' },
  jaipur: { lat: 26.9124, lng: 75.7873, displayName: 'Jaipur, Rajasthan, India' },
  surat: { lat: 21.1702, lng: 72.8311, displayName: 'Surat, Gujarat, India' },
  lucknow: { lat: 26.8467, lng: 80.9462, displayName: 'Lucknow, Uttar Pradesh, India' },
  patna: { lat: 25.5941, lng: 85.1376, displayName: 'Patna, Bihar, India' },
  kochi: { lat: 9.9312, lng: 76.2673, displayName: 'Kochi, Kerala, India' },
  chandigarh: { lat: 30.7333, lng: 76.7794, displayName: 'Chandigarh, India' },
  bhopal: { lat: 23.2599, lng: 77.4126, displayName: 'Bhopal, Madhya Pradesh, India' },
  indore: { lat: 22.7196, lng: 75.8577, displayName: 'Indore, Madhya Pradesh, India' },
  nagpur: { lat: 21.1458, lng: 79.0882, displayName: 'Nagpur, Maharashtra, India' },
  tirupati: { lat: 13.6288, lng: 79.4192, displayName: 'Tirupati, Andhra Pradesh, India' },
}

// Fast Geocoding: checks local dictionary first, then falls back to OpenStreetMap Nominatim
export async function geocodeCity(query: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const normalized = query.trim().toLowerCase()
  if (POPULAR_CITIES[normalized]) {
    return POPULAR_CITIES[normalized]
  }

  // Also check if query contains any known city name
  for (const [key, val] of Object.entries(POPULAR_CITIES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return val
    }
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'User-Agent': 'SpadeWork-CivicTech/1.0' } }
    )
    const data = await res.json()
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      }
    }
  } catch (err) {
    console.warn('Geocoding error:', err)
  }
  return null
}

import type { Project } from '../types'

// Dynamically generate realistic municipal work orders for any queried city worldwide
export function generateCityProjects(cityName: string, centerLat: number, centerLng: number): Project[] {
  const cleanCity = cityName.split(',')[0].trim()
  const today = new Date().toISOString().split('T')[0]

  return [
    {
      id: `gen-${cleanCity.toLowerCase().replace(/[^a-z0-9]/g, '-')}-1`,
      title: `${cleanCity} Ring Road Stormwater Drainage Overhaul`,
      purpose: 'Municipal stormwater pipeline expansion and water-logging prevention',
      departmentId: 'dept-drainage',
      contractor: `${cleanCity} Civil Infrastructure Ltd.`,
      category: 'drainage',
      status: 'in_progress',
      confidenceIndicator: 'on_track',
      road: `${cleanCity} Ring Road`,
      locality: `${cleanCity} Central`,
      ward: 'Ward 04',
      location: { lat: centerLat + 0.0052, lng: centerLng + 0.0038 },
      startDate: '2026-08-10',
      originalEndDate: '2026-11-30',
      budgetLakhs: 185,
      progressPercent: 62,
      isPublished: true,
      createdAt: today,
      updatedAt: today,
    },
    {
      id: `gen-${cleanCity.toLowerCase().replace(/[^a-z0-9]/g, '-')}-2`,
      title: `${cleanCity} Station Road Utility Conduit Trenching`,
      purpose: 'Underground optical fiber and power cable coordination conduit',
      departmentId: 'dept-telecom',
      contractor: 'Apex Grid Lines Infra',
      category: 'telecom',
      status: 'delayed',
      confidenceIndicator: 'delayed',
      road: 'Station Main Road',
      locality: `${cleanCity} Railway Junction`,
      ward: 'Ward 08',
      location: { lat: centerLat - 0.0041, lng: centerLng - 0.0055 },
      startDate: '2026-06-15',
      originalEndDate: '2026-09-30',
      revisedEndDate: '2026-12-15',
      budgetLakhs: 94,
      progressPercent: 45,
      isPublished: true,
      createdAt: today,
      updatedAt: today,
    },
    {
      id: `gen-${cleanCity.toLowerCase().replace(/[^a-z0-9]/g, '-')}-3`,
      title: `${cleanCity} High-Density Water Supply Feeder Pipeline`,
      purpose: 'Replacement of corroded potable water supply feeder mains',
      departmentId: 'dept-water',
      contractor: 'Jaltech Engineering Partners',
      category: 'water_pipeline',
      status: 'pending_audit',
      confidenceIndicator: 'on_track',
      road: 'Market Bypass Avenue',
      locality: `${cleanCity} East`,
      ward: 'Ward 12',
      location: { lat: centerLat + 0.0031, lng: centerLng - 0.0044 },
      startDate: '2026-07-01',
      originalEndDate: '2026-10-15',
      budgetLakhs: 240,
      progressPercent: 100,
      isPublished: true,
      createdAt: today,
      updatedAt: today,
    },
    {
      id: `gen-${cleanCity.toLowerCase().replace(/[^a-z0-9]/g, '-')}-4`,
      title: `${cleanCity} Main Hospital Link Concrete Resurfacing`,
      purpose: 'Complete road white-topping and bitumen repair following utility trenching',
      departmentId: 'dept-roads',
      contractor: `${cleanCity} Roads & Highways PMC`,
      category: 'road_resurfacing',
      status: 'completed',
      confidenceIndicator: 'on_track',
      road: 'Hospital Link Road',
      locality: `${cleanCity} North`,
      ward: 'Ward 02',
      location: { lat: centerLat - 0.0058, lng: centerLng + 0.0062 },
      startDate: '2026-05-10',
      originalEndDate: '2026-08-20',
      actualEndDate: '2026-08-18',
      budgetLakhs: 110,
      progressPercent: 100,
      isPublished: true,
      createdAt: today,
      updatedAt: today,
    },
    {
      id: `gen-${cleanCity.toLowerCase().replace(/[^a-z0-9]/g, '-')}-5`,
      title: `${cleanCity} Commercial Hub Underground Grid Modernization`,
      purpose: 'High tension cable trenching and smart substation connection',
      departmentId: 'dept-electricity',
      contractor: 'Vidyut Power Grid Services',
      category: 'electricity',
      status: 'planned',
      confidenceIndicator: 'on_track',
      road: 'Commercial Complex Road',
      locality: `${cleanCity} South`,
      ward: 'Ward 16',
      location: { lat: centerLat + 0.0075, lng: centerLng - 0.0015 },
      startDate: '2026-11-01',
      originalEndDate: '2027-02-28',
      budgetLakhs: 320,
      progressPercent: 0,
      isPublished: true,
      createdAt: today,
      updatedAt: today,
    },
  ]
}
