import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { UserRole } from '../../types'
import {
  AlertTriangle,
  Hospital,
  Shield,
  Truck,
  Users,
  BarChart3,
  FileText,
  User,
  LogOut,
  Sun,
  Moon,
  Laptop,
  Menu,
  X,
  MapPin,
  Compass,
  Bell,
} from 'lucide-react'

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth()
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const roleBadgeColors: Record<string, string> = {
    [UserRole.CITIZEN]: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    [UserRole.DISPATCHER]: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    [UserRole.RESPONDER]: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    [UserRole.DRIVER]: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    [UserRole.HOSPITAL_STAFF]: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    [UserRole.ADMIN]: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  }

  const isActive = (path: string) => location.pathname === path

  const navLinkClass = (path: string) =>
    `px-2.5 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 ${
      isActive(path)
        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
    }`

  return (
    <header className="bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900 dark:text-white group focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg p-1"
          >
            <span className="p-1.5 bg-red-600/10 dark:bg-red-600/20 border border-red-500/30 text-red-600 dark:text-red-500 rounded-lg group-hover:scale-105 transition">
              🚨
            </span>
            <span>
              Emergency<span className="text-red-600 dark:text-red-500">OS</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden xl:flex items-center gap-1 ml-2" aria-label="Main Navigation">
              <Link to="/" className={navLinkClass('/')}>
                Dashboard
              </Link>

              <Link to="/planner" className={navLinkClass('/planner')}>
                <Compass className="w-3.5 h-3.5" />
                Route Planner
              </Link>

              <Link to="/incidents" className={navLinkClass('/incidents')}>
                <AlertTriangle className="w-3.5 h-3.5" />
                Incidents
              </Link>

              <Link to="/live-map" className={navLinkClass('/live-map')}>
                <MapPin className="w-3.5 h-3.5" />
                Live Map
              </Link>

              <Link to="/facilities" className={navLinkClass('/facilities')}>
                <Hospital className="w-3.5 h-3.5" />
                Facilities
              </Link>

              {[UserRole.DISPATCHER, UserRole.ADMIN].includes(role as UserRole) && (
                <>
                  <Link to="/vehicles" className={navLinkClass('/vehicles')}>
                    <Truck className="w-3.5 h-3.5" />
                    Vehicles
                  </Link>

                  <Link to="/responders" className={navLinkClass('/responders')}>
                    <Users className="w-3.5 h-3.5" />
                    Responders
                  </Link>
                </>
              )}

              {[UserRole.DISPATCHER, UserRole.ADMIN, UserRole.HOSPITAL_STAFF].includes(role as UserRole) && (
                <Link to="/analytics" className={navLinkClass('/analytics')}>
                  <BarChart3 className="w-3.5 h-3.5" />
                  Analytics
                </Link>
              )}

              {role === UserRole.ADMIN && (
                <>
                  <Link to="/admin" className={navLinkClass('/admin')}>
                    <Shield className="w-3.5 h-3.5" />
                    Admin
                  </Link>
                  <Link to="/audit-logs" className={navLinkClass('/audit-logs')}>
                    <FileText className="w-3.5 h-3.5" />
                    Audit Logs
                  </Link>
                </>
              )}

              {role === UserRole.CITIZEN && (
                <Link
                  to="/sos"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-red-600 text-white hover:bg-red-700 shadow-sm"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  SOS Report
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Right Section: Theme Toggle, Notifications, User info, Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Selector Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setTheme('light')}
              title="Light theme"
              aria-label="Switch to light theme"
              className={`p-1 rounded transition ${
                theme === 'light'
                  ? 'bg-white text-amber-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              title="Dark theme"
              aria-label="Switch to dark theme"
              className={`p-1 rounded transition ${
                theme === 'dark'
                  ? 'bg-slate-900 text-sky-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('system')}
              title="System theme"
              aria-label="Follow system theme"
              className={`p-1 rounded transition ${
                theme === 'system'
                  ? 'bg-white dark:bg-slate-900 text-indigo-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Laptop className="w-4 h-4" />
            </button>
          </div>

          {user && (
            <>
              {/* Notifications Pill */}
              <Link
                to="/notifications"
                title="Notifications"
                aria-label="Notifications"
                className={`p-2 rounded-lg transition border ${
                  isActive('/notifications')
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-600 border-red-200 dark:border-red-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800'
                }`}
              >
                <Bell className="w-4 h-4" />
              </Link>

              {/* User Profile Info */}
              <Link
                to="/profile"
                className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left text-xs">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                    {user.name.split(' ')[0]}
                  </div>
                  <span
                    className={`inline-block text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                      roleBadgeColors[user.role] || 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </Link>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                title="Log out of EmergencyOS"
                aria-label="Logout"
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Mobile Menu Toggle Button */}
          {user && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Drawer"
              className="xl:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && user && (
        <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-5 space-y-1 shadow-2xl">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Dashboard
          </Link>
          <Link
            to="/planner"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Emergency Route Planner
          </Link>
          <Link
            to="/incidents"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Incidents
          </Link>
          <Link
            to="/live-map"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Live Operations Map
          </Link>
          <Link
            to="/facilities"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Facilities & Hospitals
          </Link>
          {[UserRole.DISPATCHER, UserRole.ADMIN].includes(role as UserRole) && (
            <>
              <Link
                to="/vehicles"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Fleet Vehicles
              </Link>
              <Link
                to="/responders"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Responders
              </Link>
            </>
          )}
          <Link
            to="/notifications"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Notifications Feed
          </Link>
          {[UserRole.DISPATCHER, UserRole.ADMIN, UserRole.HOSPITAL_STAFF].includes(role as UserRole) && (
            <Link
              to="/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Analytics & Reports
            </Link>
          )}
          {role === UserRole.ADMIN && (
            <>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                User Administration
              </Link>
              <Link
                to="/audit-logs"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Audit Trails
              </Link>
            </>
          )}
          <Link
            to="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            My Profile & Settings
          </Link>
          {role === UserRole.CITIZEN && (
            <Link
              to="/sos"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-bold bg-red-600 text-white text-center"
            >
              Report Emergency SOS
            </Link>
          )}
        </div>
      )}
    </header>
  )
}

export default Navbar
