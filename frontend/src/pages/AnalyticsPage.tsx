import React, { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useTheme } from '../contexts/ThemeContext'
import { toast } from 'react-hot-toast'
import {
  BarChart3,
  TrendingUp,
  Activity,
  Hospital,
  Truck,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
} from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  Reported: '#ef4444',
  Acknowledged: '#f59e0b',
  Assigned: '#3b82f6',
  Accepted: '#6366f1',
  'En Route': '#a855f7',
  'On Scene': '#eab308',
  Resolved: '#10b981',
  Cancelled: '#64748b',
}

export const AnalyticsPage: React.FC = () => {
  const { resolvedTheme } = useTheme()
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/analytics/stats')
      if (res.data.success) {
        setStats(res.data.data)
      }
    } catch (err: any) {
      toast.error('Failed to load operational analytics')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const textColor = resolvedTheme === 'dark' ? '#94a3b8' : '#475569'
  const tooltipBg = resolvedTheme === 'dark' ? '#0f172a' : '#ffffff'
  const tooltipBorder = resolvedTheme === 'dark' ? '#1e293b' : '#e2e8f0'

  // Format data for Status Chart
  const statusChartData = stats?.incidents?.byStatus
    ? Object.entries(stats.incidents.byStatus).map(([status, count]) => ({
        status,
        count: Number(count),
        fill: STATUS_COLORS[status] || '#3b82f6',
      }))
    : []

  // Format data for Hospital Capacity Chart
  const hospitalData = stats?.hospitalCapacity
    ? [
        {
          category: 'General Beds',
          Total: stats.hospitalCapacity.totalBeds,
          Available: stats.hospitalCapacity.availableBeds,
        },
        {
          category: 'ICU Critical',
          Total: stats.hospitalCapacity.icuBeds,
          Available: stats.hospitalCapacity.icuAvailable,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-500" />
            Operational Analytics & Reports
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Data-driven intelligence on incident volumes, response capacity, and metropolitan healthcare load.
          </p>
        </div>

        <button
          onClick={() => fetchStats()}
          className="p-2 self-start sm:self-auto rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Emergencies</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats?.incidents?.total || 0}
          </div>
          <div className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
            <span>●</span> {stats?.incidents?.active || 0} active operations
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Resolved Incidents</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats?.incidents?.resolved || 0}
          </div>
          <div className="text-[11px] text-emerald-500 font-semibold">
            {stats?.incidents?.total
              ? `${Math.round(((stats.incidents.resolved || 0) / stats.incidents.total) * 100)}% resolution rate`
              : '100% resolution rate'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Fleet Deployment</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats?.vehicles?.deployed || 0} / {stats?.vehicles?.total || 0}
          </div>
          <div className="text-[11px] text-blue-500 font-semibold">
            {stats?.vehicles?.available || 0} available for dispatch
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Hospital Occupancy</span>
            <Hospital className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats?.hospitalCapacity?.occupancyPercentage || 0}%
          </div>
          <div className="text-[11px] text-purple-500 font-semibold">
            {stats?.hospitalCapacity?.availableBeds || 0} beds available
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents by Lifecycle Status */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-500" />
            Incidents by Lifecycle Status
          </h3>

          <div className="h-64">
            {statusChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No incident lifecycle data recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="status"
                    stroke={textColor}
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke={textColor} fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Hospital Bed Availability vs Total */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Hospital className="w-4 h-4 text-emerald-500" />
            Regional Hospital Capacity
          </h3>

          <div className="h-64">
            {hospitalData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No hospital capacity data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hospitalData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="category" stroke={textColor} fontSize={11} tickLine={false} />
                  <YAxis stroke={textColor} fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="Total" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
