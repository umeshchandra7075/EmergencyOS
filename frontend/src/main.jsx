/**
 * main.jsx - React 18 entry point
 * Creates the app root using createRoot,
 * integrates Router and AuthProvider,
 * registers Tailwind CSS via index.css,
 * renders the App component.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist'
import { fetchPlaces } from 'react-easy-autocomplete'

import App from './App'
import './index.css' // Tailwind directives and global styles

// Create root and render
const container = document.getElementById('root')
if (container) {
  const root = ReactDOM.createRoot(container)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} else {
  console.error('Root element not found: #root')
  throw new Error('Root element not found')
}