import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Incident, IncidentStatus, UserRole } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import EmergencyMap from '../components/Map/EmergencyMap'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Clock,
  MapPin,
  CheckCircle,
  Truck,
  Hospital,
  Shield,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react'

export const IncidentDetailPage: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>()
  const { user, role } = useAuth()
  const { socket, joinIncident } = useSocket()
  const navigate = useNavigate()

  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [rerouting, setRerouting] = useState(false)

  const fetchIncident = async () => {
    try {
      const res = await api.get(`/incidents/${incidentId}`)
      if (res.data.success) {
        setIncident(res.data.data)
      }
    } catch (err: any) {
      toast.error('Could not load incident details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncident()
    if (incidentId) {
      joinIncident(incidentId)
    }
  }, [incidentId])

  useEffect(() => {
    if (!socket || !incidentId) return

    socket.on('incident:updated', (updated: Incident) => {
      if (updated._id === incidentId) {
        setIncident(updated)
        toast('Incident status updated in real-time', { icon: '⚡' })
      }
    })

    return () => {
      socket.off('incident:updated')
    }
  }, [socket, incidentId])

  const handleReroute = async () => {
    if (!incidentId) return
    setRerouting(true)
    try {
      const res = await api.post(`/incidents/${incidentId}/reroute`)
      if (res.data.success) {
        toast.success('Route recalculated successfully!')
        fetchIncident()
      }
    } catch (err) {
      toast.error('Failed to recalculate route.')
    } finally {
      setRerouting(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 font-semibold text-sm">
        Retrieving incident telemetry and route telemetry...
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="py-20 text-center text-red-500 font-semibold text-sm">
        Incident record not found or access denied.
      </div>
    )
  }

  const steps = [
    IncidentStatus.REPORTED,
    IncidentStatus.ACKNOWLEDGED,
    IncidentStatus.ASSIGNED,
    IncidentStatus.ACCEPTED,
    IncidentStatus.EN_ROUTE,
    IncidentStatus.ON_SCENE,
    IncidentStatus.RESOLVED,
  ]

  const currentStepIndex = steps.indexOf(incident.status)

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </button>

        <button
          onClick={handleReroute}
          disabled={rerouting}
          className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${rerouting ? 'animate-spin' : ''}`} />
          Recalculate Route
        </button>
      </div>

      {/* Incident Title Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{incident.incidentNumber}</h1>
            <span className="text-xs px-2.5 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 font-bold uppercase">
              {incident.status}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              Severity: {incident.severity} / 5
            </span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{incident.description}</p>
        </div>

        {/* Route Metrics Summary */}
        {incident.currentRoute && (
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-6 text-center">
            <div>
              <div className="text-[11px] text-slate-500 font-semibold uppercase">Route Distance</div>
              <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {(incident.currentRoute.distanceMeters / 1000).toFixed(1)} km
              </div>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
            <div>
              <div className="text-[11px] text-slate-500 font-semibold uppercase">Estimated Travel</div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {Math.round(incident.currentRoute.durationSeconds / 60)} mins
              </div>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
            <div>
              <div className="text-[11px] text-slate-500 font-semibold uppercase">Routing Engine</div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                {incident.currentRoute.isFallback ? 'Geodesic Diagnostic ⚠️' : 'OSRM Live Road'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lifecycle Progress Stepper */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm overflow-x-auto transition-colors">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Incident Lifecycle Progression
        </h3>
        <div className="flex items-center justify-between min-w-[650px] relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
          {steps.map((st, idx) => {
            const isCompleted = idx <= currentStepIndex
            const isCurrent = idx === currentStepIndex

            return (
              <div key={st} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    isCurrent
                      ? 'bg-red-600 text-white ring-4 ring-red-500/20 shadow-lg'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span
                  className={`text-[11px] font-semibold mt-2 whitespace-nowrap ${
                    isCurrent
                      ? 'text-red-600 dark:text-red-400 font-bold'
                      : isCompleted
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400'
                  }`}
                >
                  {st}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Map & Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
        {/* Map */}
        <div className="lg:col-span-8 h-[480px]">
          <EmergencyMap
            center={[incident.source.coordinates[1], incident.source.coordinates[0]]}
            zoom={14}
            incidents={[incident]}
            vehicles={incident.assignedVehicle ? [incident.assignedVehicle as any] : []}
            facilities={incident.hospital ? [incident.hospital as any] : []}
            selectedIncident={incident}
            onRetryRoute={handleReroute}
          />
        </div>

        {/* Timeline & Metadata */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col transition-colors">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-red-500" />
            Audit Timeline History
          </h3>

          <div className="flex-1 overflow-y-auto space-y-4 max-h-[400px]">
            {incident.timeline?.map((entry, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{entry.status}</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{entry.note}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {new Date(entry.timestamp).toLocaleTimeString()} &bull; {new Date(entry.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Assigned Unit Card */}
          {incident.assignedVehicle && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Dispatched Unit</div>
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {(incident.assignedVehicle as any).plateNumber}
                  </div>
                  <div className="text-xs text-slate-500 capitalize">
                    {(incident.assignedVehicle as any).type?.replace('_', ' ')}
                  </div>
                </div>
                <Truck className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          )}

          {/* Receiving Hospital Card */}
          {incident.hospital && (
            <div className="mt-3">
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Receiving Facility</div>
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {(incident.hospital as any).name}
                  </div>
                  <div className="text-xs text-slate-500">
                    Beds: {(incident.hospital as any).bedCapacity?.available} available
                  </div>
                </div>
                <Hospital className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default IncidentDetailPage
