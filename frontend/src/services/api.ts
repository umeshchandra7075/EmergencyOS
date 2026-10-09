import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: baseURL ? `${baseURL}/api` : '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach Bearer token if present in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('emergencyos_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercept 401 and attempt refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshRes = await axios.post(
          `${baseURL ? `${baseURL}/api` : '/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        if (refreshRes.data.success && refreshRes.data.data?.accessToken) {
          localStorage.setItem('emergencyos_token', refreshRes.data.data.accessToken)
          originalRequest.headers.Authorization = `Bearer ${refreshRes.data.data.accessToken}`
          return api(originalRequest)
        }
      } catch (e) {
        localStorage.removeItem('emergencyos_token')
      }
    }
    return Promise.reject(error)
  }
)

export default api
