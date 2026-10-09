/**
 * API Service - Axios configuration with automatic cookie handling
 * Automatically sends httpOnly cookies (access token, refresh token)
 * Handles auth interceptor for 401 -> refresh token flow
 */

import axios from 'axios'

// Configure axios with base URL and credentials
const api = axios.create({
  baseURL: process.env.VITE_API_URL || 'http://localhost:4000',
  withCredentials: true, // Send cookies (access token, refresh token) automatically
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
}

// Add response interceptor for auth handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 401 and there's no original retry flag, try refresh token
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshResponse = await axios.post(
          '/api/auth/refresh',
          {},
          { withCredentials: true }
        )

        if (refreshResponse.data.success) {
          // Retry original request with new access token
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed - user is not authenticated
        // Log out and redirect to login
        try {
          await axios.post('/api/auth/logout', {}, { withCredentials: true })
        } catch (e) {
          // Ignore logout errors during auth failure handling
        }
      }
    }

    return Promise.reject(error)
  }
)

export default api