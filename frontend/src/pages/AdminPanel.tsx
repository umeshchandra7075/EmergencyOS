import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { User, UserRole } from '../types'
import toast from 'react-hot-toast'
import { Shield, Users, Activity, FileText } from 'lucide-react'

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [audits, setAudits] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'users' | 'audits'>('users')
  const [loading, setLoading] = useState(true)

  const loadAdminData = async () => {
    try {
      const [uRes, aRes] = await Promise.all([
        api.get('/users'),
        api.get('/analytics/audits'),
      ])
      if (uRes.data.success) {
        setUsers(uRes.data.data.users || [])
      }
      if (aRes.data.success) {
        setAudits(aRes.data.data.logs || [])
      }
    } catch (err) {
      toast.error('Could not load administrative data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await api.patch(`/users/${userId}/role`, { role: newRole })
      if (res.data.success) {
        toast.success('User role updated.')
        setUsers((prev) =>
          prev.map((u) => (u._id === userId || u.id === userId ? { ...u, role: newRole as any } : u))
        )
      }
    } catch (err) {
      toast.error('Failed to change user role.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl transition-colors">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-rose-500" />
            Administration & Compliance Governance
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            RBAC role assignment, user access control, and immutable audit trails
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'users' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Users & Roles
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'audits' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Audit Logs
          </button>
        </div>
      </div>

      {activeTab === 'users' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-colors">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
            User Accounts ({users.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Phone</th>
                  <th className="p-3.5">Current Role</th>
                  <th className="p-3.5">Role Governance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u._id || u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{u.name}</td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300 font-mono">{u.email}</td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400">{u.phone || '—'}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 font-bold text-slate-700 dark:text-slate-300 capitalize">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id || u.id, e.target.value)}
                        className="p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                      >
                        <option value="citizen">citizen</option>
                        <option value="dispatcher">dispatcher</option>
                        <option value="responder">responder</option>
                        <option value="hospital_staff">hospital_staff</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-colors">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
            Security & Lifecycle Compliance Audit Log ({audits.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Action Event</th>
                  <th className="p-3.5">Entity</th>
                  <th className="p-3.5">Actor</th>
                  <th className="p-3.5">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {audits.map((a, i) => (
                  <tr key={a._id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {new Date(a.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-bold text-rose-600 dark:text-rose-400">{a.action}</td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300">
                      {a.entityType}: {a.entityId?.slice(-6)}
                    </td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300">
                      {a.actorEmail || 'System'} ({a.actorRole || 'system'})
                    </td>
                    <td className="p-3.5 text-slate-500">{a.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
