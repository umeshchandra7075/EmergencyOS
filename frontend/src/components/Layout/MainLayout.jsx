/**
 * MainLayout.jsx - Protected layout for authenticated users
 * Includes navigation sidebar/navbar, role-aware menu items,
 * and child route rendering. Shows sidebar based on user role.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSelector } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogoutButton } from '../components/Layout/LogoutButton'

export const MainLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = async (e) => {
    e.preventDefault()
    await logout()
    navigate('/login')
  }

  // Auto-close sidebar on link click (mobile)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && event.target.hasAttribute('data-nav-link')) {
        setSidebarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sidebarOpen])

  return (
    <div className="main-layout min-h-screen">
      {/* Top Navbar */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <NavLink to="/" className="text-xl font-bold text-blue-600">
              🚨 Emergency Route Planner
            </NavLink>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2"
              aria-label="Toggle navigation"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 12l2-2m2 2l2 2m7-2l2 2M7 7l5 5M9 7l5 5" />
              </svg>
            </button>
          </div>

          {/* User info and logout */}
          <div className="flex items-center gap-4">
            {user && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSidebarOpen(!sidebarOpen)
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors"
                >
                  <span className="font-medium text-gray-800">
                    {user.name || user.email}
                  </span>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 5a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3zm-3 7a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3h-2a3 3 0 0 0-3 3zm12 0a3 3 0 0 1 3 3h2a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3zm-3-3a3 3 0 0 0-3 3h2a3 3 0 0 0 3 3v2a3 3 0 0 0 3 3h-2a3 3 0 0 0-3-3z" />
                  </svg>
                </button>
                {/* Logout menu - appears when clicking user button */}
                <div
                  onClick={handleLogout}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-200 hidden"
                  role="menu"
                  aria-label="User menu"
                >
                  <div className="px-2 py-1 text-sm text-gray-600 border-b border-gray-200">
                    User Menu
                  </div>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={handleLogout}
                  >
                    Logout
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`sidebar fixed left-0 top-20 h-screen w-64 bg-gray-50 border2 border-gray-200 transition-transform duration-300 ${
          sidebarOpen ? 'transform translate-x-0' : 'transform translate-x-full'
        }`}
      >
        <nav className="px-2 py-4 space-y-2">
          {/* Home */}
          <NavLink
            to="/"
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
              window.location.pathname === '/' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}
            `}
            data-nav-link
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 12l2-2m2 2l2 2m7-2l2 2M7 7l5 5M9 7l5 5" />
            </svg>
            Dashboard
          </NavLink>

          {/* Role-specific navigation */}
          {user?.role === 'citizen' && (
            <NavLink
              to="/sos"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                window.location.pathname === '/sos' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}
              `}
              data-nav-link
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12l4 4L16 12" />
              </svg>
              SOS Report
            </NavLink>
          )}

          {user?.role === 'dispatcher' && (
            <>
              <NavLink
                to="/"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                    window.location.pathname === '/' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}
                  `}
                  data-nav-link
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 12l2-2m2 2l2 2m7-2l2 2M7 7l5 5M9 7l5 5" />
                  </span>
                  Dashboard
                </NavLink>
              <NavLink
                to="/incident/:incidentId"
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  window.location.pathname?.includes('/incident') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}
                `}
                data-nav-link
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 5a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3zm-3 7a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3h-2a3 3 0 0 0-3 3zm12 0a3 3 0 0 1 3 3h2a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3zm-3-3a3 3 0 0 0-3 3h2a3 3 0 0 0 3 3v2a3 3 0 0 0 3 3h-2a3 3 0 0 0-3-3z" />
                </svg>
                My Assignments
              </NavLink>
            </>
          )}

          {user?.role === 'driver' && (
            <NavLink
              to="/"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                window.location.pathname === '/' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}
              `}
              data-nav-link
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12l4 4L16 12" />
              </svg>
              Dispatch
            </NavLink>
          )}

          {user?.role === 'hospital_staff' && (
            <NavLink
              to="/hospital"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                window.location.pathname === '/hospital' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}
              `}
              data-nav-link
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M2 3l6a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6a4 4 0 0 1-4-4zm6 7l6 6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2zm4-9H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2z" />
              </svg>
              Hospital Capacity
            </NavLink>
          )}

          {user?.role === 'admin' && (
            <>
              <NavLink
                to="/admin"
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  window.location.pathname === '/admin' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}
                `}
                data-nav-link
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Admin Panel
              </NavLink>
              <NavLink
                to="/users"
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  window.location.pathname === '/users' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}
                `}
                data-nav-link
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 20h8a4 4 0 0 1 4 4l-4 4a4 4 0 0 1-4-4H8a4 4 0 0 1-4-4z" />
                </svg>
                Users
              </NavLink>
              <NavLink
                to="/vehicles"
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  window.location.pathname === '/vehicles' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}
                `}
                data-nav-link
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="2" y="6" width="20" height="14" rx="2" ry="2" />
                  <path d="M6 2L3 6" />
                  <path d="M18 6L21 6" />
                </svg>
                Vehicles
              </NavLink>
              <NavLink
                to="/facilities"
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  window.location.pathname === '/facilities' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}
                `}
                data-nav-link
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M3 4h18" />
                  <path d="M3 8h18" />
                  <path d="M3 12h18" />
                  <path d="M3 16h18" />
                </svg>
                Facilities
              </NavLink>
              <NavLink
                to="/audit-logs"
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  window.location.pathname === '/audit-logs' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}
                `}
                data-nav-link
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M18 20v-7m4-7v7" />
                </svg>
                Audit Logs
              </NavLink>
            </>
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-4 md:p-6 transition-all sm:ml-64">
        {children}
      </main>
    </div>
  )
}