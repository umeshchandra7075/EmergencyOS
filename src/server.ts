import http from 'http'
import app from './app.js'
import { config } from './config/env.js'
import { connectDB } from './config/db.js'
import { initSocketServer } from './services/socketService.js'

async function startServer() {
  await connectDB()

  const server = http.createServer(app)
  initSocketServer(server)

  server.listen(config.PORT, () => {
    console.log(`🚀 EmergencyOS API & Socket Server running on http://localhost:${config.PORT}`)
    console.log(`🌍 Environment: ${config.NODE_ENV}`)
  })

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down server...')
    server.close(() => {
      console.log('Server closed.')
      process.exit(0)
    })
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
