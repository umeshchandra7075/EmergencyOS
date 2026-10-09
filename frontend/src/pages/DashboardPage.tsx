import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import api from '../services/api'
import { Incident, Vehicle, Facility, Hazard, IncidentStatus, UserRole } from '../types'
import EmergencyMap from '../components/Map/EmergencyMap'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Truck,
  Hospital,
  Activity,
  ArrowRight,
  Shield,
  Navigation,
  RefreshCw,
} from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const { user, role } = useAuth()
  const { socket, sendLocationUpdate } = useSocket()
  const navigate = useNavigate()

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [hazards, setHazards] = useState<Hazard[]>([])
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)

  // Dispatcher Assign Modal
  const [assignModalIncident, setAssignModalIncident] = useState<Incident | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')

  // Responder simulated GPS streaming
  const [gpsStreaming, setGpsStreaming] = useState(false)

  const loadData = async () => {
    try {
      const [incRes, vehRes, facRes, hazRes] = await Promise.all([
        api.get('/incidents'),
        api.get('/vehicles'),
        api.get('/facilities'),
        api.get('/hazards'),
      ])

      if (incRes.data.success) {
        setIncidents(incRes.data.data.incidents || [])
        if (incRes.data.data.incidents?.length > 0 && !selectedIncident) {
          setSelectedIncident(incRes.data.data.incidents[0])
        }
      }
      if (vehRes.data.success) {
        setVehicles(vehRes.data.data.vehicles || [])
      }
      if (facRes.data.success) {
        setFacilities(facRes.data.data.facilities || [])
      }
      if (hazRes.data.success) {
        setHazards(hazRes.data.data.hazards || [])
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  // Real-time Socket.IO event listeners
  useEffect(() => {
    if (!socket) return

    socket.on('incident:created', (newIncident: Incident) => {
      setIncidents((prev) => [newIncident, ...prev])
      toast(`🚨 New Emergency: ${newIncident.incidentNumber}`, { icon: '🚨' })
    })

    socket.on('incident:updated', (updatedIncident: Incident) => {
      setIncidents((prev) =>
        prev.map((i) => (i._id === updatedIncident._id ? updatedIncident : i))
      )
      if (selectedIncident?._id === updatedIncident._id) {
        setSelectedIncident(updatedIncident)
      }
    })

    socket.on('incident:assigned', (assignedIncident: Incident) => {
      setIncidents((prev) =>
        prev.map((i) => (i._id === assignedIncident._id ? assignedIncident : i))
      )
      if (
        role === UserRole.RESPONDER &&
        String(assignedIncident.assignedResponder?._id || assignedIncident.assignedResponder) === String(user?.id)
      ) {
        toast.success(`You have been dispatched to Incident ${assignedIncident.incidentNumber}!`)
      }
    })

    socket.on('vehicle:location:update', (data: { vehicleId: string; coordinates: [number, number]; speed?: number; heading?: number }) => {
      setVehicles((prev) =>
        prev.map((v) =>
          v._id === data.vehicleId
            ? { ...v, currentLocation: { type: 'Point', coordinates: data.coordinates }, speed: data.speed ?? v.speed, heading: data.heading ?? v.heading }
            : v
        )
      )
    })

    return () => {
      socket.off('incident:created')
      socket.off('incident:updated')
      socket.off('incident:assigned')
      socket.off('vehicle:location:update')
    }
  }, [socket, selectedIncident, user, role])

  // Simulated GPS streamer for responders
  useEffect(() => {
    if (!gpsStreaming || !user?.vehicle) return

    let step = 0
    // Simulation waypoint path in Hyderabad towards patient
    const routePoints: [number, number][] = [
      [78.4750, 17.4100],
      [78.4735, 17.4150],
      [78.4720, 17.4200],
      [78.4705, 17.4260],
      [78.4690, 17.4320],
      [78.4680, 17.4380],
      [78.4680, 17.4050],
    ]

    const interval = setInterval(() => {
      const coords = routePoints[step % routePoints.length]
      sendLocationUpdate({
        vehicleId: user.vehicle._id || user.vehicle,
        coordinates: coords,
        heading: (step * 35) % 360,
        speed: 48,
        incidentId: selectedIncident?._id,
      })
      step++
    }, 4000)

    return () => clearInterval(interval)
  }, [gpsStreaming, user, selectedIncident, sendLocationUpdate])

  const handleAcknowledge = async (incidentId: string) => {
    try {
      const res = await api.post(`/incidents/${incidentId}/acknowledge`)
      if (res.data.success) {
        toast.success('Incident triaged and acknowledged.')
        loadData()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Acknowledge failed')
    }
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignModalIncident || !selectedVehicleId) return

    try {
      const vehicle = vehicles.find((v) => v._id === selectedVehicleId)
      const res = await api.post(`/incidents/${assignModalIncident._id}/assign`, {
        vehicleId: selectedVehicleId,
        responderId: vehicle?.driver?._id || vehicle?.driver,
      })

      if (res.data.success) {
        toast.success(`Unit ${vehicle?.plateNumber} assigned!`)
        setAssignModalIncident(null)
        setSelectedVehicleId('')
        loadData()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Assignment failed')
    }
  }

  const handleAcceptAssignment = async (incidentId: string) => {
    try {
      const res = await api.post(`/incidents/${incidentId}/accept`)
      if (res.data.success) {
        toast.success('Assignment accepted.')
        loadData()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Accept failed')
    }
  }

  const handleUpdateStatus = async (incidentId: string, targetStatus: string) => {
    try {
      const res = await api.patch(`/incidents/${incidentId}/status`, {
        status: targetStatus,
      })
      if (res.data.success) {
        toast.success(`Status updated to ${targetStatus}!`)
        loadData()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Status transition failed')
    }
  }

  const statusColors: Record<string, string> = {
    [IncidentStatus.REPORTED]: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/30',
    [IncidentStatus.ACKNOWLEDGED]: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30',
    [IncidentStatus.ASSIGNED]: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30',
    [IncidentStatus.ACCEPTED]: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/30',
    [IncidentStatus.EN_ROUTE]: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/30',
    [IncidentStatus.ON_SCENE]: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
    [IncidentStatus.RESOLVED]: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30',
    [IncidentStatus.CANCELLED]: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  }

  const availableVehicles = vehicles.filter((v) => v.status === 'available')

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Operations Console</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold uppercase border border-slate-200 dark:border-slate-700">
              Role: {role}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Real-time geospatial telemetry, routing and dispatch state machine
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === UserRole.CITIZEN && (
            <Link
              to="/sos"
              className="py-2.5 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-red-900/40 radar-ping"
            >
              <AlertTriangle className="w-4 h-4" />
              TRIGGER SOS
            </Link>
          )}

          {role === UserRole.RESPONDER && (
            <button
              onClick={() => setGpsStreaming(!gpsStreaming)}
              className={`py-2 px-4 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                gpsStreaming
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Navigation className={`w-3.5 h-3.5 ${gpsStreaming ? 'animate-pulse' : ''}`} />
              {gpsStreaming ? 'GPS Streaming Active' : 'Start GPS Streaming'}
            </button>
          )}

          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
            title="Refresh state"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Map & Incident Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left Column: Interactive Map */}
        <div className="lg:col-span-7 flex flex-col h-[520px] lg:h-[650px]">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-xl px-4 py-3 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-semibold transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Spatial View (Hyderabad Operational Grid)
            </div>
            <div>
              {selectedIncident ? (
                <span className="text-red-500 font-bold">
                  Tracking: {selectedIncident.incidentNumber}
                </span>
              ) : (
                'Select an incident to view route'
              )}
            </div>
          </div>
          <div className="flex-1">
            <EmergencyMap
              incidents={incidents}
              vehicles={vehicles}
              facilities={facilities}
              hazards={hazards}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
            />
          </div>
        </div>

        {/* Right Column: Incident Feed & Role Actions */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-center shadow-sm">
              <div className="text-xs text-slate-500 font-medium">Active Incidents</div>
              <div className="text-xl font-black text-red-500 mt-0.5">
                {incidents.filter((i) => i.status !== IncidentStatus.RESOLVED && i.status !== IncidentStatus.CANCELLED).length}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-center shadow-sm">
              <div className="text-xs text-slate-500 font-medium">Ready Units</div>
              <div className="text-xl font-black text-emerald-500 mt-0.5">
                {availableVehicles.length} / {vehicles.length}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-center shadow-sm">
              <div className="text-xs text-slate-500 font-medium">Resolved</div>
              <div className="text-xl font-black text-slate-700 dark:text-slate-300 mt-0.5">
                {incidents.filter((i) => i.status === IncidentStatus.RESOLVED).length}
              </div>
            </div>
          </div>

          {/* Incident List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-500" />
                Emergency Queue ({incidents.length})
              </h2>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-3 max-h-[460px]">
              {incidents.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No active incidents recorded.
                </div>
              ) : (
                incidents.map((inc) => {
                  const isSelected = selectedIncident?._id === inc._id
                  const canAcknowledge =
                    (role === UserRole.DISPATCHER || role === UserRole.ADMIN) &&
                    inc.status === IncidentStatus.REPORTED
                  const canAssign =
                    (role === UserRole.DISPATCHER || role === UserRole.ADMIN) &&
                    inc.status === IncidentStatus.ACKNOWLEDGED
                  const canAccept =
                    (role === UserRole.RESPONDER || role === UserRole.DRIVER || role === UserRole.ADMIN) &&
                    inc.status === IncidentStatus.ASSIGNED
                  const canEnRoute =
                    (role === UserRole.RESPONDER || role === UserRole.DRIVER || role === UserRole.ADMIN) &&
                    inc.status === IncidentStatus.ACCEPTED
                  const canOnScene =
                    (role === UserRole.RESPONDER || role === UserRole.DRIVER || role === UserRole.ADMIN) &&
                    inc.status === IncidentStatus.EN_ROUTE
                  const canResolve =
                    (role === UserRole.RESPONDER || role === UserRole.DRIVER || role === UserRole.DISPATCHER || role === UserRole.ADMIN) &&
                    inc.status === IncidentStatus.ON_SCENE

                  return (
                    <div
                      key={inc._id}
                      onClick={() => setSelectedIncident(inc)}
                      className={`p-4 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'border-red-500 bg-red-50/40 dark:bg-slate-800/80 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {inc.incidentNumber}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                                statusColors[inc.status] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {inc.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                            {inc.description}
                          </p>
                          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-3">
                            <span>📍 {inc.sourceAddress || 'Hyderabad'}</span>
                            <span>⚡ Severity: {inc.severity}/5</span>
                          </div>
                        </div>

                        <Link
                          to={`/incident/${inc._id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          title="View detailed timeline and telemetry"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>

                      {/* State Machine Transition Actions */}
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
                        {canAcknowledge && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAcknowledge(inc._id)
                            }}
                            className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold py-1 px-3 rounded-lg transition"
                          >
                            Acknowledge Triage
                          </button>
                        )}

                        {canAssign && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setAssignModalIncident(inc)
                            }}
                            className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded-lg transition"
                          >
                            Assign Responder Unit
                          </button>
                        )}

                        {canAccept && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAcceptAssignment(inc._id)
                            }}
                            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 px-3 rounded-lg transition"
                          >
                            Accept Assignment
                          </button>
                        )}

                        {canEnRoute && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUpdateStatus(inc._id, IncidentStatus.EN_ROUTE)
                            }}
                            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-3 rounded-lg transition"
                          >
                            Depart En Route
                          </button>
                        )}

                        {canOnScene && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUpdateStatus(inc._id, IncidentStatus.ON_SCENE)
                            }}
                            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 px-3 rounded-lg transition"
                          >
                            Mark On Scene
                          </button>
                        )}

                        {canResolve && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUpdateStatus(inc._id, IncidentStatus.RESOLVED)
                            }}
                            className="text-xs bg-slate-700 hover:bg-slate-600 text-white font-bold py-1 px-3 rounded-lg transition"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dispatcher Unit Assignment Modal */}
      {assignModalIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Assign Unit to {assignModalIncident.incidentNumber}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Select an available emergency vehicle to calculate dispatch route and dispatch responder
            </p>

            <form onSubmit={handleAssign} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
                  Available Fleet Units ({availableVehicles.length})
                </label>
                {availableVehicles.length === 0 ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-600 dark:text-red-400">
                    No units currently available. All vehicles are on active dispatch.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableVehicles.map((v) => (
                      <label
                        key={v._id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition ${
                          selectedVehicleId === v._id
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-white font-bold'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="vehicle"
                            value={v._id}
                            checked={selectedVehicleId === v._id}
                            onChange={() => setSelectedVehicleId(v._id)}
                            className="accent-blue-600"
                          />
                          <div>
                            <div>{v.plateNumber}</div>
                            <div className="text-[10px] text-slate-500 capitalize">{v.type.replace('_', ' ')}</div>
                          </div>
                        </div>
                        {v.driver && (
                          <div className="text-[11px] text-slate-500">
                            Driver: <strong>{v.driver.name}</strong>
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAssignModalIncident(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedVehicleId}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white disabled:opacity-50"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
