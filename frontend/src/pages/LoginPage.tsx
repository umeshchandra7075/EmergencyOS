import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Shield, AlertCircle } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const success = await login(email, password)
    setLoading(false)

    if (success) {
      toast.success('Signed in successfully!')
      navigate('/')
    } else {
      toast.error('Invalid email or password.')
    }
  }

  // Quick helper to fill demo accounts
  const quickLogin = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('password123')
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-sm transition-colors">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-600/10 dark:bg-red-600/20 border border-red-500/30 rounded-xl flex items-center justify-center text-2xl shadow-sm">
            🚨
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Sign in to EmergencyOS
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Real-time emergency route intelligence and coordination platform
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@emergency.example"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        {/* Demo Fast-Login Selector */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-center text-slate-500 font-semibold mb-3 uppercase tracking-wider">
            Quick-Login Demo Accounts (Password: password123)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => quickLogin('citizen@emergency.example')}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-left border border-slate-200 dark:border-slate-700 transition"
            >
              🙋 <strong>Citizen</strong>
              <div className="text-[10px] text-slate-500">Ramesh Sharma</div>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('dispatcher@emergency.example')}
              className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-left border border-amber-200 dark:border-amber-800/40 transition"
            >
              🎧 <strong>Dispatcher</strong>
              <div className="text-[10px] text-slate-500">Priya Deshmukh</div>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('responder@emergency.example')}
              className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-left border border-emerald-200 dark:border-emerald-800/40 transition"
            >
              🚑 <strong>Responder</strong>
              <div className="text-[10px] text-slate-500">Capt Vikram Singh</div>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('hospital@emergency.example')}
              className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-800 dark:text-purple-200 text-left border border-purple-200 dark:border-purple-800/40 transition"
            >
              🏥 <strong>Hospital Staff</strong>
              <div className="text-[10px] text-slate-500">Dr Ananya Rao</div>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('admin@emergency.example')}
              className="col-span-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-800 dark:text-rose-200 text-center border border-rose-200 dark:border-rose-800/40 transition font-bold"
            >
              🛡️ <strong>System Administrator</strong> (Full Access & Audits)
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          Need a citizen account?{' '}
          <Link to="/register" className="text-red-600 dark:text-red-400 font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
