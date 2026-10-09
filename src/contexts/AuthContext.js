/**
 * Auth Context - React Context for authentication state
 * Manages user session, JWT tokens, role-based UI rendering
 * Integrates with httpOnly cookies via Axios automatic cookie sending
 */

import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

// Auth context type
const AuthContextProps = {
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  refreshToken: () => {},
  role: null,
  permissions: [],
}

const AuthContext = createContext(AuthContextProps)

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext)

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [permissions, setPermissions] = useState([])

  // Initialize auth on mount - try to read from cookies
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Axios will automatically send httpOnly cookies
        const response = await axios.get('/api/auth/me', {
          withCredentials: true,
        })

        if (response.data.success && response.data.data) {
          setUser(response.data.data)
          setPermissions(response.data.data.permissions || [])
        }
      } catch (error) {
        // No valid token, user is anonymous
        console.log('No active session')
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // Login function - sets cookies via backend
  const login = async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password }, {
      withCredentials: true,
    })
    if (response.data.success) {
      setUser(response.data.data)
      setPermissions(response.data.data.permissions || [])
    }
    return response.data
  }

  // Logout - clears cookies
  const logout = async () => {
    await axios.post('/api/auth/logout', {}, {
      withCredentials: true,
    })
    setUser(null)
    setPermissions([])
  }

  // Refresh token
  const refreshToken = async () => {
    const response = await axios.post('/api/auth/refresh', {}, {
      withCredentials: true,
    })
    if (response.data.success && response.data.data) {
      setUser(response.data.data)
    }
    return response.data
  }

  // Check if user has permission
  const hasPermission = (permission) => {
    if (!user) return false
    if (user.role === 'admin') return true
    return permissions.includes(permission)
  }

  // Check if user has ANY of these permissions
  const hasAnyPermission = (permissionsList) => {
    if (!user) return false
    if (user.role === 'admin') return true
    return permissions.some(p => permissionsList.includes(p))
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      refreshToken,
      role: user?.role,
      permissions,
      hasPermission,
      hasAnyPermission,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext