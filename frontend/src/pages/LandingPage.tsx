import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  AlertTriangle,
  Compass,
  Shield,
  Activity,
  Hospital,
  Truck,
  ArrowRight,
  Radio,
  Lock,
} from 'lucide-react'

export const LandingPage: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="py-8 sm:py-12 space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          Emergency Route Intelligence & Response Management Platform
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
          Intelligent Dispatch.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-amber-500">
            Real-Time Navigation.
          </span>{' '}
          Zero Hesitation.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          EmergencyOS connects citizens, dispatchers, responders, and hospital staff through location-aware
          road routing, sub-second telemetry, and atomic dispatch coordination.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {user ? (
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-600/20 transition transform hover:-translate-y-0.5"
            >
              Open Operations Center
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-600/20 transition transform hover:-translate-y-0.5"
              >
                Sign In to Command Center
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-sm transition"
              >
                Register Citizen SOS Account
              </Link>
            </>
          )}
          <Link
            to="/sos"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 font-bold text-sm transition"
          >
            <AlertTriangle className="w-4 h-4" />
            Emergency SOS Portal
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">OSRM Road Routing Engine</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            True turn-by-turn road geometry for emergency vehicles with alternative routes and honest, labeled non-navigable fallback diagnostics.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Radio className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Real-Time WebSocket Sync</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Authenticated Socket.IO channels stream vehicle GPS coordinates, incident status transitions, and bed capacity updates instantaneously.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Hospital className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Dynamic Facility Triage</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Spherical <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">$geoNear</code> discovery pairs incidents with nearby hospitals having available trauma and ICU bed capacity.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Atomic Concurrency Double-Lock</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Prevents race conditions and double vehicle assignments with atomic status locking and automated rollback protection.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Session Rotation & Replay Defense</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            State-backed SHA-256 session rotation instantly invalidates all sessions upon replay detection, eliminating token theft vectors.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Audited Role-Based Access</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Granular permissions for Citizens, Dispatchers, Responders, Drivers, and Hospital Staff with comprehensive audit logging.
          </p>
        </div>
      </section>

      {/* Operational Disclaimer */}
      <section className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center max-w-3xl mx-auto space-y-2">
        <div className="text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
          <AlertTriangle className="w-4 h-4" />
          Notice of Operational Transparency
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          EmergencyOS is an advanced emergency route intelligence platform engineered for simulation and demonstration.
          In real-world critical emergencies, always dial official regional emergency dispatch services (e.g., 108/112 in India, 911 in the US) directly.
        </p>
      </section>
    </div>
  )
}

export default LandingPage
