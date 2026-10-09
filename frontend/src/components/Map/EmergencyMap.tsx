import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Incident, Vehicle, Facility, Hazard } from '../../types'

// Fix default leaflet icons
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png'
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png'
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'

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
  onSelectIncident?: (incident: Incident) => void
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
  onSelectIncident,
}) => {
  // Extract route coordinates for polyline if selected incident has route
  let routeCoords: [number, number][] = []
  let isFallbackRoute = false

  if (selectedIncident?.currentRoute?.geometry?.coordinates) {
    const rawCoords = selectedIncident.currentRoute.geometry.coordinates
    // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
    routeCoords = rawCoords.map((c: [number, number]) => [c[1], c[0]])
    isFallbackRoute = Boolean(selectedIncident.currentRoute.isFallback)
  }

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <ChangeMapView center={center} zoom={zoom} />

        {/* CartoDB Dark Matter tile layer for emergency operations */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route Polyline */}
        {routeCoords.length > 1 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: isFallbackRoute ? '#f59e0b' : '#3b82f6',
              weight: 5,
              opacity: 0.85,
              dashArray: isFallbackRoute ? '8, 8' : undefined,
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
                <div className="p-1 text-slate-900">
                  <div className="font-bold text-sm text-red-600 flex items-center gap-1">
                    🚨 {inc.incidentNumber}
                  </div>
                  <div className="text-xs font-semibold mt-1">Status: {inc.status}</div>
                  <div className="text-xs text-slate-700 mt-1">{inc.description}</div>
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
          if (v.type === 'fire_engine') vIcon = fireIcon
          if (v.type === 'patrol_car') vIcon = policeIcon

          return (
            <Marker key={v._id} position={pos} icon={vIcon}>
              <Popup>
                <div className="p-1 text-slate-900">
                  <div className="font-bold text-sm text-blue-600">
                    {v.plateNumber} ({v.type})
                  </div>
                  <div className="text-xs mt-1">Status: <span className="font-semibold">{v.status}</span></div>
                  {v.speed !== undefined && (
                    <div className="text-xs text-slate-600">Speed: {v.speed} km/h</div>
                  )}
                  {v.driver && (
                    <div className="text-xs text-slate-600">Driver: {v.driver.name}</div>
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
                <div className="p-1 text-slate-900">
                  <div className="font-bold text-sm text-emerald-700">{f.name}</div>
                  <div className="text-xs text-slate-600 capitalize">Type: {f.type}</div>
                  {isHosp && f.bedCapacity && (
                    <div className="text-xs mt-1 bg-emerald-50 p-1 rounded border border-emerald-200">
                      <div>Available Beds: <strong>{f.bedCapacity.available} / {f.bedCapacity.total}</strong></div>
                      <div>ICU Available: <strong>{f.bedCapacity.icuAvailable} / {f.bedCapacity.icuTotal}</strong></div>
                    </div>
                  )}
                  {f.contactPhone && (
                    <div className="text-xs text-slate-600 mt-1">📞 {f.contactPhone}</div>
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
                <div className="p-1 text-slate-900">
                  <div className="font-bold text-sm text-orange-600">⚠️ {h.title}</div>
                  <div className="text-xs text-slate-600">{h.description}</div>
                  <div className="text-xs text-slate-500 mt-1">Caution: Hazard zone active</div>
                </div>
              </Popup>
            </Circle>
          )
        })}
      </MapContainer>

      {/* Honest fallback route badge */}
      {isFallbackRoute && (
        <div className="absolute bottom-4 left-4 z-[500] bg-amber-900/90 border border-amber-500 text-amber-200 text-xs px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 backdrop-blur-sm">
          <span>⚠️</span>
          <span>Displaying straight-line geodesic distance (OSRM routing unavailable)</span>
        </div>
      )}
    </div>
  )
}

export default EmergencyMap
