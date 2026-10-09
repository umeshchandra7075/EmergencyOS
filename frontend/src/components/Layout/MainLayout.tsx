import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import { useSocket } from '../../contexts/SocketContext'

export const MainLayout: React.FC = () => {
  const { connected } = useSocket()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-150">
      <Navbar />

      {/* Global Real-Time Connectivity Banner */}
      <div
        className={`text-xs py-1 px-4 text-center transition-colors font-medium ${
          connected
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-b border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-b border-amber-500/20'
        }`}
      >
        <span className="inline-block w-2 h-2 rounded-full mr-2 animate-pulse bg-current"></span>
        {connected
          ? 'Live Dispatch Network Active (Real-Time Synchronized)'
          : 'Connecting to Real-Time Dispatch Gateway... (Reconnection with State Recovery Active)'}
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 transition-colors">
        EmergencyOS — Real-Time Emergency Route Intelligence Platform &copy; 2026. Non-official emergency system demonstration.
      </footer>
    </div>
  )
}

export default MainLayout
