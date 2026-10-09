import React, { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import EmergencyMap from '../components/Map/EmergencyMap'
import { Incident, Vehicle, Facility, Hazard } from '../types'
import { useSocket } from '../contexts/SocketContext'
import { toast } from 'react-hot-toast'
import {
  MapPin,
  Layers,
  AlertTriangle,
  Truck,
  Hospital,
  ShieldAlert,
  RefreshCw,
  Maximize2,
} from 'lucide-react'

export const LiveMapPage: React.FC = () => {
  const { socket } = useSocket()

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [hazards, setHazards] = useState<Hazard[]>([])
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  // Layer Visibility Toggles
  const [showIncidents, setShowIncidents] = useState<boolean>(true)
  const [showVehicles, setShowVehicles] = useState<boolean>(true)
  const [showFacilities, setShowFacilities] = useState<boolean>(true)
  const [showHazards, setShowHazards] = useState<boolean>(true)

  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchMapData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [incRes, vehRes, facRes, hazRes] = await Promise.all([
        api.get('/incidents?limit=50'),
        api.get('/vehicles'),
        api.get('/facilities'),
        api.get('/hazards'),
      ])

      if (incRes.data.success) setIncidents(incRes.data.data.incidents || [])
      if (vehRes.data.success) setVehicles(vehRes.data.data.vehicles || [])
      if (facRes.data.success) setFacilities(facRes.data.data.facilities || [])
      if (hazRes.data.success) setHazards(hazRes.data.data.hazards || [])
    } catch (err: any) {
      toast.error('Failed to load operational map entities')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMapData()
  }, [fetchMapData])

  // Live Socket Sync
  useEffect(() => {
    if (!socket) return

    const handleIncidentUpdate = () => fetchMapData()
    const handleLocationUpdate = (data: { vehicleId: string; coordinates: [number, number] }) => {
      setVehicles((prev) =>
        prev.map((v) =>
          v._id === data.vehicleId
            ? { ...v, currentLocation: { type: 'Point', coordinates: data.coordinates } }
            : v
        )
      )
    }

    socket.on('incident:created', handleIncidentUpdate)
    socket.on('incident:updated', handleIncidentUpdate)
    socket.on('vehicle:location:update', handleLocationUpdate)

    return () => {
      socket.off('incident:created', handleIncidentUpdate)
      socket.off('incident:updated', handleIncidentUpdate)
      socket.off('vehicle:location:update', handleLocationUpdate)
    }
  }, [socket, fetchMapData])

  return (
    <div className="space-y-4">
      {/* Tactical Top Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" />
            Tactical Live Operations Map
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Real-time geospatial situational intelligence across the greater metropolitan area.
          </p>
        </div>

        {/* Tactical Layer Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowIncidents(!showIncidents)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
              showIncidents
                ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            <span>🚨</span>
            Incidents ({incidents.length})
          </button>

          <button
            onClick={() => setShowVehicles(!showVehicles)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
              showVehicles
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            <span>🚑</span>
            Fleet Units ({vehicles.length})
          </button>

          <button
            onClick={() => setShowFacilities(!showFacilities)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
              showFacilities
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            <span>🏥</span>
            Facilities ({facilities.length})
          </button>

          <button
            onClick={() => setShowHazards(!showHazards)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
              showHazards
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            <span>⚠️</span>
            Hazards ({hazards.length})
          </button>

          <button
            onClick={() => fetchMapData()}
            title="Refresh tactical map"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition ml-1"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Map Viewport */}
      <div className="h-[calc(100vh-210px)] min-h-[520px] rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
        <EmergencyMap
          center={[17.4050, 78.4750]}
          zoom={13}
          incidents={showIncidents ? incidents : []}
          vehicles={showVehicles ? vehicles : []}
          facilities={showFacilities ? facilities : []}
          hazards={showHazards ? hazards : []}
          selectedIncident={selectedIncident}
          onSelectIncident={(inc) => setSelectedIncident(inc)}
        />
      </div>
    </div>
  )
}

export default LiveMapPage
