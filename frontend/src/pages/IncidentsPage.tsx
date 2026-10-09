import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Incident, IncidentStatus, UserRole } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { toast } from 'react-hot-toast'
import {
  AlertTriangle,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'

export const IncidentsPage: React.FC = () => {
  const { role } = useAuth()
  const { socket } = useSocket()

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [total, setTotal] = useState<number>(0)
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [limit] = useState<number>(10)

  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchIncidents = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: any = { page, limit }
      if (statusFilter) params.status = statusFilter
      if (severityFilter) params.severity = severityFilter
      if (search) params.search = search

      const res = await api.get('/incidents', { params })
      if (res.data.success) {
        setIncidents(res.data.data.incidents || [])
        setTotal(res.data.data.pagination.total || 0)
        setTotalPages(res.data.data.pagination.totalPages || 1)
      }
    } catch (err: any) {
      toast.error('Failed to load incidents list')
    } finally {
      setIsLoading(false)
    }
  }, [page, limit, statusFilter, severityFilter, search])

  useEffect(() => {
    fetchIncidents()
  }, [fetchIncidents])

  // Listen to live socket updates
  useEffect(() => {
    if (!socket) return

    const handleIncidentUpdate = () => {
      fetchIncidents()
    }

    socket.on('incident:created', handleIncidentUpdate)
    socket.on('incident:updated', handleIncidentUpdate)
    socket.on('incident:assigned', handleIncidentUpdate)

    return () => {
      socket.off('incident:created', handleIncidentUpdate)
      socket.off('incident:updated', handleIncidentUpdate)
      socket.off('incident:assigned', handleIncidentUpdate)
    }
  }, [socket, fetchIncidents])

  const handleAcknowledge = async (id: string) => {
    try {
      const res = await api.post(`/incidents/${id}/acknowledge`)
      if (res.data.success) {
        toast.success('Incident acknowledged')
        fetchIncidents()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not acknowledge incident')
    }
  }

  const getStatusBadge = (status: IncidentStatus) => {
    const colors: Record<string, string> = {
      [IncidentStatus.REPORTED]: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      [IncidentStatus.ACKNOWLEDGED]: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      [IncidentStatus.ASSIGNED]: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      [IncidentStatus.ACCEPTED]: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      [IncidentStatus.EN_ROUTE]: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      [IncidentStatus.ON_SCENE]: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
      [IncidentStatus.RESOLVED]: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      [IncidentStatus.CANCELLED]: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    }

    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
          colors[status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'
        }`}
      >
        {status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Emergency Incident Management
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Real-time emergency incident triage, dispatch assignment, and status tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchIncidents()}
            title="Refresh incidents"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {role === UserRole.CITIZEN && (
            <Link
              to="/sos"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow transition"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Report SOS Emergency
            </Link>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by incident number, description, or address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">All Statuses</option>
            {Object.values(IncidentStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value)
              setPage(1)
            }}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            <option value="">All Severities</option>
            <option value="5">Severity 5 (Catastrophic)</option>
            <option value="4">Severity 4 (Critical)</option>
            <option value="3">Severity 3 (Serious)</option>
            <option value="2">Severity 2 (Moderate)</option>
            <option value="1">Severity 1 (Minor)</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Incident</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Address / Location</th>
                <th className="py-3 px-4">Reported By</th>
                <th className="py-3 px-4">Assigned Unit</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-red-500" />
                    Loading incidents records...
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No matching emergency incidents found.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr
                    key={inc._id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <span className="text-red-500">🚨</span>
                        {inc.incidentNumber}
                      </div>
                      <div className="text-[11px] font-normal text-slate-500 mt-0.5 line-clamp-1 max-w-xs">
                        {inc.description}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-black text-[10px] ${
                          inc.severity >= 4
                            ? 'bg-red-500/20 text-red-500'
                            : inc.severity === 3
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-blue-500/20 text-blue-500'
                        }`}
                      >
                        Level {inc.severity} / 5
                      </span>
                    </td>

                    <td className="py-3.5 px-4">{getStatusBadge(inc.status)}</td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {inc.sourceAddress ||
                        `${inc.source?.coordinates[1]?.toFixed(4)}, ${inc.source?.coordinates[0]?.toFixed(4)}`}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {inc.citizen?.name || 'Citizen'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {inc.assignedVehicle ? (
                        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                          🚑 {(inc.assignedVehicle as any)?.plateNumber || 'Unit'}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      {[UserRole.DISPATCHER, UserRole.ADMIN].includes(role as UserRole) &&
                        inc.status === IncidentStatus.REPORTED && (
                          <button
                            onClick={() => handleAcknowledge(inc._id)}
                            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] transition"
                          >
                            Acknowledge
                          </button>
                        )}

                      <Link
                        to={`/incident/${inc._id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-[11px] transition"
                      >
                        <Eye className="w-3 h-3" />
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="py-3 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong>{incidents.length}</strong> of <strong>{total}</strong> incidents
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IncidentsPage
