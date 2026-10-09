/**
 * SOSButton - One-tap SOS emergency button
 * Triggers browser geolocation, creates incident immediately
 * Prevents duplicate submissions, shows loading state
 * Uses Axios with automatic httpOnly cookie sending
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from 'react-hot-toast'
import { useSelector, useDispatch } from 'react-redux' // or custom hook
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export const SOSButton = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [hasPermission, setHasPermission] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { hasPermission: checkPermission } = useAuth()
  const dispatch = useDispatch()
  const toast = useToast()

  // Check if user has citizen role to create incidents
  useEffect(() => {
    if (user) {
      setHasPermission(checkPermission('incident:create'))
    }
  }, [user, checkPermission])

  const handleSOS = useCallback(async (e) => {
    e.preventDefault()

    if (isLoading) {
      toast.error('SOS already in progress, please wait...')
      return
    }

    if (!hasPermission) {
      toast.error('You do not have permission to create incidents')
      return
    }

    setIsLoading(true)
    toast.info('📍 Getting your location...')

    try {
      // Get browser geolocation
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => reject(new Error('Geolocation denied or failed: ' + err.message)),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000,
          }
        )
      })

      const { latitude, longitude } = position

      // Create incident via API - citizen role, medical emergency type by default
      // The backend will handle emergency type logic based on user role/context
      const response = await api.post('/api/incidents', {
        emergencyType: 1, // MEDICAL - will be adjusted based on context
        severity: 3,
        source: {
          type: 'Point',
          coordinates: [longitude, latitude], // GeoJSON: [lng, lat]
        },
      }, { withCredentials: true })

      if (response.data.success) {
        const incident = response.data.data.incident
        toast.success(`SOS dispatched! Incident #${incident._id.substring(0, 8)}`)
        navigate(`/incident/${incident._id}`)
      } else {
        toast.error(response.data.message || 'Failed to create incident')
      }
    } catch (error) {
      console.error('SOS error:', error)
      toast.error(error.message || 'Failed to send SOS. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasPermission, toast, navigate])

  return (
    <div className="sos-button-container">
      <button
        className={`sos-btn ${isLoading ? 'sos-btn-loading' : ''}`}
        onClick={handleSOS}
        disabled={isLoading || !hasPermission}
        aria-label={isLoading ? 'SOS in progress...' : 'Send SOS Emergency Signal'}
      >
        {isLoading ? (
          <svg className="sos-spinner" viewBox="0 0 24 24" width="20" height="20">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
            />
            <path
              className="sos-path"
              fill="currentColor"
              d="M7.57 18.35l5.03-4.85 3.14 4.15 5.96-1.55-1.8 5.08-4.56-3.78 1.98-5.45-3.87 4.42-5.37-4.56 1.87-4.15-5.03 4.85-3.14-4.15-5.96 1.55 1.8-5.08-5.08-1.88-4.42 5.37 3.87-4.42 5.45 3.87-1.98 5.45 4.56-1.98z"
            />
          </svg>
        ) : (
          'SOS'
        )}
      </button>
    </div>
  )
}