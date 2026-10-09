import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import { AlertTriangle, Shield, Hospital, Users, LogOut, Sun, Moon } from 'lucide-react'

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('emergencyos_theme') as 'dark' | 'light') || 'dark'
  })

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('emergencyos_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const roleBadgeColors: Record<string, string> = {
    [UserRole.CITIZEN]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    [UserRole.DISPATCHER]: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    [UserRole.RESPONDER]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    [UserRole.DRIVER]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    [UserRole.HOSPITAL_STAFF]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    [UserRole.ADMIN]: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-black tracking-tight text-white group focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg p-1"
          >
            <span className="p-2 bg-red-600/20 border border-red-500/40 text-red-500 rounded-lg group-hover:scale-105 transition">
              🚨
            </span>
            <span>
              Emergency<span className="text-red-500">OS</span>
            </span>
          </Link>

          {/* Navigation Links based on role */}
          {user && (
            <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isActive('/')
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                Dashboard
              </Link>

              {role === UserRole.CITIZEN && (
                <Link
                  to="/sos"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    isActive('/sos')
                      ? 'bg-red-600/30 text-red-300 border border-red-500/40'
                      : 'text-red-400 hover:bg-red-950/40'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Report SOS
                </Link>
              )}

              <Link
                to="/facilities"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isActive('/facilities')
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Hospital className="w-4 h-4" />
                Facilities
              </Link>

              {(role === UserRole.HOSPITAL_STAFF || role === UserRole.ADMIN) && (
                <Link
                  to="/hospital"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isActive('/hospital')
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  Bed Capacity
                </Link>
              )}

              {role === UserRole.ADMIN && (
                <Link
                  to="/admin"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                    isActive('/admin')
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Admin
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-slate-500"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle display theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
          </button>

          {user ? (
            <>
              {/* Role Badge */}
              <div
                className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border capitalize font-semibold ${
                  role ? roleBadgeColors[role] || 'bg-slate-800 text-slate-300' : ''
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {role?.replace('_', ' ')}
              </div>

              {/* User Name */}
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-white leading-tight">{user.name}</div>
                <div className="text-xs text-slate-400 leading-tight">{user.email}</div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-red-500"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm px-4 py-1.5 font-medium text-slate-300 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-slate-500 rounded-lg"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
