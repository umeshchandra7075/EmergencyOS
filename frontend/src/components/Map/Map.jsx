/**
 * Map.jsx - Leaflet map with OpenStreetMap tiles, incident markers,
 * vehicle GPS tracking, route polylines, and hazard zone visualization
 * React-Leaflet integration for the Emergency Route Planner
 */

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useAuth } from '../contexts/AuthContext'
import { useSocketIO } from '../hooks/useSocket.io'
import { useGPS } from '../hooks/useGPS'
import { useNavigate } from 'react-router-dom'

// Custom Leaflet marker icons
const greenIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-icon@2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
})

const redIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  // Custom red colorization via marker options
})

const blueIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const orangeIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// OSM basemap layer
const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// Route polyline style
const routeStyle = {
  color: '#4F8CFF',
  weight: 5,
  opacity: 0.8,
  dashArray: '5, 5',
}

// Hazard zone style
const hazardZoneStyle = {
  color: '#EF4444',
  weight: 3,
  fillColor: '#EF4444',
  fillOpacity: 0.1,
  dashArray: '10, 10',
}

const incidentIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-default.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const vehicleIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconSize: [32, 37],
  iconAnchor: [16, 37],
})

const hospitalIcon = L.icon({
  iconUrl: 'https://img.icons8.com/ios/50/FFFFFF/hospital.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
})

const fireStationIcon = L.icon({
  iconUrl: 'https://img.icons8.com/ios/50/FFFFFF/fire-station.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
})

const policeIcon = L.icon({
  iconUrl: 'https://img.icons8.com/ios/50/FFFFFF/police.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
})

export const MapComponent = ({
  activeIncident,
  vehicles,
  facilities,
  hazards,
  onIncidentSelect,
  role,
  user,
}) => {
  const { user: authUser } = useAuth()
  const { socket } = useSocketIO()
  const navigate = useNavigate()

  // Use map instance for interactions
  const map = useMap()

  // Map center state - defaults to Hyderabad center, or incident location
  const [mapCenter, setMapCenter] = useState([17.3850, 78.4884]) // Hyderabad
  const [zoomLevel, setZoomLevel] = useState(12)

  // Incident markers on map
  const [incidentMarkers, setIncidentMarkers] = useState({})
  const [vehicleMarkers, setVehicleMarkers] = useState({})
  const [hospitalMarkers, setHospitalMarkers] = useState({})
  const [hazardMarkers, setHazardMarkers] = useState({})

  // Load incident markers from the incidents list
  useEffect(() => {
    // This would be populated from parent dashboard state
    // For now, markers are created when incidents are selected
  }, [activeIncident])

  // Update vehicle GPS positions via Socket.IO
  useEffect(() => {
    if (!socket || role !== 'driver') return

    // Listen for vehicle position updates from other drivers
    const unlisten = socket.on('vehicle-update', (data) => {
      const { vehicleId, latitude, longitude } = data
      setVehicleMarkers((prev) => ({
        ...prev,
        [vehicleId]: {
          position: [longitude, latitude],
          icon: blueIcon,
          title: `Vehicle ${vehicleId}`,
        },
      }))
    })

    // Cleanup on unmount
    return () => {
      unlisten()
    }
  }, [socket, role])

  // Update vehicle position via GPS hook (for current user's vehicle)
  useEffect(() => {
    if (!authUser || role !== 'driver') return

    const { manualUpdate } = useGPS(authUser.id, (position) => {
      // Position is updated via API - marker state managed separately
      setVehicleMarkers((prev) => ({
        ...prev,
        [authUser.id]: {
          position: [position.longitude, position.latitude],
          icon: blueIcon,
          title: `My Vehicle`,
        },
      }))
    })

    return () => {
      // Cleanup GPS watcher
    }
  }, [authUser, role])

  // Render incident polyline and route when incident is selected
  useEffect(() => {
    if (!activeIncident || !map) return

    // Get incident source/destination from the incident data
    // This would typically be passed as props or fetched from API
    const incidentSource = activeIncident?.source?.coordinates
    const incidentDestination = activeIncident?.destination?.coordinates

    if (incidentSource && incidentDestination) {
      const [srcLng, srcLat] = incidentSource
      const [destLng, destLat] = incidentDestination

      // Add incident marker
      L.marker([srcLat, srcLat], { icon: incidentIcon })
        .bindPopup('Incident Source')
        .addTo(map)

      L.marker([destLng, destLat], { icon: hospitalIcon })
        .bindPopup('Destination Hospital')
        .addTo(map)

      // Add route polyline (straight-line estimate + OSRM route)
      const path = [incidentSource, incidentDestination]
      L.polyline(path, routeStyle).addTo(map)

      // Fit map to route
      const bounds = L.latLngBounds(
        [srcLat, srcLng],
        [destLat, destLng]
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [activeIncident, map])

  // Render hazard zones on map
  useEffect(() => {
    if (!hazards || !hazards.length || !map) return

    hazards.forEach((hazard) => {
      const coords = hazard.location.coordinates // [lng, lat]
      const radius = hazard.radius || 100

      // Add circle marker for hazard zone
      L.circleMarker([coords[1], coords[0]], {
        radius: radius,
        style: hazardZoneStyle,
        fillColor: '#EF4444',
      })
        .bindPopup(
          `<b>Hazard: ${hazard.type}</b><br/>${hazard.description}<br/>Radius: ${radius}m`
        )
        .addTo(map)

      setHazardMarkers((prev) => ({
        ...prev,
        [hazard._id]: { radius, coords, type: hazard.type },
      }))
    })
  }, [hazards, map])

  // Render facility markers (hospitals, fire stations, police)
  useEffect(() => {
    if (!facilities || !map) return

    facilities.forEach((facility) => {
      const coords = facility.location.coordinates // [lng, lat]
      const type = facility.type

      let icon
      if (type === 'hospital') {
        icon = hospitalIcon
      } else if (type === 'fire_station') {
        icon = fireStationIcon
      } else if (type === 'police_station') {
        icon = policeIcon
      } else {
        icon = incidentIcon
      }

      L.marker([coords[1], coords[0]], { icon })
        .bindPopup(
          `<b>${facility.name}</b><br/>Type: ${type}<br/>Available beds: ${
            facility.bedCapacity?.available || 'N/A'
          }/${facility.bedCapacity?.total || 'N/A'}`
        )
        .addTo(map)
    })
  }, [facilities, map])

  // Handle incident selection
  const handleSelectIncident = (incidentId) => {
    onIncidentSelect(incidentId)
    navigate(`/incident/${incidentId}`)
  }

  return (
    <div className="map-container" style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={mapCenter}
        zoom={zoomLevel}
        style={{ height: '100%', width: '100%' }}
        whenCreated={map => setMap(map)}
        className="leaflet-map"
      >
        <TileLayer
          url={OSM_URL}
          attribution={OSM_ATTRIBUTION}
          className="leaflet-tile-layer"
        />

        {/* Incident Route and Markers */}
        {activeIncident && (
          <MapContainer
            center={mapCenter}
            zoom={zoomLevel}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url={OSM_URL}
              attribution={OSM_ATTRIBUTION}
            />
            {incidentMarkers && incidentMarkers}
            {vehicleMarkers && vehicleMarkers}
            {hospitalMarkers && hospitalMarkers}
            {hazardMarkers && hazardMarkers}
          </MapContainer>
        )}

        {/* SOS Button overlay - only for citizens */}
        {authUser?.role === 'citizen' && (
          <div
            className="sos-overlay"
            onClick={() => navigate('/sos')}
            title="Report Emergency (SOS)"
            style={{
              position: 'absolute',
              bottom: 20,
              left: 20,
              zIndex: 1000,
              background: 'rgba(79, 140, 255, 0.9)',
              color: 'white',
              padding: '1rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              backdropFilter: 'blur(5px)',
            }}
          >
            🚨 SOS
          </div>
        )}

        {/* Vehicle GPS positions */}
        {Object.keys(vehicleMarkers).length > 0 && (
          <>
            {Object.entries(vehicleMarkers).map(([id, marker]) => (
              <Marker
                key={id}
                position={marker.position}
                icon={marker.icon}
              >
                <span title={marker.title || `Vehicle ${id}`} />
              </Marker>
            ))}
          </>
        )}

        {/* Selected incident */}
        {activeIncident && (
          <Marker
            position={[
              activeIncident.source?.coordinates?.[1] || mapCenter[0],
              activeIncident.source?.coordinates?.[0] || mapCenter[1],
            ]}
            icon={incidentIcon}
            openPopup
          >
            <Popup>
              <b>Incident {activeIncident._id.toString().substring(0, 8)}</b><br/>
              {activeIncident.status}{' '}
              {activeIncident.emergencyType &&
                ['1', '2', '3'].includes(
                  String(activeIncident.emergencyType)
                )
                  ? ['1', '2', '3'].includes(
                      String(activeIncident.emergencyType)
                    )
                    ? ['Medical', 'Fire', 'Police'][
                        activeIncident.emergencyType - 1
                      ]
                    : `Type ${activeIncident.emergencyType}`
                  : ''}
            </Popup>
          </Marker>
        )}

        {/* Route to active incident - if driver */}
        {role === 'driver' && activeIncident && (
          <Polyline
            positions={[
              activeIncident.source?.coordinates?.[1] || mapCenter[0],
              activeIncident.source?.coordinates?.[0] || mapCenter[1],
              activeIncident.destination?.coordinates?.[1] || mapCenter[0],
              activeIncident.destination?.coordinates?.[0] || mapCenter[1],
            ]}
            pathOptions={routeStyle}
          />
        )}
      </div>
    </div>
  )
}