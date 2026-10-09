import axios from 'axios'
import { config } from '../config/env.js'
import { IIncidentRoute } from '../models/Incident.js'

/**
 * Routing provider contract interface
 */
export interface IRoutingProvider {
  name: string
  calculateRoute(
    source: [number, number],
    destination: [number, number],
    alternatives?: number
  ): Promise<IIncidentRoute | null>
}

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
 * Performs a lightweight health check against the configured routing provider
 */
export async function checkRoutingServiceHealth(): Promise<{
  provider: string
  status: 'available' | 'degraded' | 'unavailable'
  latencyMs?: number
  message?: string
}> {
  const start = Date.now()
  // Hyderabad test segment: Charminar to Hussain Sagar
  const testUrl = `${config.OSRM_BASE_URL}/78.4747,17.3616;78.4744,17.4239?overview=false`

  try {
    const res = await axios.get(testUrl, {
      timeout: Math.min(2000, config.OSRM_TIMEOUT),
      headers: { 'User-Agent': 'EmergencyOS-HealthCheck/1.0' },
    })
    const latencyMs = Date.now() - start
    if (res.data?.code === 'Ok') {
      return {
        provider: 'OSRM',
        status: 'available',
        latencyMs,
        message: 'Live road routing engine operational',
      }
    }
    return {
      provider: 'OSRM',
      status: 'degraded',
      latencyMs,
      message: `OSRM returned non-OK status: ${res.data?.code}`,
    }
  } catch (err: any) {
    return {
      provider: 'OSRM',
      status: 'unavailable',
      message: `Routing engine unreachable (${err.message}). System in geodesic fallback mode.`,
    }
  }
}

/**
 * OSRM Primary Routing Provider with retry capability
 */
export class OSRMRoutingProvider implements IRoutingProvider {
  name = 'OSRM'

  async calculateRoute(
    source: [number, number],
    destination: [number, number],
    alternatives = 2
  ): Promise<IIncidentRoute | null> {
    const url = `${config.OSRM_BASE_URL}/${source[0]},${source[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson&steps=true&alternatives=${alternatives}`

    const maxAttempts = 2
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
            isNavigable: true,
            diagnosticOnly: false,
            status: 'available',
            provider: 'OSRM',
            calculatedAt: new Date(),
          }
        }
      } catch (err: any) {
        if (attempt < maxAttempts) {
          // Controlled backoff retry
          await new Promise((resolve) => setTimeout(resolve, 150))
          continue
        }
        console.warn(`[Routing] OSRM query failed after ${maxAttempts} attempts (${err.message}).`)
      }
    }

    return null
  }
}

const defaultProvider: IRoutingProvider = new OSRMRoutingProvider()

/**
 * Computes road route with graceful, clearly-labeled geodesic non-navigable fallback
 */
export async function calculateRoute(
  source: [number, number],
  destination: [number, number],
  alternatives = 2,
  provider: IRoutingProvider = defaultProvider
): Promise<IIncidentRoute> {
  // Validate coordinates
  if (
    source[0] < -180 ||
    source[0] > 180 ||
    source[1] < -90 ||
    source[1] > 90 ||
    destination[0] < -180 ||
    destination[0] > 180 ||
    destination[1] < -90 ||
    destination[1] > 90
  ) {
    throw new Error('Coordinates out of valid geographic bounds')
  }

  // Attempt real road route calculation
  const roadRoute = await provider.calculateRoute(source, destination, alternatives)
  if (roadRoute) {
    return roadRoute
  }

  // CRITICAL RULE (Section 4.B):
  // Never present a straight line as a valid navigable emergency road route.
  // Explicitly label as non-navigable diagnostic line with fallback warning.
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
    isNavigable: false,
    diagnosticOnly: true,
    status: 'unavailable',
    warningMessage:
      'Non-navigable diagnostic straight-line. Live road routing service unavailable. Do not use for emergency navigation.',
    provider: 'geodesic_straight_line',
    calculatedAt: new Date(),
  }
}
