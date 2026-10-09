/**
 * App.jsx - Root React component with Router, AuthProvider, and protected routes
 * Role-based navigation, authentication loading, unauthorized page handling
 * Uses React Router v6, Vite, Tailwind CSS
 */

import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'
import { useEffect } from 'react'
import './index.css' // Global Tailwind imports handled by Vite

// Page imports - all existing Phase 2 files
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SOSPage from './pages/SOSPage'
import DashboardPage from './pages/DashboardPage'
import IncidentDetailPage from './pages/IncidentDetailPage'
import HospitalPage from './pages/HospitalPage'
import NotFoundPage from './pages/NotFoundPage'
import AdminPanel from './pages/AdminPanel'

// Layout components
import MainLayout from './components/Layout/MainLayout'
import AuthLayout from './components/Layout/AuthLayout'

// Initialize React root after DOM is ready
useEffect(() => {
  const root = createRoot(document.getElementById('root'))
  root.render(
    <React.StrictMode>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Auth routes - public access */}
            <Route path="/login" element={<AuthLayout />}>
              <Route element={<LoginPage />} />
            </Route>
            <Route path="/register" element={<AuthLayout />}>
              <Route element={<RegisterPage />} />
            </Route>

            {/* Main application routes - protected */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/sos" element={<SOSPage />} />
              <Route path="/incident/:incidentId" element={<IncidentDetailPage />} />
              <Route path="/hospital" element={<HospitalPage />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Route>

            {/* Catch-all 404 route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </Router>
    </React.StrictMode>
  )
}, [])

export default function App() {
  return <div id="root" style={{ display: 'block' }} />
}