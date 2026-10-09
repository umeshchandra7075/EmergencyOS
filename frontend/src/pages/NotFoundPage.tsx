import React from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Home } from 'lucide-react'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center text-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div className="w-12 h-12 bg-red-600/20 border border-red-500/40 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl">
          ⚠️
        </div>
        <h1 className="text-3xl font-black text-white">404 — Page Not Found</h1>
        <p className="text-sm text-slate-400 mt-2">
          The requested emergency resource, route, or endpoint does not exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition shadow-lg shadow-red-900/30"
        >
          <Home className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage
