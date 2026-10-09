import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'
import User from '../models/User.js'
import Vehicle from '../models/Vehicle.js'
import Incident from '../models/Incident.js'
import { UserRole } from '../config/constants.js'

let io: Server | null = null

export function initSocketServer(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: config.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  })

  // Socket Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      let token = socket.handshake.auth?.token

      if (!token && socket.handshake.headers?.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';')
        for (const cookie of cookies) {
          const [key, val] = cookie.trim().split('=')
          if (key === 'accessToken') {
            token = val
            break
          }
        }
      }

      if (!token) {
        return next(new Error('Authentication required for real-time connection'))
      }

      const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string }
      const user = await User.findById(decoded.id)

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'))
      }

      socket.data.user = user
      next()
    } catch (err: any) {
      next(new Error(`Socket authentication failed: ${err.message}`))
    }
  })

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user
    console.log(`🔌 Client connected: ${socket.id} (User: ${user.name}, Role: ${user.role})`)

    // Join user room
    socket.join(`user:${user._id}`)

    // Join role rooms
    socket.join(`role:${user.role}`)
    if (user.role === UserRole.DRIVER) {
      socket.join('role:responder')
    } else if (user.role === UserRole.RESPONDER) {
      socket.join('role:driver')
    }

    // Join incident room
    socket.on('incident:join', async ({ incidentId }) => {
      try {
        const incident = await Incident.findById(incidentId)
        if (!incident) return

        // Authorization check: only reporter, assigned responder, dispatcher, admin
        const isReporter = String(incident.citizen) === String(user._id)
        const isAssigned = incident.assignedResponder && String(incident.assignedResponder) === String(user._id)
        const isStaff = [UserRole.DISPATCHER, UserRole.ADMIN, UserRole.HOSPITAL_STAFF].includes(user.role)

        if (isReporter || isAssigned || isStaff) {
          socket.join(`incident:${incidentId}`)
          console.log(`[Socket] User ${user.email} joined room incident:${incidentId}`)
        } else {
          socket.emit('error:authorization', {
            message: 'Unauthorized: You are not authorized to subscribe to this incident room.',
          })
        }
      } catch (err) {
        console.error('Error joining incident room:', err)
      }
    })

    // Vehicle GPS streaming from responder client
    socket.on('vehicle:location_update', async (data: {
      vehicleId: string
      coordinates: [number, number] // [lng, lat]
      heading?: number
      speed?: number
      incidentId?: string
    }) => {
      try {
        // Verify user is authorized responder/driver
        if (![UserRole.RESPONDER, UserRole.DRIVER, UserRole.ADMIN].includes(user.role)) {
          socket.emit('error:authorization', { message: 'Forbidden: Role not authorized to emit GPS updates.' })
          return
        }

        const { vehicleId, coordinates, heading, speed, incidentId } = data
        if (!coordinates || coordinates.length !== 2) return

        // GEO-01: Coordinate bounds validation on socket event
        if (
          coordinates[0] < -180 ||
          coordinates[0] > 180 ||
          coordinates[1] < -90 ||
          coordinates[1] > 90
        ) {
          return
        }

        // Verify responder ownership of this vehicle
        const vehicle = await Vehicle.findById(vehicleId)
        if (!vehicle) return

        if (user.role !== UserRole.ADMIN && String(vehicle.driver) !== String(user._id)) {
          socket.emit('error:authorization', {
            message: 'Forbidden: Cannot update coordinates of vehicle assigned to another responder.',
          })
          return
        }

        // Persist vehicle location
        await Vehicle.findByIdAndUpdate(vehicleId, {
          currentLocation: { type: 'Point', coordinates },
          heading: heading || 0,
          speed: speed || 0,
          lastActiveAt: new Date(),
        })

        // Broadcast to dispatchers
        io?.to('role:dispatcher').emit('vehicle:location_broadcast', {
          vehicleId,
          coordinates,
          heading,
          speed,
          incidentId,
          timestamp: new Date(),
        })

        // Broadcast to specific incident room (for citizen tracking)
        if (incidentId) {
          io?.to(`incident:${incidentId}`).emit('vehicle:location_broadcast', {
            vehicleId,
            coordinates,
            heading,
            speed,
            incidentId,
            timestamp: new Date(),
          })
        }
      } catch (error) {
        console.error('Error processing vehicle location update:', error)
      }
    })

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`)
    })
  })

  return io
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io server not initialized')
  }
  return io
}

export function broadcastIncidentCreated(incident: any) {
  if (!io) return
  io.to('role:dispatcher').to('role:admin').emit('incident:created', incident)
}

export function broadcastIncidentUpdated(incident: any) {
  if (!io) return
  const id = String(incident._id)
  io.to(`incident:${id}`).to('role:dispatcher').to('role:admin').emit('incident:updated', incident)
}

export function broadcastIncidentAssigned(incident: any, responderId: string) {
  if (!io) return
  const id = String(incident._id)
  io.to(`user:${responderId}`).to(`incident:${id}`).to('role:dispatcher').emit('incident:assigned', incident)
}

export function broadcastFacilityUpdated(facility: any) {
  if (!io) return
  io.to('role:dispatcher').to('role:hospital_staff').to('role:admin').emit('facility:capacity_update', facility)
}
