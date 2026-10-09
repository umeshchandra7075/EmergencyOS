import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../src/app.js'
import { config } from '../src/config/env.js'
import { calculateHaversineDistanceMeters } from '../src/services/routingService.js'

let citizenToken = ''
let dispatcherToken = ''
let responderToken = ''
let responderId = ''
let testIncidentId = ''

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.MONGODB_URI)
  }
})

afterAll(async () => {
  await mongoose.disconnect()
})

describe('EmergencyOS Geospatial Engine', () => {
  it('correctly computes Haversine distance between Hyderabad landmarks', () => {
    // Charminar [78.4747, 17.3616] to Hussain Sagar [78.4744, 17.4239]
    // Distance ~ 6.9 km
    const distance = calculateHaversineDistanceMeters(
      [78.4747, 17.3616],
      [78.4744, 17.4239]
    )
    expect(distance).toBeGreaterThan(6500)
    expect(distance).toBeLessThan(7500)
  })
})

describe('Health & Diagnostic Endpoints', () => {
  it('GET /health returns 200 and operational status', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.service).toBe('EmergencyOS API')
  })
})

describe('Authentication & RBAC Security', () => {
  it('authenticates citizen with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen@emergency.example', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.role).toBe('citizen')
    expect(res.body.data.accessToken).toBeDefined()
    citizenToken = res.body.data.accessToken
  })

  it('rejects login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen@emergency.example', password: 'wrongpassword' })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('authenticates dispatcher', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dispatcher@emergency.example', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('dispatcher')
    dispatcherToken = res.body.data.accessToken
  })

  it('authenticates responder', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'responder@emergency.example', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('responder')
    responderToken = res.body.data.accessToken
    responderId = res.body.data.id
  })

  it('retrieves authenticated profile via /api/auth/me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${citizenToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe('citizen@emergency.example')
  })
})

describe('Incident Lifecycle & Authorization Matrix', () => {
  it('citizen creates a new emergency incident', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        emergencyType: 1,
        severity: 4,
        description: 'Citizen SOS: Cardiac emergency at Begumpet',
        source: [78.4735, 17.4420],
        sourceAddress: 'Prakash Nagar, Begumpet, Hyderabad',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.incidentNumber).toMatch(/^INC-/)
    expect(res.body.data.status).toBe('Reported')
    testIncidentId = res.body.data._id
  })

  it('blocks citizen from acknowledging incident (RBAC enforcement)', async () => {
    const res = await request(app)
      .post(`/api/incidents/${testIncidentId}/acknowledge`)
      .set('Authorization', `Bearer ${citizenToken}`)

    expect(res.status).toBe(403)
  })

  it('allows dispatcher to acknowledge incident', async () => {
    const res = await request(app)
      .post(`/api/incidents/${testIncidentId}/acknowledge`)
      .set('Authorization', `Bearer ${dispatcherToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('Acknowledged')
  })

  it('allows dispatcher to assign an available vehicle to responder', async () => {
    const vRes = await request(app)
      .get('/api/vehicles?status=available')
      .set('Authorization', `Bearer ${dispatcherToken}`)

    expect(vRes.status).toBe(200)
    const availableVehicle = vRes.body.data.vehicles[0]
    expect(availableVehicle).toBeDefined()

    const assignRes = await request(app)
      .post(`/api/incidents/${testIncidentId}/assign`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({
        vehicleId: availableVehicle._id,
        responderId: responderId,
      })

    expect(assignRes.status).toBe(200)
    expect(assignRes.body.data.status).toBe('Assigned')
  })

  it('blocks unassigned responder from accepting or updating incident (SEC-03 Responder Ownership)', async () => {
    const driverRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'driver@emergency.example', password: 'password123' })

    expect(driverRes.status).toBe(200)
    const unassignedToken = driverRes.body.data.accessToken

    const acceptRes = await request(app)
      .post(`/api/incidents/${testIncidentId}/accept`)
      .set('Authorization', `Bearer ${unassignedToken}`)

    expect(acceptRes.status).toBe(403)
    expect(acceptRes.body.message).toMatch(/Forbidden: You are not the assigned responder/)

    const updateRes = await request(app)
      .patch(`/api/incidents/${testIncidentId}/status`)
      .set('Authorization', `Bearer ${unassignedToken}`)
      .send({ status: 'En Route' })

    expect(updateRes.status).toBe(403)
    expect(updateRes.body.message).toMatch(/Forbidden: You are not the assigned responder/)
  })

  it('allows assigned responder to accept the assignment', async () => {
    const res = await request(app)
      .post(`/api/incidents/${testIncidentId}/accept`)
      .set('Authorization', `Bearer ${responderToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('Accepted')
  })

  it('advances status to En Route', async () => {
    const res = await request(app)
      .patch(`/api/incidents/${testIncidentId}/status`)
      .set('Authorization', `Bearer ${responderToken}`)
      .send({ status: 'En Route', note: 'Ambulance dispatched with sirens' })

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('En Route')
  })

  it('blocks citizen from cancelling incident once en route (SEC-03 State Machine Rules)', async () => {
    const res = await request(app)
      .patch(`/api/incidents/${testIncidentId}/status`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ status: 'Cancelled', note: 'False alarm attempt' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/Cannot cancel incident once responder unit is en route/)
  })

  it('advances status to On Scene', async () => {
    const res = await request(app)
      .patch(`/api/incidents/${testIncidentId}/status`)
      .set('Authorization', `Bearer ${responderToken}`)
      .send({ status: 'On Scene', note: 'Arrived at patient location' })

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('On Scene')
  })

  it('resolves incident and releases unit', async () => {
    const res = await request(app)
      .patch(`/api/incidents/${testIncidentId}/status`)
      .set('Authorization', `Bearer ${responderToken}`)
      .send({ status: 'Resolved', summary: 'Patient stabilized and admitted to Gandhi Hospital' })

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('Resolved')
  })
})

describe('Geospatial Facility Discovery', () => {
  it('discovers nearest hospitals using $geoNear', async () => {
    const res = await request(app)
      .get('/api/facilities/nearest?lng=78.4867&lat=17.3850&type=hospital&limit=3')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.facilities.length).toBeGreaterThan(0)
    expect(res.body.data.facilities[0].distanceMeters).toBeDefined()
  })
})

describe('Security Hardening & Regression Suite', () => {
  it('SEC-01: Public registration with role=admin is forced to role=citizen', async () => {
    const testEmail = `sec_test_${Date.now()}@emergency.example`
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Privilege Escalation Tester',
        email: testEmail,
        password: 'Password123!',
        phone: '+91-9999988888',
        role: 'admin',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.role).toBe('citizen')
  })

  it('SEC-02: Refresh token rotation issues new pair and detects replay attack', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen@emergency.example', password: 'password123' })

    const cookies = loginRes.headers['set-cookie'] || []
    const refreshCookie = cookies.find((c: string) => c.startsWith('refreshToken='))
    expect(refreshCookie).toBeDefined()
    const initialRefreshToken = refreshCookie.split(';')[0].split('=')[1]

    // Rotate token
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${initialRefreshToken}`])

    expect(refreshRes.status).toBe(200)
    expect(refreshRes.body.success).toBe(true)
    expect(refreshRes.body.data.accessToken).toBeDefined()

    // Present rotated token again -> Replay attack detection
    const replayRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${initialRefreshToken}`])

    expect(replayRes.status).toBe(401)
    expect(replayRes.body.code).toBe('TOKEN_REPLAY_DETECTED')
  })

  it('GEO-01: Rejects out-of-bounds coordinates (longitude > 180)', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        emergencyType: 1,
        severity: 3,
        description: 'Out of bounds test',
        source: [195.0, 17.4420],
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/Invalid coordinate bounds/)
  })

  it('GEO-01: Rejects out-of-bounds coordinates (latitude > 90)', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        emergencyType: 1,
        severity: 3,
        description: 'Out of bounds test',
        source: [78.4735, 95.0],
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/Invalid coordinate bounds/)
  })

  it('SEC-03: Citizen cannot access or cancel another citizen incident (IDOR Protection)', async () => {
    const citizen2Email = `citizen2_${Date.now()}@emergency.example`
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Citizen Two',
        email: citizen2Email,
        password: 'Password123!',
        phone: '+91-9111122222',
      })
    const citizen2Token = regRes.body.data.accessToken

    // Citizen 2 tries to view testIncidentId created by Citizen 1
    const viewRes = await request(app)
      .get(`/api/incidents/${testIncidentId}`)
      .set('Authorization', `Bearer ${citizen2Token}`)

    expect(viewRes.status).toBe(403)
    expect(viewRes.body.message).toMatch(/Access denied/)

    // Citizen 2 tries to cancel testIncidentId created by Citizen 1
    const cancelRes = await request(app)
      .patch(`/api/incidents/${testIncidentId}/status`)
      .set('Authorization', `Bearer ${citizen2Token}`)
      .send({ status: 'Cancelled' })

    expect(cancelRes.status).toBe(403)
    expect(cancelRes.body.message).toMatch(/Forbidden: You cannot modify incidents created by other citizens/)
  })

  it('SEC-04: Prevents assignment when vehicle is already assigned (Concurrency Double-Lock)', async () => {
    const vRes = await request(app)
      .get('/api/vehicles?status=assigned')
      .set('Authorization', `Bearer ${dispatcherToken}`)

    if (vRes.body.data.vehicles.length > 0) {
      const busyVehicle = vRes.body.data.vehicles[0]

      const incRes = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          emergencyType: 2,
          severity: 3,
          description: 'Fire incident for vehicle lock test',
          source: [78.4800, 17.4000],
        })
      const newIncId = incRes.body.data._id

      const assignRes = await request(app)
        .post(`/api/incidents/${newIncId}/assign`)
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          vehicleId: busyVehicle._id,
          responderId: responderId,
        })

      expect(assignRes.status).toBe(409)
      expect(assignRes.body.message).toMatch(/Vehicle is currently unavailable/)
    }
  })
})
