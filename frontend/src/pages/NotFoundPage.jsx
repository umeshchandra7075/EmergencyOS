/**
 * NotFoundPage.jsx - 404 Not Found page
 * Displayed when an unknown route is accessed
 */

import { useState } from 'react'

export const NotFoundPage = () => {
  const [showHome, setShowHome] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-12 h-12 text-red-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 7l10 5 10-5" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">404</h1>
        <p className="text-gray-600 mb-6 page-not-found-text">
          The page you're looking for doesn't exist.
        </p>
        <button
          onClick={() => setShowHome(true)}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  )
}