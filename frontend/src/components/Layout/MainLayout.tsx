import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import { useSocket } from '../../contexts/SocketContext'

export const MainLayout: React.FC = () => {
  const { connected } = useSocket()

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
      <Navbar />

      {/* Global Connectivity Banner */}
      <div
        className={`text-xs py-1 px-4 text-center transition-colors font-medium ${
          connected
            ? 'bg-emerald-950/40 text-emerald-400 border-b border-emerald-900/40'
            : 'bg-amber-950/60 text-amber-300 border-b border-amber-900/40'
        }`}
      >
        <span className="inline-block w-2 h-2 rounded-full mr-2 animate-pulse bg-current"></span>
        {connected
          ? 'Live Dispatch Network Active (Real-Time Synchronized)'
          : 'Connecting to Real-Time Dispatch Gateway...'}
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        EmergencyOS — Real-Time Emergency Route Intelligence Platform &copy; 2026. For authorized emergency coordination.
      </footer>
    </div>
  )
}

export default MainLayout
