import React, { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import { User, UserRole } from '../types'
import { toast } from 'react-hot-toast'
import {
  Users,
  Search,
  Filter,
  Phone,
  Mail,
  Truck,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'

export const RespondersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchResponders = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/users')
      if (res.data.success) {
        // Filter users to emergency field personnel
        const allUsers: User[] = res.data.data.users || []
        const personnel = allUsers.filter((u) =>
          [UserRole.RESPONDER, UserRole.DRIVER, UserRole.HOSPITAL_STAFF, UserRole.DISPATCHER].includes(
            u.role as UserRole
          )
        )
        setUsers(personnel)
      }
    } catch (err: any) {
      toast.error('Failed to load responders directory')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchResponders()
  }, [fetchResponders])

  const filteredUsers = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false
    if (!search) return true
    const term = search.toLowerCase()
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.phone && u.phone.includes(term))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-500" />
            Emergency Personnel & Responder Directory
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Certified emergency personnel, field drivers, dispatchers, and hospital coordination staff.
          </p>
        </div>

        <button
          onClick={() => fetchResponders()}
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
            placeholder="Search by responder name, email, or telephone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="">All Operational Roles</option>
          <option value={UserRole.RESPONDER}>Field Responders</option>
          <option value={UserRole.DRIVER}>Emergency Vehicle Drivers</option>
          <option value={UserRole.DISPATCHER}>Command Dispatchers</option>
          <option value={UserRole.HOSPITAL_STAFF}>Hospital Triage Staff</option>
        </select>
      </div>

      {/* Personnel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
            Loading responder personnel directory...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            No matching emergency personnel located.
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div
              key={u.id || (u as any)._id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{u.name}</h3>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {u.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Active Duty
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{u.email}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{u.phone || 'Direct dispatch line'}</span>
                </div>

                {u.vehicle && (
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    <span>Unit: {(u.vehicle as any).plateNumber || 'Assigned'}</span>
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

export default RespondersPage
