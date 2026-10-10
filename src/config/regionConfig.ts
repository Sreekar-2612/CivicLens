// ============================================================
// QuickSort — Global Region & Map Configuration
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
      { headers: { 'User-Agent': 'QuickSort-CivicTech/1.0' } }
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
