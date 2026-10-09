/**
 * RegisterPage.jsx - User registration form
 * Collects user details and creates a new account
 * Integrates with the existing API service and AuthContext
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export const RegisterPage = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('citizen')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const handleRegister = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await api.post('/api/auth/register', {
        name,
        email,
        password,
        role,
      }, { withCredentials: true })

      if (response.data.success) {
        setIsLoading(false)
        toast.success('Account created successfully. Please login.')
        navigate('/login')
      } else {
        setIsLoading(false)
        toast.error(response.data.message || 'Registration failed. Please try again.')
      }
    } catch (error) {
      setIsLoading(false)
      toast.error(error.message || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="register-page min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-3 py-2"
              placeholder="Full name"
            />
          </div>

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
              placeholder "••••••••"
            />
          </div>

          {/* Role selector for registration */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-3 py-2"
            >
              <option value="citizen">Citizen</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="driver">Driver/Responder</option>
              <option value="hospital_staff">Hospital Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 bg-blue-600 text-white font-medium rounded-md text-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600 text-center">
          Already have an account?{' '}
          <span
            onClick={() => navigate('/login')}
            className="text-blue-600 underline cursor-pointer"
          >
            Login here
          </span>
        </p>
      </div>
    </div>
  )
}