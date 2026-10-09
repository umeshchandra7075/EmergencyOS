import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import { User, UserRole } from '../types'

interface AuthContextType {
  user: User | null
  role: UserRole | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string, role?: string, phone?: string) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoading: true,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get('/auth/me')
        if (res.data.success && res.data.data) {
          setUser(res.data.data)
        }
      } catch (err) {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMe()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post('/auth/login', { email, password })
      if (res.data.success && res.data.data) {
        setUser(res.data.data)
        if (res.data.data.accessToken) {
          localStorage.setItem('emergencyos_token', res.data.data.accessToken)
        }
        return true
      }
      return false
    } catch (err) {
      return false
    }
  }

  const register = async (
    name: string,
    email: string,
    password: string,
    role?: string,
    phone?: string
  ): Promise<boolean> => {
    try {
      const res = await api.post('/auth/register', { name, email, password, role, phone })
      if (res.data.success && res.data.data) {
        setUser(res.data.data)
        if (res.data.data.accessToken) {
          localStorage.setItem('emergencyos_token', res.data.data.accessToken)
        }
        return true
      }
      return false
    } catch (err) {
      return false
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('emergencyos_token')
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
