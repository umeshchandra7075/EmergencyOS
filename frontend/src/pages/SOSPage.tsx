import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { AlertCircle, MapPin, ShieldAlert, Crosshair, Phone } from 'lucide-react'

const EMERGENCY_TYPES = [
  { id: 1, label: 'Medical Emergency', emoji: '🚑', desc: 'Heart attack, accident, severe injury, unconsciousness', color: 'border-red-500 bg-red-950/30' },
  { id: 2, label: 'Fire Outbreak', emoji: '🚒', desc: 'Structure fire, gas leak, hazardous smoke', color: 'border-orange-500 bg-orange-950/30' },
  { id: 3, label: 'Police / Crime', emoji: '🚓', desc: 'Active burglary, violence, robbery, danger to life', color: 'border-purple-500 bg-purple-950/30' },
  { id: 4, label: 'Search & Rescue', emoji: '🚁', desc: 'Collapsed structure, trapped individuals, water rescue', color: 'border-amber-500 bg-amber-950/30' },
  { id: 5, label: 'Chemical / Hazmat', emoji: '☣️', desc: 'Toxic chemical spill, biological contaminant', color: 'border-yellow-500 bg-yellow-950/30' },
]

export const SOSPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [emergencyType, setEmergencyType] = useState<number>(1)
  const [severity, setSeverity] = useState<number>(4)
  const [description, setDescription] = useState('')
  const [contactPhone, setContactPhone] = useState(user?.phone || '')
  const [sourceAddress, setSourceAddress] = useState('')
  const [latitude, setLatitude] = useState<number>(17.4050) // Default Hyderabad
  const [longitude, setLongitude] = useState<number>(78.4750)
  const [acquiringGps, setAcquiringGps] = useState(false)
  const [gpsAcquired, setGpsAcquired] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Try auto-acquiring GPS on mount
  useEffect(() => {
    acquireGPS()
  }, [])

  const acquireGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    setAcquiringGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(parseFloat(pos.coords.latitude.toFixed(5)))
        setLongitude(parseFloat(pos.coords.longitude.toFixed(5)))
        setAcquiringGps(false)
        setGpsAcquired(true)
        toast.success('Accurate GPS coordinates acquired!')
      },
      (err) => {
        setAcquiringGps(false)
        setGpsAcquired(false)
        toast('Using default location (Hyderabad Central). You can adjust manually.', {
          icon: '📍',
        })
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await api.post('/incidents', {
        emergencyType,
        severity,
        description: description || 'Emergency distress call reported',
        source: [longitude, latitude], // GeoJSON [lng, lat]
        sourceAddress: sourceAddress || 'Hyderabad Emergency Zone',
        contactPhone,
      })

      if (res.data.success && res.data.data) {
        toast.success(`Emergency incident ${res.data.data.incidentNumber} dispatched!`, {
          duration: 5000,
        })
        navigate(`/incident/${res.data.data._id}`)
      } else {
        toast.error('Failed to report incident.')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error communicating with dispatch server.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
          <div className="p-3 bg-red-600/20 border border-red-500/40 text-red-500 rounded-xl radar-ping">
            🚨
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Broadcast Emergency SOS</h1>
            <p className="text-sm text-slate-400">
              Immediate triage and automated responder dispatch
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Emergency Type Selector */}
          <div>
            <label className="block text-sm font-bold text-slate-200 mb-3">
              1. Select Emergency Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EMERGENCY_TYPES.map((type) => (
                <div
                  key={type.id}
                  onClick={() => setEmergencyType(type.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                    emergencyType === type.id
                      ? `${type.color} ring-2 ring-red-500 shadow-lg`
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <span className="text-2xl">{type.emoji}</span>
                  <div>
                    <div className="font-bold text-sm text-white">{type.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{type.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Severity Rating */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-slate-200">
                2. Urgency & Severity Level: <span className="text-red-400 font-extrabold">{severity} / 5</span>
              </label>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/60">
                {severity === 5 ? 'Catastrophic / Multiple Casualties' : severity === 4 ? 'Critical / Life Threatening' : severity === 3 ? 'Serious' : 'Moderate'}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={severity}
              onChange={(e) => setSeverity(parseInt(e.target.value, 10))}
              className="w-full accent-red-600 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Geolocation Section */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <MapPin className="w-4 h-4 text-red-500" />
                3. Emergency Location Coordinates
              </div>
              <button
                type="button"
                onClick={acquireGPS}
                disabled={acquiringGps}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
              >
                <Crosshair className={`w-3.5 h-3.5 ${acquiringGps ? 'animate-spin' : ''}`} />
                {acquiringGps ? 'Acquiring GPS...' : gpsAcquired ? 'GPS Locked' : 'Locate Device GPS'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div>
                <label className="text-slate-400 block mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-xs block mb-1">Address / Landmark</label>
              <input
                type="text"
                value={sourceAddress}
                onChange={(e) => setSourceAddress(e.target.value)}
                placeholder="e.g. Near Lakdikapul Metro Station, Saifabad"
                className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500"
              />
            </div>
          </div>

          {/* Description & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Distress Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe current condition, symptoms, or fire spread..."
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Callback Phone Number
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91-9848011223"
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 mb-3"
              />
              <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/50 text-[11px] text-red-300">
                ⚠️ Live GPS stream and nearest available hospital routing will be activated upon submission.
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-base font-extrabold shadow-xl shadow-red-900/50 flex items-center justify-center gap-3 transition transform active:scale-95 disabled:opacity-50"
          >
            <ShieldAlert className="w-6 h-6" />
            {submitting ? 'TRANSMITTING SOS DISPATCH...' : 'TRIGGER EMERGENCY SOS DISPATCH'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default SOSPage
