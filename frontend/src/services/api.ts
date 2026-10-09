import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || ''

// SEC-05: Strict In-Memory Token Management (Never store tokens in localStorage)
let inMemoryAccessToken: string | null = null

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token
}

export const getAccessToken = (): string | null => {
  return inMemoryAccessToken
}

export const api = axios.create({
  baseURL: baseURL ? `${baseURL}/api` : '/api',
  withCredentials: true, // Automatically transmits HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach in-memory bearer token if present
api.interceptors.request.use((config) => {
  if (inMemoryAccessToken && config.headers) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`
  }
  return config
})

// Intercept 401 and attempt automatic token rotation via HttpOnly refresh cookie
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
          const newToken = refreshRes.data.data.accessToken
          setAccessToken(newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        }
      } catch (e) {
        setAccessToken(null)
      }
    }
    return Promise.reject(error)
  }
)

export default api
