import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { Facility } from '../types'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Hospital, CheckCircle, RefreshCw } from 'lucide-react'

export const HospitalPage: React.FC = () => {
  const { user } = useAuth()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('')
  const [availableBeds, setAvailableBeds] = useState<number>(0)
  const [totalBeds, setTotalBeds] = useState<number>(0)
  const [icuAvailable, setIcuAvailable] = useState<number>(0)
  const [icuTotal, setIcuTotal] = useState<number>(0)
  const [oxygenAvailable, setOxygenAvailable] = useState<number>(0)
  const [currentPatients, setCurrentPatients] = useState<number>(0)
  const [saving, setSaving] = useState(false)

  const loadHospitals = async () => {
    try {
      const res = await api.get('/facilities?type=hospital')
      if (res.data.success && res.data.data.facilities) {
        const hosps = res.data.data.facilities
        setFacilities(hosps)
        if (hosps.length > 0) {
          const target = user?.facility ? hosps.find((h: any) => h._id === user.facility) || hosps[0] : hosps[0]
          selectHospital(target)
        }
      }
    } catch (err) {
      toast.error('Could not load hospitals.')
    }
  }

  const selectHospital = (f: Facility) => {
    setSelectedFacilityId(f._id)
    setAvailableBeds(f.bedCapacity?.available || 0)
    setTotalBeds(f.bedCapacity?.total || 0)
    setIcuAvailable(f.bedCapacity?.icuAvailable || 0)
    setIcuTotal(f.bedCapacity?.icuTotal || 0)
    setOxygenAvailable(f.bedCapacity?.oxygenAvailable || 0)
    setCurrentPatients(f.currentPatientCount || 0)
  }

  useEffect(() => {
    loadHospitals()
  }, [user])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFacilityId) return

    setSaving(true)
    try {
      const res = await api.patch(`/facilities/${selectedFacilityId}/capacity`, {
        bedCapacity: {
          total: totalBeds,
          available: availableBeds,
          icuTotal,
          icuAvailable,
          oxygenAvailable,
        },
        currentPatientCount: currentPatients,
      })

      if (res.data.success) {
        toast.success('Hospital capacity updated and broadcasted to dispatch network!')
        loadHospitals()
      }
    } catch (err) {
      toast.error('Failed to update facility metrics.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Hospital className="w-6 h-6 text-purple-400" />
            Hospital Resource & Capacity Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time synchronization of hospital triage availability, ICU units, and oxygen cylinders
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Select Medical Facility
          </label>
          <select
            value={selectedFacilityId}
            onChange={(e) => {
              const target = facilities.find((f) => f._id === e.target.value)
              if (target) selectHospital(target)
            }}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {facilities.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name} ({f.specialty || 'General'})
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-extrabold text-blue-400 uppercase">General Bed Capacity</h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Available Beds</label>
                <input
                  type="number"
                  min="0"
                  value={availableBeds}
                  onChange={(e) => setAvailableBeds(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Total Bed Count</label>
                <input
                  type="number"
                  min="0"
                  value={totalBeds}
                  onChange={(e) => setTotalBeds(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                />
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-extrabold text-purple-400 uppercase">ICU Emergency Beds</h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Available ICU Units</label>
                <input
                  type="number"
                  min="0"
                  value={icuAvailable}
                  onChange={(e) => setIcuAvailable(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Total ICU Beds</label>
                <input
                  type="number"
                  min="0"
                  value={icuTotal}
                  onChange={(e) => setIcuTotal(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                />
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-extrabold text-emerald-400 uppercase">Oxygen & Critical Supplies</h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Available Oxygen Cylinders</label>
                <input
                  type="number"
                  min="0"
                  value={oxygenAvailable}
                  onChange={(e) => setOxygenAvailable(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                />
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-extrabold text-amber-400 uppercase">Patient Admissions</h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Current Active Inpatients</label>
                <input
                  type="number"
                  min="0"
                  value={currentPatients}
                  onChange={(e) => setCurrentPatients(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle className="w-5 h-5" />
            {saving ? 'Publishing Updates...' : 'Publish Hospital Capacity Update'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default HospitalPage
