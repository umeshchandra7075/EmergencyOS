import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import mongoose from 'mongoose'
import { config } from './config/env.js'
import { apiRateLimiter } from './middleware/rateLimiter.js'
import { errorHandler } from './middleware/errorHandler.js'
import { checkRoutingServiceHealth } from './services/routingService.js'

import authRoutes from './routes/authRoutes.js'
import incidentRoutes from './routes/incidentRoutes.js'
import vehicleRoutes from './routes/vehicleRoutes.js'
import facilityRoutes from './routes/facilityRoutes.js'
import hazardRoutes from './routes/hazardRoutes.js'
import analyticsRoutes from './routes/analyticsRoutes.js'
import userRoutes from './routes/userRoutes.js'
import routeRoutes from './routes/routeRoutes.js'

const app = express()

// Security & Optimization Middleware
app.use(helmet({ contentSecurityPolicy: false }))
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  })
)
app.use(compression())
app.use(cookieParser())
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))

if (config.NODE_ENV !== 'test') {
  app.use(morgan('dev'))
}

// Health (Liveness) and Readiness Checks
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'EmergencyOS API',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    memory: {
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  })
})

app.get('/ready', async (_req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1
  if (!isDbConnected) {
    return res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      message: 'Primary database connection is down. Unable to serve stateful traffic.',
    })
  }

  const routingHealth = await checkRoutingServiceHealth()
  const isDegraded = routingHealth.status !== 'available'

  return res.status(200).json({
    status: isDegraded ? 'degraded' : 'ready',
    database: 'connected',
    routing: routingHealth,
    timestamp: new Date().toISOString(),
  })
})

// Rate limit API endpoints
app.use('/api', apiRateLimiter)

// Mount API Routes
app.use('/api/auth', authRoutes)
app.use('/api/incidents', incidentRoutes)
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/facilities', facilityRoutes)
app.use('/api/hazards', hazardRoutes)
app.use('/api/routes', routeRoutes)
app.use('/api/dashboard', analyticsRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/users', userRoutes)

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'The requested API endpoint was not found.',
  })
})

// Centralized Error Handler
app.use(errorHandler)

export default app
