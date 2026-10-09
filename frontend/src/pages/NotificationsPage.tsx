import React, { useState, useEffect } from 'react'
import { useSocket } from '../contexts/SocketContext'
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Truck,
  Hospital,
  ShieldAlert,
  Info,
  Clock,
} from 'lucide-react'

interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'incident' | 'vehicle' | 'hospital' | 'security' | 'info'
  timestamp: Date
  read: boolean
}

export const NotificationsPage: React.FC = () => {
  const { socket } = useSocket()

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => [
    {
      id: '1',
      title: 'Active Dispatch Telemetry',
      message: 'Ambulance unit TS-09-EM-1001 dispatched with high priority sirens.',
      type: 'vehicle',
      timestamp: new Date(Date.now() - 1000 * 60 * 4),
      read: false,
    },
    {
      id: '2',
      title: 'Critical Medical Alert Reported',
      message: 'Incident INC-2026-0001 reported at Lakdikapul Junction.',
      type: 'incident',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      read: false,
    },
    {
      id: '3',
      title: 'Gandhi Hospital Capacity Notice',
      message: 'Trauma ICU occupancy at 76%. 14 beds available for emergency diversion.',
      type: 'hospital',
      timestamp: new Date(Date.now() - 1000 * 60 * 35),
      read: true,
    },
    {
      id: '4',
      title: 'Zero-Trust Session Rotation Verified',
      message: 'Cryptographic SHA-256 session rotation executed successfully.',
      type: 'security',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      read: true,
    },
  ])

  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  // Capture incoming socket events as notifications
  useEffect(() => {
    if (!socket) return

    const handleIncidentCreated = (inc: any) => {
      setNotifications((prev) => [
        {
          id: String(Date.now()),
          title: `New Incident: ${inc.incidentNumber}`,
          message: `${inc.description} (Severity ${inc.severity}/5)`,
          type: 'incident',
          timestamp: new Date(),
          read: false,
        },
        ...prev,
      ])
    }

    const handleIncidentUpdated = (inc: any) => {
      setNotifications((prev) => [
        {
          id: String(Date.now()),
          title: `Incident ${inc.incidentNumber} Updated`,
          message: `Status transitioned to '${inc.status}'.`,
          type: 'incident',
          timestamp: new Date(),
          read: false,
        },
        ...prev,
      ])
    }

    socket.on('incident:created', handleIncidentCreated)
    socket.on('incident:updated', handleIncidentUpdated)

    return () => {
      socket.off('incident:created', handleIncidentCreated)
      socket.off('incident:updated', handleIncidentUpdated)
    }
  }, [socket])

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    )
  }

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.read : true))

  const getIcon = (type: string) => {
    switch (type) {
      case 'incident':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'vehicle':
        return <Truck className="w-5 h-5 text-blue-500" />
      case 'hospital':
        return <Hospital className="w-5 h-5 text-emerald-500" />
      case 'security':
        return <ShieldAlert className="w-5 h-5 text-purple-500" />
      default:
        return <Info className="w-5 h-5 text-slate-500" />
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-red-500" />
            Live Dispatch Notifications
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Real-time emergency operational updates, unit dispatches, and capacity alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
          <button
            onClick={clearAll}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Clear notifications"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filter === 'all'
              ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          All Notifications ({notifications.length})
        </button>

        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filter === 'unread'
              ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Unread ({notifications.filter((n) => !n.read).length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-sm">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No notifications at this time. System running normally.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleRead(item.id)}
              className={`p-4 rounded-2xl border transition cursor-pointer flex items-start gap-4 ${
                item.read
                  ? 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 opacity-80'
                  : 'bg-white dark:bg-slate-900 border-red-500/40 dark:border-red-500/30 shadow-sm'
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 shrink-0">
                {getIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3
                    className={`text-sm font-bold ${
                      item.read
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {item.title}
                  </h3>
                  <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {item.message}
                </p>
              </div>

              {!item.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default NotificationsPage
