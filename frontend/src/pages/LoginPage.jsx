/**
 * LoginPage.jsx - User login form
 * Uses the existing AuthContext and API service for authentication
 * Integrates with httpOnly cookie-based JWT flow
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await api.post('/api/auth/login', { email, password }, {
        withCredentials: true,
      })

      if (response.data.success) {
        setIsLoading(false)
        toast.success('Login successful')
        // User data is set via AuthProvider from the me endpoint
        // Navigate based on role
        if (user?.role) {
          const roleRoutes = {
            citizen: '/sos',
            dispatcher: '/',
            driver: '/',
            hospital_staff: '/hospital',
            admin: '/admin',
          }
          navigate(roleRoutes[user.role] || '/')
        } else {
          navigate('/')
        }
      } else {
        setIsLoading(false)
        toast.error(response.data.message || 'Login failed. Please try again.')
      }
    } catch (error) {
      setIsLoading(false)
      toast.error(error.message || 'Login failed. Please try again.')
    }
  }

  return (
    <div className="login-page min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-3 py-2"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-3 py-2"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 bg-blue-600 text-white font-medium rounded-md text-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600 text-center">
          Don't have an account?{' '}
          <span
            onClick={() => navigate('/register')}
            className="text-blue-600 underline cursor-pointer"
          >
            Register here
          </span>
        </p>
      </div>
    </div>
  )
}