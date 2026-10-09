import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Incident, Vehicle, Facility, Hazard, IncidentRoute } from '../../types'
import { useTheme } from '../../contexts/ThemeContext'
import { RefreshCw, AlertTriangle } from 'lucide-react'

// Fix default leaflet icons
const createCustomIcon = (bgColor: string, emoji: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: ${bgColor};
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      border: 2px solid white;
    ">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  })
}

const incidentIcon = createCustomIcon('#ef4444', '🚨')
const ambulanceIcon = createCustomIcon('#3b82f6', '🚑')
const fireIcon = createCustomIcon('#f97316', '🚒')
const policeIcon = createCustomIcon('#8b5cf6', '🚓')
const hospitalIcon = createCustomIcon('#10b981', '🏥')
const facilityIcon = createCustomIcon('#06b6d4', '🏢')

function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

interface EmergencyMapProps {
  center?: [number, number] // [lat, lng]
  zoom?: number
  incidents?: Incident[]
  vehicles?: Vehicle[]
  facilities?: Facility[]
  hazards?: Hazard[]
  selectedIncident?: Incident | null
  previewRoute?: IncidentRoute | null
  onSelectIncident?: (incident: Incident) => void
  onRetryRoute?: () => void
  interactive?: boolean
}

export const EmergencyMap: React.FC<EmergencyMapProps> = ({
  center = [17.4050, 78.4750], // Hyderabad default
  zoom = 13,
  incidents = [],
  vehicles = [],
  facilities = [],
  hazards = [],
  selectedIncident = null,
  previewRoute = null,
  onSelectIncident,
  onRetryRoute,
}) => {
  const { resolvedTheme } = useTheme()

  // Extract route coordinates for polyline if selected incident or preview has route
  let routeCoords: [number, number][] = []
  let isFallbackRoute = false
  let warningMessage = ''

  const activeRoute = previewRoute || selectedIncident?.currentRoute

  if (activeRoute?.geometry?.coordinates) {
    const rawCoords = activeRoute.geometry.coordinates
    // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
    routeCoords = rawCoords.map((c: [number, number]) => [c[1], c[0]])
    isFallbackRoute = Boolean(activeRoute.isFallback)
    warningMessage =
      activeRoute.warningMessage ||
      'Non-navigable diagnostic straight-line. Live road routing unavailable. Do not use for emergency navigation.'
  }

  // Theme-aware tile layer
  const tileUrl =
    resolvedTheme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-900 transition-colors">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <ChangeMapView center={center} zoom={zoom} />

        {/* Dynamic theme-aware tile layer */}
        <TileLayer
          key={resolvedTheme}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />

        {/* Route Polyline */}
        {routeCoords.length > 1 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: isFallbackRoute ? '#f59e0b' : '#3b82f6',
              weight: isFallbackRoute ? 4 : 5,
              opacity: 0.9,
              dashArray: isFallbackRoute ? '10, 10' : undefined,
            }}
          />
        )}

        {/* Incidents Markers */}
        {incidents.map((inc) => {
          if (!inc.source?.coordinates) return null
          const pos: [number, number] = [inc.source.coordinates[1], inc.source.coordinates[0]] // [lat, lng]
          return (
            <Marker
              key={inc._id}
              position={pos}
              icon={incidentIcon}
              eventHandlers={{
                click: () => onSelectIncident?.(inc),
              }}
            >
              <Popup>
                <div className="p-1 min-w-[180px] text-slate-900 dark:text-slate-100">
                  <div className="font-bold text-sm text-red-600 flex items-center gap-1">
                    🚨 {inc.incidentNumber}
                  </div>
                  <div className="text-xs font-semibold mt-1">Status: {inc.status}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">{inc.description}</div>
                  <div className="text-xs text-slate-500 mt-1">Severity: {inc.severity} / 5</div>
                  {onSelectIncident && (
                    <button
                      onClick={() => onSelectIncident(inc)}
                      className="mt-2 w-full bg-red-600 text-white text-xs py-1 px-2 rounded font-medium hover:bg-red-700 transition"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Fleet Vehicles Markers */}
        {vehicles.map((v) => {
          if (!v.currentLocation?.coordinates) return null
          const pos: [number, number] = [
            v.currentLocation.coordinates[1],
            v.currentLocation.coordinates[0],
          ]
          let vIcon = ambulanceIcon
          if (v.type === 'fire_engine' || v.type === 'rescue_vehicle') vIcon = fireIcon
          if (v.type === 'patrol_car') vIcon = policeIcon

          return (
            <Marker key={v._id} position={pos} icon={vIcon}>
              <Popup>
                <div className="p-1 min-w-[180px] text-slate-900 dark:text-slate-100">
                  <div className="font-bold text-sm text-blue-600 flex items-center gap-1">
                    {v.plateNumber}
                  </div>
                  <div className="text-xs font-semibold mt-1 capitalize">Type: {v.type.replace('_', ' ')}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 capitalize">Status: {v.status}</div>
                  {v.speed !== undefined && (
                    <div className="text-xs text-slate-500 mt-1">Speed: {v.speed} km/h</div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Facilities Markers */}
        {facilities.map((f) => {
          if (!f.location?.coordinates) return null
          const pos: [number, number] = [f.location.coordinates[1], f.location.coordinates[0]]
          const isHosp = f.type === 'hospital'

          return (
            <Marker key={f._id} position={pos} icon={isHosp ? hospitalIcon : facilityIcon}>
              <Popup>
                <div className="p-1 min-w-[200px] text-slate-900 dark:text-slate-100">
                  <div className="font-bold text-sm text-emerald-600">{f.name}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 capitalize">Type: {f.type}</div>
                  {isHosp && f.bedCapacity && (
                    <div className="text-xs mt-1 bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded border border-emerald-200 dark:border-emerald-800">
                      <div>Available Beds: <strong>{f.bedCapacity.available} / {f.bedCapacity.total}</strong></div>
                      <div>ICU Available: <strong>{f.bedCapacity.icuAvailable} / {f.bedCapacity.icuTotal}</strong></div>
                    </div>
                  )}
                  {f.contactPhone && (
                    <div className="text-xs text-slate-500 mt-1">📞 {f.contactPhone}</div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Hazards Zones */}
        {hazards.map((h) => {
          if (!h.location?.coordinates) return null
          const pos: [number, number] = [h.location.coordinates[1], h.location.coordinates[0]]
          return (
            <Circle
              key={h._id}
              center={pos}
              radius={h.radiusMeters || 150}
              pathOptions={{
                color: '#f97316',
                fillColor: '#f97316',
                fillOpacity: 0.25,
                weight: 2,
              }}
            >
              <Popup>
                <div className="p-1 text-slate-900 dark:text-slate-100">
                  <div className="font-bold text-sm text-orange-600">⚠️ {h.title}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">{h.description}</div>
                  <div className="text-xs text-slate-500 mt-1">Caution: Active road hazard</div>
                </div>
              </Popup>
            </Circle>
          )
        })}
      </MapContainer>

      {/* Explicit Non-Navigable Diagnostic Route Fallback Warning (Section 4.B) */}
      {isFallbackRoute && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto max-w-md z-[500] bg-amber-950/95 border border-amber-500/80 text-amber-200 text-xs p-3 rounded-lg shadow-2xl backdrop-blur-md flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                Non-Navigable Diagnostic Line
              </div>
              <p className="mt-0.5 text-amber-200/90 leading-relaxed">
                {warningMessage}
              </p>
            </div>
          </div>
          {onRetryRoute && (
            <button
              onClick={onRetryRoute}
              className="self-end inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold shadow transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Road Routing
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmergencyMap
