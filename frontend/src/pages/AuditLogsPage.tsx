import React, { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import { toast } from 'react-hot-toast'
import {
  FileText,
  Search,
  Filter,
  ShieldAlert,
  Clock,
  User,
  Activity,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'

interface AuditLogItem {
  _id: string
  action: string
  entityType?: string
  entityId?: string
  actorId?: {
    _id: string
    name: string
    email: string
    role: string
  }
  actorEmail?: string
  actorRole?: string
  details?: any
  ipAddress?: string
  timestamp: string
}

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [actionFilter, setActionFilter] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: any = { limit: 100 }
      if (actionFilter) params.action = actionFilter

      const res = await api.get('/analytics/audits', { params })
      if (res.data.success) {
        setLogs(res.data.data.logs || [])
      }
    } catch (err: any) {
      toast.error('Failed to load audit trails')
    } finally {
      setIsLoading(false)
    }
  }, [actionFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const filteredLogs = logs.filter((log) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      log.action.toLowerCase().includes(term) ||
      (log.actorEmail && log.actorEmail.toLowerCase().includes(term)) ||
      (log.entityType && log.entityType.toLowerCase().includes(term))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-500" />
            System Audit Trails & Security Log
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Immutable system activity log recording operational transitions, logins, assignments, and security events.
          </p>
        </div>

        <button
          onClick={() => fetchLogs()}
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
            placeholder="Search audit actions, user emails, or entity types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="">All Security & Audit Actions</option>
          <option value="USER_REGISTERED">USER_REGISTERED</option>
          <option value="USER_LOGGED_IN">USER_LOGGED_IN</option>
          <option value="USER_LOGGED_OUT">USER_LOGGED_OUT</option>
          <option value="INCIDENT_REPORTED">INCIDENT_REPORTED</option>
          <option value="INCIDENT_ACKNOWLEDGED">INCIDENT_ACKNOWLEDGED</option>
          <option value="INCIDENT_ASSIGNED">INCIDENT_ASSIGNED</option>
          <option value="INCIDENT_ACCEPTED">INCIDENT_ACCEPTED</option>
          <option value="INCIDENT_REJECTED">INCIDENT_REJECTED</option>
          <option value="SECURITY_ALERT_REFRESH_TOKEN_REPLAY">SECURITY_ALERT_REFRESH_TOKEN_REPLAY</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-500" />
                    Loading audit records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No matching audit log records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isSecurityAlert = log.action.includes('SECURITY_ALERT')
                  return (
                    <tr
                      key={log._id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                        isSecurityAlert ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                            isSecurityAlert
                              ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {log.actorEmail || log.actorId?.email || 'System'}
                      </td>

                      <td className="py-3 px-4 text-slate-500 uppercase text-[10px] font-bold">
                        {log.actorRole || log.actorId?.role || '-'}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {log.entityType ? `${log.entityType}` : '-'}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {log.ipAddress || '127.0.0.1'}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" />
                Audit Record Details
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">Action:</span>
                <span className="col-span-2 font-mono font-bold text-purple-600 dark:text-purple-400">
                  {selectedLog.action}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">Actor:</span>
                <span className="col-span-2 text-slate-800 dark:text-slate-200">
                  {selectedLog.actorEmail || 'System'} ({selectedLog.actorRole || 'System'})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">IP Address:</span>
                <span className="col-span-2 font-mono text-slate-700 dark:text-slate-300">
                  {selectedLog.ipAddress || '127.0.0.1'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">Timestamp:</span>
                <span className="col-span-2 text-slate-700 dark:text-slate-300">
                  {new Date(selectedLog.timestamp).toISOString()}
                </span>
              </div>
            </div>

            {selectedLog.details && (
              <div className="space-y-1 pt-2">
                <span className="text-xs font-semibold text-slate-500">Payload Details:</span>
                <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
                  {typeof selectedLog.details === 'string'
                    ? selectedLog.details
                    : JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditLogsPage
