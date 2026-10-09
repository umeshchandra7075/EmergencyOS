import React, { useState } from 'react'
import api from '../services/api'
import EmergencyMap from '../components/Map/EmergencyMap'
import { IncidentRoute } from '../types'
import { toast } from 'react-hot-toast'
import {
  Compass,
  MapPin,
  Navigation,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Truck,
} from 'lucide-react'

// Hyderabad Preset Hotspots
const PRESET_LOCATIONS = [
  { name: 'Charminar (Old City)', coords: [78.4747, 17.3616] as [number, number] },
  { name: 'Hussain Sagar / Tank Bund', coords: [78.4744, 17.4239] as [number, number] },
  { name: 'Gandhi General Hospital', coords: [78.5034, 17.4243] as [number, number] },
  { name: 'Osmania General Hospital', coords: [78.4735, 17.3753] as [number, number] },
  { name: 'Begumpet Airport Junction', coords: [78.4720, 17.4410] as [number, number] },
  { name: 'Gachibowli IT Corridor', coords: [78.3725, 17.4326] as [number, number] },
  { name: 'Banjara Hills Road No 12', coords: [78.4344, 17.4156] as [number, number] },
  { name: 'Secunderabad Railway Station', coords: [78.5015, 17.4342] as [number, number] },
]

export const PlannerPage: React.FC = () => {
  const [sourceIndex, setSourceIndex] = useState<number>(0)
  const [destIndex, setDestIndex] = useState<number>(2)
  const [vehicleType, setVehicleType] = useState<string>('ambulance')

  const [customSourceLng, setCustomSourceLng] = useState<string>('')
  const [customSourceLat, setCustomSourceLat] = useState<string>('')
  const [customDestLng, setCustomDestLng] = useState<string>('')
  const [customDestLat, setCustomDestLat] = useState<string>('')
  const [useCustomCoords, setUseCustomCoords] = useState<boolean>(false)

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [calculatedRoute, setCalculatedRoute] = useState<IncidentRoute | null>(null)
  const [selectedAlternativeIndex, setSelectedAlternativeIndex] = useState<number>(-1)

  const getSourceCoords = (): [number, number] => {
    if (useCustomCoords && customSourceLng && customSourceLat) {
      return [parseFloat(customSourceLng), parseFloat(customSourceLat)]
    }
    return PRESET_LOCATIONS[sourceIndex].coords
  }

  const getDestCoords = (): [number, number] => {
    if (useCustomCoords && customDestLng && customDestLat) {
      return [parseFloat(customDestLng), parseFloat(customDestLat)]
    }
    return PRESET_LOCATIONS[destIndex].coords
  }

  const handleCalculateRoute = async () => {
    const source = getSourceCoords()
    const dest = getDestCoords()

    // Bounds validation
    if (
      source[0] < -180 ||
      source[0] > 180 ||
      source[1] < -90 ||
      source[1] > 90 ||
      dest[0] < -180 ||
      dest[0] > 180 ||
      dest[1] < -90 ||
      dest[1] > 90
    ) {
      toast.error('Coordinates out of bounds: Longitude [-180, 180], Latitude [-90, 90]')
      return
    }

    setIsLoading(true)
    setSelectedAlternativeIndex(-1)

    try {
      const res = await api.post('/routes/calculate', {
        source,
        destination: dest,
        alternatives: 2,
      })

      if (res.data.success) {
        setCalculatedRoute(res.data.data)
        if (res.data.data.isFallback) {
          toast('Notice: Displaying diagnostic straight line. Live road routing offline.', {
            icon: '⚠️',
          })
        } else {
          toast.success('Optimal emergency road route computed!')
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to compute emergency route')
    } finally {
      setIsLoading(false)
    }
  }

  const activeDisplayRoute: IncidentRoute | null =
    selectedAlternativeIndex >= 0 && calculatedRoute?.alternatives?.[selectedAlternativeIndex]
      ? {
          ...calculatedRoute,
          distanceMeters: calculatedRoute.alternatives[selectedAlternativeIndex].distanceMeters,
          durationSeconds: calculatedRoute.alternatives[selectedAlternativeIndex].durationSeconds,
          geometry: calculatedRoute.alternatives[selectedAlternativeIndex].geometry,
        }
      : calculatedRoute

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-red-500" />
            Emergency Route Intelligence Planner
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Simulate, compare, and verify road navigation vectors between emergency locations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseCustomCoords(!useCustomCoords)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"
          >
            {useCustomCoords ? 'Use Preset Landmarks' : 'Manual GPS Coordinates'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-4 space-y-5">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Navigation className="w-4 h-4 text-red-500" />
              Route Parameters
            </h2>

            {!useCustomCoords ? (
              <>
                {/* Source Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Origin / Incident Location
                  </label>
                  <select
                    value={sourceIndex}
                    onChange={(e) => setSourceIndex(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500"
                  >
                    {PRESET_LOCATIONS.map((loc, idx) => (
                      <option key={idx} value={idx}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Emergency Destination / Hospital
                  </label>
                  <select
                    value={destIndex}
                    onChange={(e) => setDestIndex(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500"
                  >
                    {PRESET_LOCATIONS.map((loc, idx) => (
                      <option key={idx} value={idx}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                {/* Custom Coordinates Inputs */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Origin [Longitude, Latitude]
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Lng (e.g. 78.4747)"
                      value={customSourceLng}
                      onChange={(e) => setCustomSourceLng(e.target.value)}
                      className="text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Lat (e.g. 17.3616)"
                      value={customSourceLat}
                      onChange={(e) => setCustomSourceLat(e.target.value)}
                      className="text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Destination [Longitude, Latitude]
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Lng (e.g. 78.5034)"
                      value={customDestLng}
                      onChange={(e) => setCustomDestLng(e.target.value)}
                      className="text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Lat (e.g. 17.4243)"
                      value={customDestLat}
                      onChange={(e) => setCustomDestLat(e.target.value)}
                      className="text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Vehicle Profile */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-500" />
                Dispatch Unit Profile
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="ambulance">🚑 Advanced Life Support Ambulance</option>
                <option value="fire_engine">🚒 Fire Engine & Rescue Unit</option>
                <option value="patrol_car">🚓 Rapid Emergency Patrol</option>
                <option value="hazmat_vehicle">☣️ Hazmat Neutralization Vehicle</option>
              </select>
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculateRoute}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Calculating OSRM Vectors...
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" />
                  Calculate Emergency Route
                </>
              )}
            </button>
          </div>

          {/* Route Summary Card */}
          {calculatedRoute && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                <span>Route Telemetry</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    calculatedRoute.isFallback
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                  }`}
                >
                  {calculatedRoute.provider || 'OSRM'}
                </span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Distance</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {(activeDisplayRoute!.distanceMeters / 1000).toFixed(1)} km
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Est. Transit Time</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {Math.round(activeDisplayRoute!.durationSeconds / 60)} mins
                  </div>
                </div>
              </div>

              {/* Alternatives selector */}
              {calculatedRoute.alternatives && calculatedRoute.alternatives.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Alternative Road Routes:
                  </div>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => setSelectedAlternativeIndex(-1)}
                      className={`w-full text-left text-xs p-2 rounded-lg border transition flex items-center justify-between ${
                        selectedAlternativeIndex === -1
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 font-bold text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>Primary Route</span>
                      <span>
                        {(calculatedRoute.distanceMeters / 1000).toFixed(1)} km ·{' '}
                        {Math.round(calculatedRoute.durationSeconds / 60)} min
                      </span>
                    </button>

                    {calculatedRoute.alternatives.map((alt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedAlternativeIndex(idx)}
                        className={`w-full text-left text-xs p-2 rounded-lg border transition flex items-center justify-between ${
                          selectedAlternativeIndex === idx
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 font-bold text-blue-600 dark:text-blue-400'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>Alternative #{idx + 1}</span>
                        <span>
                          {(alt.distanceMeters / 1000).toFixed(1)} km ·{' '}
                          {Math.round(alt.durationSeconds / 60)} min
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map Column */}
        <div className="lg:col-span-8 h-[580px] rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800">
          <EmergencyMap
            center={[17.4100, 78.4750]}
            zoom={13}
            previewRoute={activeDisplayRoute}
            onRetryRoute={handleCalculateRoute}
          />
        </div>
      </div>
    </div>
  )
}

export default PlannerPage
