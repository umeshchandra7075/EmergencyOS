/**
 * AuthLayout.jsx - Layout for unauthenticated users (login/register)
 * Full-width forms without sidebar, centered content
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export const AuthLayout = ({ children }) => {
  const navigate = useNavigate()
  const [showRegister, setShowRegister] = useState(false)

  const handleLogin = () => {
    setShowRegister(false)
  }

  const handleRegister = () => {
    setShowRegister(true)
  }

  return (
    <div className="auth-layout min-h-screen flex items-center justify-center bg-gray-50 p-2">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        {showRegister ? (
          <h2 className="text-xl font-bold text-center mb-6">Register</h2> :
          <h2 className="text-xl font-bold text-center mb-6">Login</h2>
        )}
        {children}
        {showRegister ? (
          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?{' '}
            <span
              onClick={() => setShowRegister(true)}
              className="text-blue-600 underline cursor-pointer"
            >
              Register
            </span>
          </p>
        ) : (
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <span
              onClick={() => setShowRegister(false)}
              className="text-blue-600 underline cursor-pointer"
            >
              Login
            </span>
          </p>
        )}
      </div>
    </div>
  )
}