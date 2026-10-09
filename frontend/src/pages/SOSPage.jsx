/**
 * SOSPage - Emergency SOS submission page
 * Emergency type selection, description, location status
 * SOS submission and incident confirmation
 * Route display after incident creation
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useToast } from 'react-hot-toast'
import { useSelector, useDispatch } from 'react-redux'
import { useAuth } from '../contexts/AuthContext'
import { useGPS } from '../hooks/useGPS'
import SOSButton from '../components/Map/SOSButton'
import RouteDisplay from '../components/RouteDisplay/RouteDisplay'
import api from '../services/api'

export const SOSPage = () => {
  const [navigate] = useNavigate()
  const { user } = useAuth()
  const [toast] = useToast()
  const dispatch = useDispatch()

  // State for emergency type selection
  const [emergencyType, setEmergencyType] = useState(1) // 1 = MEDICAL default
  const [severity, setSeverity] = useState(3)
  const [description, setDescription] = useState('')
  const [locationStatus, setLocationStatus] = useState('unknown')
  const [showMap, setShowMap] = useState(false)
  const [incident, setIncident] = useState(null)

  // Emergency type options
  const EMERGENCY_TYPES = [
    { value: 1, label: 'Medical (Ambulance)', priority: 1, vehicle: 'ambulance', specialty: 'trauma' },
    { value: 2, label: 'Fire (Fire Engine)', priority: 2, vehicle: 'fire_engine', specialty: null },
    { value: 3, label: 'Police (Patrol Car)', priority: 3, vehicle: 'patrol_car', specialty: null },
    { value: 4, label: 'Rescue', priority: 4, vehicle: 'rescue_vehicle', specialty: null },
    { value: 5, label: 'Hazmat', priority: 5, vehicle: 'hazmat_vehicle', specialty: 'chemical' },
  ]

  // GPS hook for location tracking
  const { manualUpdate, ...gps } = useGPS(user?.id, (position) => {
    setLocationStatus('acquired')
  })

  // Check user role for default emergency type
  useEffect(() => {
    if (user) {
      // Citizens default to Medical, others can select
      setEmergencyType(1)
    }
  }, [user])

  // Fetch incident after creation
  useEffect(() => {
    if (incident) {
      toast.success(`Incident created! ETA: ${incident.currentRoute?.duration ? Math.round(incident.currentRoute.duration / 60) : 'calculating...'} minutes`)
      // Navigate to incident detail page
      setTimeout(() => {
        navigate(`/incident/${incident._id}`)
      }, 2000)
    }
  }, [incident, navigate])

  const handleCreateIncident = useCallback(async () => {
    try {
      setLocationStatus('requesting')

      // Get current location or use GPS
      let latitude, longitude

      if (gps.currentPosition) {
        latitude = gps.currentPosition.latitude
        longitude = gps.currentPosition.longitude
        setLocationStatus('acquired')
      } else {
        // Try browser geolocation
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve(pos.coords),
              (err) => reject(err),
              { enableHighAccuracy: true, timeout: 10000 }
            )
          })
          latitude = pos.latitude
          longitude = pos.longitude
          setLocationStatus('acquired')
        } catch (geoError) {
          setLocationStatus('failed')
          toast.error('Could not access geolocation. Please enable location services.')
          return
        }
      }

      // Create incident via API
      const response = await api.post('/api/incidents', {
        emergencyType,
        severity,
        description: description || 'Emergency response',
        source: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      }, { withCredentials: true })

      if (response.data.success) {
        setIncident(response.data.data.incident)
        setShowMap(true)
        toast.success('Emergency incident created successfully')
      } else {
        toast.error(response.data.message || 'Failed to create incident')
      }
    } catch (error) {
      console.error('Create incident error:', error)
      toast.error(error.message || 'Failed to create incident. Please try again.')
    }
  }, [emergencyType, severity, description, gps.currentPosition, toast, navigate])

  // If we have an incident, show the route display
  if (incident && showMap) {
    return (
      <div className="sos-page-container">
        <h2>Emergency Incident Created</h2>
        <p>Incident ID: {incident._id.substring(0, 8)}</p>
        <p>Status: {incident.status}</p>
        <p>Emergency Type: {emergencyType === 1 ? 'Medical' : emergencyType === 2 ? 'Fire' : 'Police'}</p>
        <RouteDisplay incident={incident} />
        <button
          className="btn-primary"
          onClick={() => navigate('/')}
          style={{ marginTop: '1rem' }}
        >
          Return to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="sos-page">
      <div className="sos-page-header">
        <h1>🚨 Emergency SOS</h1>
        <p>Report an emergency to get rapid response</p>
      </div>

      <div className="sos-page-form">
        {/* Emergency Type Selection */}
        <div className="form-group">
          <label htmlFor="emergency-type">Emergency Type</label>
          <select
            id="emergency-type"
            value={emergencyType}
            onChange={(e) => setEmergencyType(Number(e.target.value))}
            className="select-input"
          >
            {EMERGENCY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Severity Selection */}
        <div className="form-group">
          <label htmlFor="severity">Severity (1-5)</label>
          <select
            id="severity"
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="select-input"
          >
            <option value={1}>1 - Minor</option>
            <option value={2}>2 - Moderate</option>
            <option value={3} selected>{3 - Significant</option>
            <option value={4}>4 - Severe</option>
            <option value={5}>5 - Critical</option>
          </select>
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the emergency..."
            rows={3}
            className="textarea-input"
          ></textarea>
        </div>

        {/* Location Status */}
        <div className="form-group">
          <label htmlFor="location-status">Location</label>
          <div className="location-status-badge {locationStatus}">
            {locationStatus}
          </div>
        </div>

        {/* SOS Button */}
        <SOSButton />

        {/* Create Incident Button */}
        <button
          className="btn-primary w-full"
          onClick={handleCreateIncident}
          disabled={isLoading || !user}
          style={{ marginTop: '1rem' }}
        >
          {isLoading ? 'Creating incident...' : 'Send Emergency Response'}
        </button>
      </div>
    </div>
  )
}

// Helper computed property for loading state
const SOSPage = (props) => {
  const [isLoading, setIsLoading] = useState(false)
  // ...
}