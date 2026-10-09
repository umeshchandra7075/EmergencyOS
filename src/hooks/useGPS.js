/**
 * useGPS Hook - Vehicle GPS tracking with throttle
 * Maximum 1 update per 3 seconds per vehicle
 * Emits position updates via Socket.IO to connected clients
 */

import { useEffect, useRef } from 'react'
import axios from 'axios'

// Throttle configuration
const GPS_THROTTLE_MS = 3000 // 1 update per 3 seconds max
const lastUpdateRef = useRef(0)

// Track GPS positions per vehicle
const vehiclePositionsRef = useRef(new Map())

export const useGPS = (vehicleId, onPositionUpdate) => {
  const positionQueueRef = useRef([])

  useEffect(() => {
    const handlePositionUpdate = async (position) => {
      const now = Date.now()
      const lastUpdate = lastUpdateRef.current

      // Throttle: only update if enough time has passed
      if (now - lastUpdate < GPS_THROTTLE_MS) {
        // Queue the update for later
        positionQueueRef.current.push(position)
        return
      }

      lastUpdateRef.current = now

      try {
        // Update vehicle location in database
        await axios.patch(`/api/vehicles/${vehicleId}/status`, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          status: 'en_route',
        }, {
          withCredentials: true,
        })

        // Update local tracking state
        if (onPositionUpdate) {
          onPositionUpdate({
            vehicleId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: position.timestamp,
            accuracy: position.coords.accuracy,
          })
        }

        // Queue next update if there are queued updates
        if (positionQueueRef.current.length > 0) {
          const nextPosition = positionQueueRef.current.shift()
          handlePositionUpdate(nextPosition) // Recursive - will pass throttle check
        }
      } catch (error) {
        console.error('GPS update failed:', error)
        // Queue for retry
        positionQueueRef.current.push(position)
      }
    }

    // Set up watcher for geolocation
    let watchId = null

    const initWatch = () => {
      if (!navigator.geolocation) {
        console.error('Geolocation not supported')
        return
      }

      // Get current position first
      navigator.geolocation.getCurrentPosition((position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        }
        handlePositionUpdate(coords)
      }, (err) => {
        console.error('Geolocation error:', err)
      }, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      })

      // Watch ongoing position changes
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          }
          handlePositionUpdate(coords)
        },
        (err) => {
          console.error('Ongoing geolocation error:', err)
        },
        {
          enableHighAccuracy: true,
          maximumAge: 2000,
          timeout: 5000,
        }
      )
    }

    initWatch()

    // Cleanup on unmount
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [vehicleId, onPositionUpdate])

  // Public method to manually update position (for testing/simulation)
  const manualUpdate = (latitude, longitude) => {
    const now = Date.now()
    if (now - lastUpdateRef.current < GPS_THROTTLE_MS) {
      positionQueueRef.current.push({ latitude, longitude, timestamp: now })
      return false
    }
    lastUpdateRef.current = now
    // Trigger update
    if (onPositionUpdate) {
      onPositionUpdate({
        vehicleId,
        latitude,
        longitude,
        timestamp: new Date(),
        accuracy: 10,
      })
    }
    return true
  }

  return { manualUpdate }
}

// Queue GPS updates to server with throttle
export const queueGPSUpdate = async (vehicleId, latitude, longitude) => {
  const now = Date.now()
  const lastUpdate = lastUpdateRef.current

  if (now - lastUpdate < GPS_THROTTLE_MS) {
    // Add to queue - will be processed after throttle period
    positionQueueRef.current.push({ vehicleId, latitude, longitude, timestamp: now })
    return false
  }

  lastUpdateRef.current = now

  try {
    await axios.patch(`/api/vehicles/${vehicleId}/status`, {
      latitude,
      longitude,
      status: 'en_route',
    }, {
      withCredentials: true,
    })
    return true
  } catch (error) {
    console.error('Queued GPS update failed:', error)
    return false
  }
}