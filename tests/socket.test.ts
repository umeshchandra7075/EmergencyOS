import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'http'
import { AddressInfo } from 'net'
import mongoose from 'mongoose'
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client'
import app from '../src/app.js'
import { initSocketServer, disconnectUserSockets } from '../src/services/socketService.js'
import { config } from '../src/config/env.js'
import User from '../src/models/User.js'
import Session from '../src/models/Session.js'
import Vehicle from '../src/models/Vehicle.js'
import Incident from '../src/models/Incident.js'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

let server: http.Server
let serverPort: number
let clientSockets: ClientSocket[] = []

let citizenUser: any
let dispatcherUser: any
let responderUser: any
let citizenToken = ''
let dispatcherToken = ''
let responderToken = ''
let testVehicle: any
let testIncident: any

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.MONGODB_URI)
  }

  // Create HTTP server and initialize socket server
  server = http.createServer(app)
  initSocketServer(server)

  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      serverPort = (server.address() as AddressInfo).port
      resolve()
    })
  })

  // Fetch or create users
  citizenUser = await User.findOne({ email: 'citizen@emergency.example' })
  dispatcherUser = await User.findOne({ email: 'dispatcher@emergency.example' })
  responderUser = await User.findOne({ email: 'responder@emergency.example' })
  testVehicle = await Vehicle.findOne()
  testIncident = await Incident.findOne()

  // Generate tokens and active sessions
  function setupAuth(user: any) {
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    )
    const refreshToken = jwt.sign(
      { id: user._id, nonce: crypto.randomBytes(8).toString('hex') },
      config.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    )
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')

    return { token, tokenHash }
  }

  const citizenAuth = setupAuth(citizenUser)
  citizenToken = citizenAuth.token
  await Session.create({
    user: citizenUser._id,
    tokenHash: citizenAuth.tokenHash,
    isRevoked: false,
    expiresAt: new Date(Date.now() + 86400000),
  })

  const dispatcherAuth = setupAuth(dispatcherUser)
  dispatcherToken = dispatcherAuth.token
  await Session.create({
    user: dispatcherUser._id,
    tokenHash: dispatcherAuth.tokenHash,
    isRevoked: false,
    expiresAt: new Date(Date.now() + 86400000),
  })

  const responderAuth = setupAuth(responderUser)
  responderToken = responderAuth.token
  await Session.create({
    user: responderUser._id,
    tokenHash: responderAuth.tokenHash,
    isRevoked: false,
    expiresAt: new Date(Date.now() + 86400000),
  })
})

afterAll(async () => {
  for (const s of clientSockets) {
    if (s.connected) s.disconnect()
  }
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await mongoose.disconnect()
})

function createClient(token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://127.0.0.1:${serverPort}`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000,
    })

    clientSockets.push(socket)

    socket.on('connect', () => resolve(socket))
    socket.on('connect_error', (err) => reject(err))
  })
}

describe('Real-Time Socket.IO Subsystem & Event Verification', () => {
  it('RT-TEST-01: Successfully authenticates valid client and connects', async () => {
    const socket = await createClient(citizenToken)
    expect(socket.connected).toBe(true)
    socket.disconnect()
  })

  it('RT-TEST-02: Rejects connection when token is absent or invalid', async () => {
    await expect(createClient('invalid-token')).rejects.toThrow()
  })

  it('RT-TEST-03: Rejects connection when user has no active session in database', async () => {
    // Generate valid JWT signature but do NOT create Session record
    const dummyToken = jwt.sign(
      { id: new mongoose.Types.ObjectId(), email: 'ghost@example.com', role: 'citizen' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    )
    await expect(createClient(dummyToken)).rejects.toThrow()
  })

  it('RT-TEST-04: Dispatcher receives vehicle location streaming broadcasts', async () => {
    const dispatcherSocket = await createClient(dispatcherToken)
    const responderSocket = await createClient(responderToken)

    const receivedCoordsPromise = new Promise<any>((resolve) => {
      dispatcherSocket.on('vehicle:location_broadcast', (data) => {
        resolve(data)
      })
    })

    // Assign responder as driver of testVehicle for this test
    if (testVehicle) {
      await Vehicle.findByIdAndUpdate(testVehicle._id, { driver: responderUser._id })

      responderSocket.emit('vehicle:location_update', {
        vehicleId: String(testVehicle._id),
        coordinates: [78.4867, 17.3850],
        heading: 90,
        speed: 45,
      })

      const data = await receivedCoordsPromise
      expect(data).toBeDefined()
      expect(data.coordinates).toEqual([78.4867, 17.3850])
      expect(data.speed).toBe(45)
    }

    dispatcherSocket.disconnect()
    responderSocket.disconnect()
  })

  it('RT-TEST-05: Enforces room authorization and rejects unauthorized incident room joins', async () => {
    const unauthCitizenSocket = await createClient(citizenToken)

    // Ensure citizen is not the owner or assigned responder
    const otherIncident = await Incident.create({
      incidentNumber: 'INC-SEC-TEST-99',
      citizen: new mongoose.Types.ObjectId(),
      emergencyType: 1,
      severity: 3,
      description: 'Private incident',
      source: { type: 'Point', coordinates: [78.4, 17.4] },
      status: 'Reported',
      timeline: [],
    })

    const authErrorPromise = new Promise<any>((resolve) => {
      unauthCitizenSocket.on('error:authorization', (err) => {
        resolve(err)
      })
    })

    unauthCitizenSocket.emit('incident:join', { incidentId: String(otherIncident._id) })

    const error = await authErrorPromise
    expect(error).toBeDefined()
    expect(error.message).toMatch(/Unauthorized/)

    await Incident.findByIdAndDelete(otherIncident._id)
    unauthCitizenSocket.disconnect()
  })

  it('RT-TEST-06: disconnectUserSockets instantly terminates client socket connections', async () => {
    const socket = await createClient(citizenToken)
    expect(socket.connected).toBe(true)

    const revokedPromise = new Promise<any>((resolve) => {
      socket.on('auth:revoked', (data) => resolve(data))
    })

    const disconnectPromise = new Promise<void>((resolve) => {
      socket.on('disconnect', () => resolve())
    })

    disconnectUserSockets(String(citizenUser._id), 'User logged out')

    const revokedData = await revokedPromise
    expect(revokedData.message).toMatch(/User logged out/)
    await disconnectPromise
    expect(socket.connected).toBe(false)
  })
})
