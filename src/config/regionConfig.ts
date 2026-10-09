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

// OpenStreetMap Nominatim Geocoding for searching any city worldwide
export async function geocodeCity(query: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
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
