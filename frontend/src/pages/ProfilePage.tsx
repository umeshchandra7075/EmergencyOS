import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Shield,
  Sun,
  Moon,
  Laptop,
  Lock,
  Phone,
  Mail,
  LogOut,
  CheckCircle,
  Truck,
  Hospital,
} from 'lucide-react'

export const ProfilePage: React.FC = () => {
  const { user, role, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (!user) return null

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-6 h-6 text-red-500" />
          User Profile & Security Settings
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Manage your EmergencyOS account details, cryptographic session preferences, and appearance.
        </p>
      </div>

      {/* Profile Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-red-600/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{user.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                {user.role}
              </span>
              <span className="text-xs text-slate-500">· EmergencyOS Verified</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="space-y-1">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email Address
            </span>
            <div className="font-semibold text-slate-900 dark:text-slate-100">{user.email}</div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Contact Telephone
            </span>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {user.phone || '+91 Emergency Dispatch Linked'}
            </div>
          </div>

          {user.vehicle && (
            <div className="space-y-1">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-500" />
                Assigned Unit
              </span>
              <div className="font-semibold text-blue-600 dark:text-blue-400">
                Unit {(user.vehicle as any).plateNumber || 'TS-09-EM-1001'}
              </div>
            </div>
          )}

          {user.facility && (
            <div className="space-y-1">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Hospital className="w-3.5 h-3.5 text-emerald-500" />
                Assigned Emergency Hospital
              </span>
              <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                {(user.facility as any).name || 'Gandhi General Hospital'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Theme Preference Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" />
          Appearance & Theme Tokens
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Choose your interface preference. The setting persists across sessions and eliminates theme flashing.
        </p>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <button
            onClick={() => setTheme('light')}
            className={`p-3 rounded-xl border text-left transition flex flex-col items-start gap-2 ${
              theme === 'light'
                ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-bold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span className="text-xs">Light Mode</span>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-3 rounded-xl border text-left transition flex flex-col items-start gap-2 ${
              theme === 'dark'
                ? 'border-sky-500 bg-sky-500/10 text-sky-900 dark:text-sky-200 font-bold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Moon className="w-5 h-5 text-sky-400" />
            <span className="text-xs">Dark Mode</span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`p-3 rounded-xl border text-left transition flex flex-col items-start gap-2 ${
              theme === 'system'
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 font-bold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Laptop className="w-5 h-5 text-indigo-500" />
            <span className="text-xs">System OS</span>
          </button>
        </div>
      </div>

      {/* Security Architecture Verification Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-500" />
          Active Security Defenses
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                In-Memory Token & HttpOnly Cookie Protection (SEC-05)
              </div>
              <div className="text-slate-500 mt-0.5">
                Access tokens are stored strictly in memory; refresh tokens are guarded by HttpOnly, SameSite cookies.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                State-Backed Replay Attack Containment (SEC-02)
              </div>
              <div className="text-slate-500 mt-0.5">
                Every token rotation is hashed with SHA-256. Presenting rotated tokens triggers multi-session revocation.
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 font-bold text-xs transition"
          >
            <LogOut className="w-4 h-4" />
            Terminate Current Session & Log Out
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
