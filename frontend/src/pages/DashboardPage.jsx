/**
 * DashboardPage - Role-based dashboard for all user roles
 * Citizens: view own incidents, track assigned vehicles
 * Dispatchers: view all incidents, assign vehicles, monitor routes
 * Drivers/Responders: assigned incidents, live GPS, status updates
 * Hospital Staff: capacity updates, patient acceptance, incoming incidents
 * Admins: user/vehicle/facility management, analytics
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useToast } from 'react-hot-toast'
import { useSelector, useDispatch } from 'react-redux'
import { useAuth } from '../contexts/AuthContext'
import { useGPS } from '../hooks/useGPS'
import { useSocketIO } from '../hooks/useSocket.io'
import api from '../services/api'
import MapComponent from '../components/Map/Map'
import RouteDisplay from '../components/RouteDisplay/RouteDisplay'
import { v4 as uuidv4 } from 'uuid'

export const DashboardPage = () => {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const { user: socketUser } = useAuth()
  const [toast] = useToast()

  // Socket.IO integration
  const { socket, connect, disconnect, emit, on } = useSocketIO()

  // State for map and route management
  const [activeIncident, setActiveIncident] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [facilities, setFacilities] = useState([])
  const [hazards, setHazards] = useState([])
  const [incidents, setIncidents] = useState([])
  const [dashboardStats, setDashboardStats] = useState({})
  const [isLoading, setIsLoading] = useState(true)

  // GPS tracking for current user's vehicle (if driver)
  const { manualUpdate, ...gps } = useGPS(user?.id, (position) => {
    // Auto-update vehicle position via API
    if (role === 'driver' && socket) {
      emit('vehicle-update', {
        vehicleId: user.id,
        latitude: position.latitude,
        longitude: position.longitude,
      })
    }
  })

  // Load dashboard data based on role
  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true)

      try {
        // Fetch incidents based on role
        let incidentsUrl = '/api/incidents'
        let vehiclesUrl = '/api/vehicles'
        let facilitiesUrl = '/api/facilities'
        let hazardsUrl = '/api/hazards'

        // Apply role-based filtering
        if (role === 'citizen' && user) {
          incidentsUrl = `/api/incidents?citizen=${user.id}`
          // Also load assigned vehicle's incident
        } else if (role === 'dispatcher') {
          // Dispatcher sees all incidents
        } else if (role === 'driver') {
          // Driver sees only assigned incidents
          if (user && user.currentIncident) {
            incidentsUrl = `/api/incidents/${user.currentIncident}`
          }
        } else if (role === 'hospital_staff') {
          // Hospital staff sees assigned incidents
          incidentsUrl = '/api/incidents?status=En Route'
        }

        // Fetch data in parallel
        const [
          incResponse,
          vehResponse,
          facResponse,
          hazResponse,
          statsResponse,
        ] = await Promise.all([
          api.get(incidentsUrl, { withCredentials: true }),
          api.get(vehiclesUrl, { withCredentials: true }),
          api.get(facilitiesUrl, { withCredentials: true }),
          api.get(hazardsUrl, { withCredentials: true }),
          api.get('/api/dashboard/status-counts', { withCredentials: true }),
        ])

        if (incResponse.data.success) {
          setIncidents(incResponse.data.data.incidents || [])
        }
        if (vehResponse.data.success) {
          setVehicles(vehResponse.data.data.vehicles || [])
        }
        if (facResponse.data.success) {
          setFacilities(facResponse.data.data.facilities || [])
        }
        if (hazResponse.data.success) {
          setHazards(hazResponse.data.data.hazards || [])
        }
        if (statsResponse.data.success) {
          setDashboardStats(statsResponse.data.data)
        }

        // Set active incident (first visible one)
        if (incidents.length > 0) {
          setActiveIncident(incidents[0]._id)
        }

      } catch (error) {
        console.error('Dashboard load error:', error)
        toast.error('Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [role, user, socket])

  // Socket.IO listeners for real-time updates
  useEffect(() => {
    if (!socket) return

    // Listen for new incidents
    on('new-incident', (data) => {
      toast.info(`New incident: ${data.incidentType}`)
      loadDashboard() // Refresh data
    })

    // Listen for vehicle position updates
    on('vehicle-update', (data) => {
      // Update local vehicle state
      setVehicles(prev =>
        prev.map((v) =>
          v._id === data.vehicleId
            ? { ...v, currentLocation: { type: 'Point', coordinates: [data.longitude, data.latitude] } }
            : v
        )
      )
    })

    // Listen for status updates
    on('status-update', (data) => {
      setIncidents(prev =>
        prev.map((i) =>
          i._id === data.incidentId
            ? { ...i, status: data.newStatus }
            : i
        )
      )
    })

    // Listen for route recalculation
    on('route-recalculated', (data) => {
      toast.info('Route recalculated due to new hazard')
      loadDashboard()
    })

    return () => {
      off('new-incident')
      off('vehicle-update')
      off('status-update')
      off('route-recalculated')
    }
  }, [socket])

  // Helper: Get incident status label
  const getStatusLabel = (status) => {
    const labels = {
      Reported: 'Reported',
      Assigned: 'Assigned',
      EnRoute: 'En Route',
      Arrived: 'Arrived',
      Resolved: 'Resolved',
    }
    return labels[status] || status
  }

  // Helper: Get emergency type label
  const getEmergencyTypeLabel = (type) => {
    const labels = {
      1: 'Medical',
      2: 'Fire',
      3: 'Police',
      4: 'Rescue',
      5: 'Hazmat',
    }
    return labels[type] || `Type ${type}`
  }

  // Helper: Get role-specific dashboard content
  const getDashboardContent = () => {
    switch (role) {
      case 'citizen':
        return CitizenDashboard()
      case 'dispatcher':
        return DispatcherDashboard()
      case 'driver':
        return DriverDashboard()
      case 'hospital_staff':
        return HospitalDashboard()
      case 'admin':
        return AdminDashboard()
      default:
        return null
    }
  }

  // Citizen dashboard subset
  const CitizenDashboard = () => (
    <div className="role-dashboard">
      <h3>Your Incidents</h3>
      {isLoading ? (
        <p>Loading your incidents...</p>
      ) : incidents.length === 0 ? (
        <p>No incidents reported. Press SOS to report an emergency.</p>
      ) : (
        <ul className="incident-list">
          {incidents.map((inc) => (
            <li key={inc._id} className="incident-item">
              <span>{getEmergencyTypeLabel(inc.emergencyType)}</span>
              <span>{getStatusLabel(inc.status)}</span>
              <span>
                {new Date(inc.reportedAt).toLocaleTimeString()} -
                {inc.status === 'Resolved' ? 'Resolved' : inc.status}
              </span>
              <button
                className="small-btn"
                onClick={() => setActiveIncident(inc._id)}
                style={{ marginLeft: '0.5rem' }}
              >
                View
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        className="btn-secondary"
        onClick={() => navigate('/sos')}
        style={{ marginTop: '1rem' }}
      >
        Report New Emergency (SOS)
      </button>
    </div>
  )

  // Dispatcher dashboard subset
  const DispatcherDashboard = () => (
    <div className="role-dashboard">
      <h3>Dispatch Console</h3>
      <div className="stats-grid">
        {Object.entries(dashboardStats).map(([key, value]) => (
          <div key={key} className="stat-card">
            <span>{key}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>

      <h4>Active Incidents</h4>
      {isLoading ? (
        <p>Loading incidents...</p>
      ) : incidents.length === 0 ? (
        <p>No active incidents</p>
      ) : (
        <ul className="incident-list">
          {incidents.map((inc) => (
            <li key={inc._id} className="incident-item">
              <span>{getEmergencyTypeLabel(inc.emergencyType)}</span>
              <span>{getStatusLabel(inc.status)}</span>
              <span>
                Assigned to: {inc.assignedVehicle ? `Vehicle ${inc.assignedVehicle.plateNumber}` : 'Unassigned'}
              </span>
              <div style={{ marginTop: '0.5rem' }}>
                {inc.status === 'Reported' && (
                  <button
                    className="btn-small"
                    onClick={() => setActiveIncident(inc._id)}
                  >
                    Assign Vehicle
                  </button>
                )}
                {inc.status === 'Assigned' && inc.assignedVehicle && (
                  <button
                    className="btn-small"
                    onClick={() => setActiveIncident(inc._id)}
                  >
                    Re-route
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  // Driver dashboard subset
  const DriverDashboard = () => (
    <div className="role-dashboard">
      <h3>My Assignment</h3>
      {activeIncident ? (
        <div className="assignment-card">
          <h4>Incident {activeIncident.toString().substring(0, 8)}</h4>
          <p>Status: {getStatusLabel(activeIncident.status)}</p>
          <p>Emergency Type: {getEmergencyTypeLabel(activeIncident.emergencyType)}</p>
          <RouteDisplay incident={{ _id: activeIncident } as any} />
          <button
            className="btn-primary"
            onClick={() => navigate(`/incident/${activeIncident._id}`)}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            View Full Details
          </button>
        </div>
      ) : (
        <p>No active assignment. Check back later or contact dispatcher.</p>
      )}
    </div>
  )

  // Hospital dashboard subset
  const HospitalDashboard = () => (
    <div className="role-dashboard">
      <h3>Hospital Capacity</h3>
      {facilities.length > 0 ? (
        <div className="capacity-grid">
          {facilities.map((fac) => (
            <div key={fac._id} className="capacity-card">
              <h4>{fac.name}</h4>
              <p>Type: {fac.type}</p>
              <p>Beds: {fac.bedCapacity.available}/{fac.bedCapacity.total}</p>
              <p>ICU: {fac.bedCapacity.icuAvailable}/{fac.bedCapacity.icuTotal}</p>
              <p>Oxygen: {fac.bedCapacity.oxygenAvailable}/{fac.bedCapacity.oxygenTotal}</p>
              <button
                className="btn-small"
                onClick={() =>
                  setActiveIncident(fac._id) // Reuse activeIncident state for capacity update
                }
              >
                Update Capacity
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p>No facilities loaded</p>
      )}
      <button
        className="btn-secondary"
        onClick={() => navigate('/hospital')}
        style={{ marginTop: '1rem' }}
      >
        Manage Hospital Capacity
      </button>
    </div>
  )

  // Admin dashboard subset
  const AdminDashboard = () => (
    <div className="role-dashboard">
      <h3>Admin Controls</h3>
      <div className="admin-actions">
        <button
          className="btn-secondary"
          onClick={() => navigate('/users')}
          style={{ marginRight: '1rem' }}
        >
          Manage Users
        </button>
        <button
          className="btn-secondary"
          onClick={() => navigate('/vehicles')}
          style={{ marginRight: '1rem' }}
        >
          Manage Vehicles
        </button>
        <button
          className="btn-secondary"
          onClick={() => navigate('/facilities')}
          style={{ marginRight: '1rem' }}
        >
          Manage Facilities
        </button>
      </div>

      <h4>System Analytics</h4>
      {Object.keys(dashboardStats).length > 0 && (
        <div className="analytics-summary">
          {Object.entries(dashboardStats).map(([key, value]) => (
            <div key={key} className="analytics-item">
              <span>{key}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn-secondary"
        onClick={() => navigate('/audit-logs')}
        style={{ marginTop: '1rem' }}
      >
        View Audit Logs
      </button>
    </div>
  )

  // Main render - if no role matches, show generic
  if (!role) {
    return (
      <div className="loading-screen">
        <h1>Emergency Route Planner</h1>
        <p>Loading role-based dashboard...</p>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <MapComponent
        activeIncident={activeIncident}
        vehicles={vehicles}
        facilities={facilities}
        hazards={hazards}
        onIncidentSelect={setActiveIncident}
        role={role}
        user={user}
      />
      {getDashboardContent()}
    </div>
  )
}