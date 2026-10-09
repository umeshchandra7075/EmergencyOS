import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import { ThemeProvider } from './contexts/ThemeContext'
import MainLayout from './components/Layout/MainLayout'

import DashboardPage from './pages/DashboardPage'
import LandingPage from './pages/LandingPage'
import PlannerPage from './pages/PlannerPage'
import IncidentsPage from './pages/IncidentsPage'
import IncidentDetailPage from './pages/IncidentDetailPage'
import FacilitiesPage from './pages/FacilitiesPage'
import HospitalPage from './pages/HospitalPage'
import VehiclesPage from './pages/VehiclesPage'
import RespondersPage from './pages/RespondersPage'
import LiveMapPage from './pages/LiveMapPage'
import NotificationsPage from './pages/NotificationsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import AdminPanel from './pages/AdminPanel'
import AuditLogsPage from './pages/AuditLogsPage'
import ProfilePage from './pages/ProfilePage'
import SOSPage from './pages/SOSPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import NotFoundPage from './pages/NotFoundPage'

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm font-medium">
        Authenticating EmergencyOS session...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  borderRadius: '12px',
                  fontSize: '13px',
                },
              }}
            />
            <Routes>
              {/* Public Auth & Landing Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/welcome" element={<LandingPage />} />

              {/* Authenticated Application Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="planner" element={<PlannerPage />} />
                <Route path="incidents" element={<IncidentsPage />} />
                <Route path="incident/:incidentId" element={<IncidentDetailPage />} />
                <Route path="facilities" element={<FacilitiesPage />} />
                <Route path="hospital" element={<HospitalPage />} />
                <Route path="vehicles" element={<VehiclesPage />} />
                <Route path="responders" element={<RespondersPage />} />
                <Route path="live-map" element={<LiveMapPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="admin" element={<AdminPanel />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="sos" element={<SOSPage />} />
              </Route>

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
