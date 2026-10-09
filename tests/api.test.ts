import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../src/app.js'
import { config } from '../src/config/env.js'
import { calculateHaversineDistanceMeters } from '../src/services/routingService.js'

let citizenToken = ''
let dispatcherToken = ''
let responderToken = ''
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

  it('allows dispatcher to assign an available vehicle', async () => {
    // Get available vehicles
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
        responderId: availableVehicle.driver?._id || availableVehicle.driver,
      })

    expect(assignRes.status).toBe(200)
    expect(assignRes.body.data.status).toBe('Assigned')
  })

  it('allows responder to accept the assignment', async () => {
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
