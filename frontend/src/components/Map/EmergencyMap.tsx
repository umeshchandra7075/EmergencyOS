import React, { useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
  Incident,
  Vehicle,
  Facility,
  Hazard,
  IncidentRoute,
} from '../../types'
import { useTheme } from '../../contexts/ThemeContext'
import { RefreshCw, AlertTriangle } from 'lucide-react'

// --------------------------------------------------
// Custom Leaflet marker icons
// --------------------------------------------------

const createCustomIcon = (bgColor: string, emoji: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        border: 2px solid white;
      ">${emoji}</div>
    `,
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

// --------------------------------------------------
// Automatically update the map center and zoom
// --------------------------------------------------

function ChangeMapView({
  center,
  zoom,
}: {
  center: [number, number]
  zoom: number
}) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])

  return null
}

// --------------------------------------------------
// Component props
// --------------------------------------------------

interface EmergencyMapProps {
  center?: [number, number]
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

// --------------------------------------------------
// Emergency map
// --------------------------------------------------

export const EmergencyMap: React.FC<EmergencyMapProps> = ({
  center = [17.405, 78.475],
  zoom = 13,
  incidents = [],
  vehicles = [],
  facilities = [],
  hazards = [],
  selectedIncident = null,
  previewRoute = null,
  onSelectIncident,
  onRetryRoute,
  interactive = true,
}) => {
  const { resolvedTheme } = useTheme()

  // Route information
  let routeCoords: [number, number][] = []
  let isFallbackRoute = false
  let warningMessage = ''

  const activeRoute = previewRoute || selectedIncident?.currentRoute

  if (activeRoute?.geometry?.coordinates) {
    const rawCoords = activeRoute.geometry.coordinates

    // GeoJSON uses [longitude, latitude]; Leaflet uses [latitude, longitude].
    routeCoords = rawCoords.map(
      (coordinate: [number, number]): [number, number] => [
        coordinate[1],
        coordinate[0],
      ],
    )

    isFallbackRoute = Boolean(activeRoute.isFallback)
    warningMessage =
      activeRoute.warningMessage ||
      'Road routing is unavailable. This is a diagnostic line, not a verified road route. Do not use it for real emergency navigation.'
  }

  // Use OpenStreetMap tiles in both dashboard themes to avoid CARTO API-key tiles.
  const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

  const tileAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-900 transition-colors">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        keyboard={interactive}
        className="w-full h-full"
      >
        <ChangeMapView center={center} zoom={zoom} />

        <TileLayer
          key={resolvedTheme}
          attribution={tileAttribution}
          url={tileUrl}
          maxZoom={19}
        />

        {/* Route polyline */}
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

        {/* Incident markers */}
        {incidents.map((incident) => {
          if (!incident.source?.coordinates) return null

          const position: [number, number] = [
            incident.source.coordinates[1],
            incident.source.coordinates[0],
          ]

          return (
            <Marker
              key={incident._id}
              position={position}
              icon={incidentIcon}
              eventHandlers={{
                click: () => onSelectIncident?.(incident),
              }}
            >
              <Popup>
                <div className="p-1 min-w-[180px] text-slate-900">
                  <div className="font-bold text-sm text-red-600">
                    🚨 {incident.incidentNumber}
                  </div>
                  <div className="text-xs font-semibold mt-1">
                    Status: {incident.status}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {incident.description}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Severity: {incident.severity} / 5
                  </div>
                  {onSelectIncident && (
                    <button
                      onClick={() => onSelectIncident(incident)}
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

        {/* Emergency vehicle markers */}
        {vehicles.map((vehicle) => {
          if (!vehicle.currentLocation?.coordinates) return null

          const position: [number, number] = [
            vehicle.currentLocation.coordinates[1],
            vehicle.currentLocation.coordinates[0],
          ]

          let vehicleIcon = ambulanceIcon
          if (
            vehicle.type === 'fire_engine' ||
            vehicle.type === 'rescue_vehicle'
          ) {
            vehicleIcon = fireIcon
          }
          if (vehicle.type === 'patrol_car') {
            vehicleIcon = policeIcon
          }

          return (
            <Marker
              key={vehicle._id}
              position={position}
              icon={vehicleIcon}
            >
              <Popup>
                <div className="p-1 min-w-[180px] text-slate-900">
                  <div className="font-bold text-sm text-blue-600">
                    {vehicle.plateNumber}
                  </div>
                  <div className="text-xs font-semibold mt-1 capitalize">
                    Type: {vehicle.type.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-slate-600 capitalize">
                    Status: {vehicle.status}
                  </div>
                  {vehicle.speed !== undefined && (
                    <div className="text-xs text-slate-500 mt-1">
                      Speed: {vehicle.speed} km/h
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Hospital and facility markers */}
        {facilities.map((facility) => {
          if (!facility.location?.coordinates) return null

          const position: [number, number] = [
            facility.location.coordinates[1],
            facility.location.coordinates[0],
          ]
          const isHospital = facility.type === 'hospital'

          return (
            <Marker
              key={facility._id}
              position={position}
              icon={isHospital ? hospitalIcon : facilityIcon}
            >
              <Popup>
                <div className="p-1 min-w-[200px] text-slate-900">
                  <div className="font-bold text-sm text-emerald-600">
                    {facility.name}
                  </div>
                  <div className="text-xs text-slate-600 capitalize">
                    Type: {facility.type}
                  </div>
                  {isHospital && facility.bedCapacity && (
                    <div className="text-xs mt-1 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                      <div>
                        Available Beds:{' '}
                        <strong>
                          {facility.bedCapacity.available} /{' '}
                          {facility.bedCapacity.total}
                        </strong>
                      </div>
                      <div>
                        ICU Available:{' '}
                        <strong>
                          {facility.bedCapacity.icuAvailable} /{' '}
                          {facility.bedCapacity.icuTotal}
                        </strong>
                      </div>
                    </div>
                  )}
                  {facility.contactPhone && (
                    <div className="text-xs text-slate-500 mt-1">
                      📞 {facility.contactPhone}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Hazard zones */}
        {hazards.map((hazard) => {
          if (!hazard.location?.coordinates) return null

          const position: [number, number] = [
            hazard.location.coordinates[1],
            hazard.location.coordinates[0],
          ]

          return (
            <Circle
              key={hazard._id}
              center={position}
              radius={hazard.radiusMeters || 150}
              pathOptions={{
                color: '#f97316',
                fillColor: '#f97316',
                fillOpacity: 0.25,
                weight: 2,
              }}
            >
              <Popup>
                <div className="p-1 text-slate-900">
                  <div className="font-bold text-sm text-orange-600">
                    ⚠️ {hazard.title}
                  </div>
                  <div className="text-xs text-slate-600">
                    {hazard.description}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Caution: Active road hazard
                  </div>
                </div>
              </Popup>
            </Circle>
          )
        })}
      </MapContainer>

      {/* Explicit warning for diagnostic fallback routes */}
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
