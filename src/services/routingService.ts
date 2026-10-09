import axios from 'axios'
import { config } from '../config/env.js'
import { IIncidentRoute } from '../models/Incident.js'

/**
 * Calculates Haversine great-circle distance between two [lng, lat] points in meters
 */
export function calculateHaversineDistanceMeters(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lng1, lat1] = coord1
  const [lng2, lat2] = coord2

  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

/**
 * Computes road route using OSRM with graceful geodesic straight-line fallback
 */
export async function calculateRoute(
  source: [number, number],
  destination: [number, number],
  alternatives = 2
): Promise<IIncidentRoute> {
  const url = `${config.OSRM_BASE_URL}/${source[0]},${source[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson&steps=true&alternatives=${alternatives}`

  try {
    const response = await axios.get(url, {
      timeout: config.OSRM_TIMEOUT,
      headers: { 'User-Agent': 'EmergencyOS/1.0' },
    })

    if (
      response.data &&
      response.data.code === 'Ok' &&
      response.data.routes &&
      response.data.routes.length > 0
    ) {
      const primaryRoute = response.data.routes[0]
      const altRoutes = response.data.routes.slice(1).map((r: any) => ({
        distanceMeters: Math.round(r.distance),
        durationSeconds: Math.round(r.duration),
        geometry: r.geometry,
        summary: r.legs?.[0]?.summary || 'Alternative Route',
      }))

      return {
        distanceMeters: Math.round(primaryRoute.distance),
        durationSeconds: Math.round(primaryRoute.duration),
        geometry: primaryRoute.geometry,
        alternatives: altRoutes,
        isFallback: false,
        provider: 'OSRM',
        calculatedAt: new Date(),
      }
    }
  } catch (error: any) {
    console.warn(`[Routing] OSRM query failed (${error.message}). Falling back to Geodesic Straight-Line.`)
  }

  // Graceful Fallback: Geodesic straight-line route
  const distance = calculateHaversineDistanceMeters(source, destination)
  // Assume average emergency vehicle transit speed 45 km/h = 12.5 m/s
  const duration = Math.max(60, Math.round(distance / 12.5))

  return {
    distanceMeters: distance,
    durationSeconds: duration,
    geometry: {
      type: 'LineString',
      coordinates: [source, destination],
    },
    alternatives: [],
    isFallback: true,
    provider: 'geodesic_straight_line',
    calculatedAt: new Date(),
  }
}
