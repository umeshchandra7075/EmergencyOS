/**
 * AuthContext.jsx - React Context for authentication state
 * Manages user session, JWT tokens, role-based UI rendering
 * Integrates with httpOnly cookies via Axios automatic cookie sending
 */

import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  role: null,
  permissions: [],
})

export const useAuth = () => {
  return useContext(AuthContext)
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [permissions, setPermissions] = useState([])

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Axios withCredentials: true will send httpOnly cookies
        const response = await axios.get('/api/auth/me', {
          withCredentials: true,
        })

        if (response.data.success && response.data.data) {
          setUser(response.data.data)
          setPermissions(response.data.data.permissions || [])
        }
      } catch (error) {
        // No valid token - user is anonymous
        console.log('No active session or auth error')
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

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

  const logout = async () => {
    await axios.post('/api/auth/logout', {}, { withCredentials: true })
    setUser(null)
    setPermissions([])
  }

  const hasPermission = (permission) => {
    if (!user) return false
    if (user.role === 'admin') return true
    return permissions.includes(permission)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, role: user?.role, permissions, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}