import React, { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import { Vehicle, VehicleStatus, VehicleType } from '../types'
import { useSocket } from '../contexts/SocketContext'
import { toast } from 'react-hot-toast'
import {
  Truck,
  Search,
  Filter,
  Navigation,
  Activity,
  CheckCircle,
  Clock,
  Compass,
  RefreshCw,
} from 'lucide-react'

export const VehiclesPage: React.FC = () => {
  const { socket } = useSocket()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: any = {}
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter

      const res = await api.get('/vehicles', { params })
      if (res.data.success) {
        setVehicles(res.data.data.vehicles || [])
      }
    } catch (err: any) {
      toast.error('Failed to load fleet vehicles')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

  // Listen to live GPS location updates via socket
  useEffect(() => {
    if (!socket) return

    const handleLocationUpdate = (data: {
      vehicleId: string
      coordinates: [number, number]
      speed?: number
      heading?: number
    }) => {
      setVehicles((prev) =>
        prev.map((v) =>
          v._id === data.vehicleId
            ? {
                ...v,
                currentLocation: { type: 'Point', coordinates: data.coordinates },
                speed: data.speed ?? v.speed,
                heading: data.heading ?? v.heading,
              }
            : v
        )
      )
    }

    socket.on('vehicle:location:update', handleLocationUpdate)
    return () => {
      socket.off('vehicle:location:update', handleLocationUpdate)
    }
  }, [socket])

  const getStatusBadge = (status: string | VehicleStatus) => {
    const colors: Record<string, string> = {
      [VehicleStatus.AVAILABLE]: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      [VehicleStatus.ASSIGNED]: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      [VehicleStatus.EN_ROUTE]: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      [VehicleStatus.ON_SCENE]: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      [VehicleStatus.RETURNING]: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
      [VehicleStatus.MAINTENANCE]: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      [VehicleStatus.OUT_OF_SERVICE]: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    }

    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
          colors[status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'
        }`}
      >
        {status}
      </span>
    )
  }

  const filteredVehicles = vehicles.filter((v) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      v.plateNumber.toLowerCase().includes(term) ||
      v.type.toLowerCase().includes(term) ||
      (v.driver?.name && v.driver.name.toLowerCase().includes(term))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-500" />
            Emergency Fleet & Vehicle Management
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Real-time emergency unit availability, driver assignments, and GPS telemetry monitoring.
          </p>
        </div>

        <button
          onClick={() => fetchVehicles()}
          className="p-2 self-start sm:self-auto rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by license plate number, unit type, or driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">All Fleet Statuses</option>
            {(Object.values(VehicleStatus) as string[]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">All Vehicle Types</option>
            {(Object.values(VehicleType) as string[]).map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            Loading emergency response units...
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            No matching emergency vehicles located.
          </div>
        ) : (
          filteredVehicles.map((v) => (
            <div
              key={v._id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xl mr-2">
                    {v.type === 'ambulance'
                      ? '🚑'
                      : v.type === 'fire_engine'
                      ? '🚒'
                      : v.type === 'patrol_car'
                      ? '🚓'
                      : '🚜'}
                  </span>
                  <span className="font-mono font-bold text-base text-slate-900 dark:text-white">
                    {v.plateNumber}
                  </span>
                  <div className="text-xs text-slate-500 capitalize mt-0.5">
                    {v.type.replace('_', ' ')}
                  </div>
                </div>
                {getStatusBadge(v.status)}
              </div>

              {/* Vehicle telemetry */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Telemetry Speed</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {v.speed !== undefined ? `${v.speed} km/h` : '0 km/h'}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Heading</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {v.heading !== undefined ? `${v.heading}°` : '0°'}
                  </span>
                </div>
              </div>

              {/* Coordinates and driver */}
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    GPS: {v.currentLocation?.coordinates[1]?.toFixed(4)},{' '}
                    {v.currentLocation?.coordinates[0]?.toFixed(4)}
                  </span>
                </div>

                {v.driver && (
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                    <span>👤</span>
                    <span>Driver: {v.driver.name}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default VehiclesPage
