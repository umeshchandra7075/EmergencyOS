import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { Facility } from '../types'
import { Hospital, Phone, MapPin, Search } from 'lucide-react'
import toast from 'react-hot-toast'

export const FacilitiesPage: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchFacilities = async () => {
    try {
      const res = await api.get('/facilities')
      if (res.data.success) {
        setFacilities(res.data.data.facilities || [])
      }
    } catch (err) {
      toast.error('Failed to load emergency facilities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFacilities()
  }, [])

  const filtered = facilities.filter((f) => {
    const matchesType = typeFilter === 'all' || f.type === typeFilter
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.address && f.address.toLowerCase().includes(search.toLowerCase())) ||
      (f.specialty && f.specialty.toLowerCase().includes(search.toLowerCase()))
    return matchesType && matchesSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Hospital className="w-6 h-6 text-emerald-400" />
            Emergency Healthcare & Facility Network
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time verified hospital bed capacities, trauma centers, and emergency hubs
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          {['all', 'hospital', 'fire_station', 'police_station'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold capitalize transition border ${
                typeFilter === t
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by facility name, address, or medical specialty..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Facility Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading facilities catalog...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((f) => (
            <div
              key={f._id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-white">{f.name}</h3>
                    <div className="text-xs font-semibold text-emerald-400 capitalize mt-0.5">
                      {f.type.replace('_', ' ')} {f.specialty ? `• ${f.specialty}` : ''}
                    </div>
                  </div>
                  <span className="p-2 rounded-xl bg-slate-800 text-slate-300 text-lg">
                    {f.type === 'hospital' ? '🏥' : f.type === 'fire_station' ? '🚒' : '🚓'}
                  </span>
                </div>

                <div className="text-xs text-slate-400 mt-3 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>{f.address || 'Hyderabad Region'}</span>
                </div>

                {f.type === 'hospital' && f.bedCapacity && (
                  <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">General Beds</span>
                      <span className="font-bold text-white">
                        {f.bedCapacity.available} / {f.bedCapacity.total} available
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{
                          width: `${(f.bedCapacity.available / Math.max(1, f.bedCapacity.total)) * 100}%`,
                        }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-xs pt-1 border-t border-slate-900">
                      <span className="text-slate-400">ICU Capacity</span>
                      <span className="font-bold text-purple-400">
                        {f.bedCapacity.icuAvailable} / {f.bedCapacity.icuTotal} units
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {f.contactPhone && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Emergency Desk</span>
                  <a
                    href={`tel:${f.contactPhone}`}
                    className="font-bold text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {f.contactPhone}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FacilitiesPage
