import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../src/models/User.js'
import EmergencyType from '../src/models/EmergencyType.js'
import Vehicle from '../src/models/Vehicle.js'
import Facility from '../src/models/Facility.js'
import Hazard from '../src/models/Hazard.js'
import Incident from '../src/models/Incident.js'
import { UserRole, IncidentStatus, VehicleStatus, VehicleType, FacilityType } from '../src/config/constants.js'
import { calculateRoute } from '../src/services/routingService.js'

dotenv.config()

const HYDERABAD_CENTER = {
  lat: 17.3850,
  lng: 78.4867,
}

function randomCoordsAround(centerLat: number, centerLng: number, radiusKm = 8): [number, number] {
  const earthRadiusKm = 6371
  const radiusRad = radiusKm / earthRadiusKm

  const u = Math.random()
  const v = Math.random()
  const w = radiusRad * Math.sqrt(u)
  const t = 2 * Math.PI * v

  const latOffset = w * (180 / Math.PI)
  const lngOffset = (t * Math.sqrt(1 - w * w) * (180 / Math.PI))

  const lat = parseFloat((centerLat + latOffset).toFixed(5))
  const lng = parseFloat((centerLng + lngOffset).toFixed(5))

  return [lng, lat] // [longitude, latitude] for GeoJSON
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting EmergencyOS Database Seeding...')
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/emergency_route_planner'
    await mongoose.connect(uri)
    console.log('📡 Connected to MongoDB:', uri)

    // Clear existing data
    await User.deleteMany({})
    await EmergencyType.deleteMany({})
    await Vehicle.deleteMany({})
    await Facility.deleteMany({})
    await Hazard.deleteMany({})
    await Incident.deleteMany({})
    console.log('🗑️ Cleared existing records')

    // 1. Emergency Types
    console.log('📋 Creating Emergency Types...')
    const emergencyTypes = [
      { name: 'Medical Emergency', priority: 1, vehicleType: VehicleType.AMBULANCE, specialty: 'trauma', description: 'Immediate medical distress, cardiac arrest, accidents' },
      { name: 'Fire Emergency', priority: 2, vehicleType: VehicleType.FIRE_ENGINE, specialty: null, description: 'Structure fire, electrical fire, chemical hazard' },
      { name: 'Police Assistance', priority: 3, vehicleType: VehicleType.PATROL_CAR, specialty: null, description: 'Active crime, public safety, traffic disruption' },
      { name: 'Rescue Operation', priority: 4, vehicleType: VehicleType.RESCUE_VEHICLE, specialty: null, description: 'Building collapse, disaster evacuation, trench rescue' },
      { name: 'Hazmat Incident', priority: 5, vehicleType: VehicleType.HAZMAT_VEHICLE, specialty: 'chemical', description: 'Toxic chemical leak, biohazard, radiation' },
    ]
    await EmergencyType.insertMany(emergencyTypes)
    console.log(`✅ Created ${emergencyTypes.length} emergency types`)

    // 2. Facilities (Hospitals, Fire Stations, Police Stations)
    console.log('🏥 Creating Facilities...')
    const hospitals = [
      {
        name: 'Gandhi General Hospital',
        type: FacilityType.HOSPITAL,
        specialty: 'trauma',
        bedCapacity: { total: 450, available: 82, icuTotal: 60, icuAvailable: 14, oxygenTotal: 180, oxygenAvailable: 95 },
        currentPatientCount: 368,
        location: { type: 'Point', coordinates: [78.5034, 17.4243] }, // Secunderabad / Musheerabad
        address: 'Musheerabad, Padmarao Nagar, Secunderabad',
        contactPhone: '+91-40-27505566',
      },
      {
        name: 'Apollo Hospital Jubilee Hills',
        type: FacilityType.HOSPITAL,
        specialty: 'cardiology',
        bedCapacity: { total: 350, available: 64, icuTotal: 50, icuAvailable: 11, oxygenTotal: 140, oxygenAvailable: 78 },
        currentPatientCount: 286,
        location: { type: 'Point', coordinates: [78.4116, 17.4265] }, // Jubilee Hills
        address: 'Road No 72, Opposite Bharatiya Vidya Bhavan, Jubilee Hills',
        contactPhone: '+91-40-23607777',
      },
      {
        name: 'Yashoda Hospital Somajiguda',
        type: FacilityType.HOSPITAL,
        specialty: 'neurology',
        bedCapacity: { total: 300, available: 45, icuTotal: 40, icuAvailable: 8, oxygenTotal: 120, oxygenAvailable: 62 },
        currentPatientCount: 255,
        location: { type: 'Point', coordinates: [78.4578, 17.4259] }, // Somajiguda
        address: 'Raj Bhavan Road, Somajiguda, Hyderabad',
        contactPhone: '+91-40-45674567',
      },
      {
        name: 'KIMS Hospital Begumpet',
        type: FacilityType.HOSPITAL,
        specialty: 'pediatrics',
        bedCapacity: { total: 280, available: 53, icuTotal: 35, icuAvailable: 12, oxygenTotal: 110, oxygenAvailable: 50 },
        currentPatientCount: 227,
        location: { type: 'Point', coordinates: [78.4802, 17.4375] }, // Begumpet
        address: '1-8-31/1, Minister Road, Krishna Nagar Colony, Begumpet',
        contactPhone: '+91-40-44885000',
      },
    ]

    const fireStations = [
      {
        name: 'Secunderabad Central Fire Station',
        type: FacilityType.FIRE_STATION,
        bedCapacity: { total: 0, available: 0, icuTotal: 0, icuAvailable: 0, oxygenTotal: 0, oxygenAvailable: 0 },
        currentPatientCount: 0,
        location: { type: 'Point', coordinates: [78.4988, 17.4399] },
        address: 'Clock Tower Road, Secunderabad',
        contactPhone: '+91-40-27802101',
      },
      {
        name: 'Banjara Hills Fire Station',
        type: FacilityType.FIRE_STATION,
        bedCapacity: { total: 0, available: 0, icuTotal: 0, icuAvailable: 0, oxygenTotal: 0, oxygenAvailable: 0 },
        currentPatientCount: 0,
        location: { type: 'Point', coordinates: [78.4344, 17.4156] },
        address: 'Road No 12, Banjara Hills, Hyderabad',
        contactPhone: '+91-40-23391101',
      },
    ]

    const policeStations = [
      {
        name: 'Hyderabad Central Police Commissionerate',
        type: FacilityType.POLICE_STATION,
        bedCapacity: { total: 0, available: 0, icuTotal: 0, icuAvailable: 0, oxygenTotal: 0, oxygenAvailable: 0 },
        currentPatientCount: 0,
        location: { type: 'Point', coordinates: [78.4744, 17.3995] },
        address: 'Basheerbagh, Hyderabad',
        contactPhone: '+91-40-27852435',
      },
      {
        name: 'Cyberabad Police Commissionerate',
        type: FacilityType.POLICE_STATION,
        bedCapacity: { total: 0, available: 0, icuTotal: 0, icuAvailable: 0, oxygenTotal: 0, oxygenAvailable: 0 },
        currentPatientCount: 0,
        location: { type: 'Point', coordinates: [78.3725, 17.4326] },
        address: 'Gachibowli, Hyderabad',
        contactPhone: '+91-40-27853400',
      },
    ]

    const createdHospitals = await Facility.insertMany(hospitals)
    const createdFire = await Facility.insertMany(fireStations)
    const createdPolice = await Facility.insertMany(policeStations)
    console.log(`✅ Created ${createdHospitals.length + createdFire.length + createdPolice.length} facilities`)

    // 3. Users with RBAC roles
    console.log('👥 Creating Users...')
    const citizenUser = new User({
      name: 'Ramesh Sharma',
      email: 'citizen@emergency.example',
      password: 'password123',
      role: UserRole.CITIZEN,
      phone: '+91-9848011223',
    })
    await citizenUser.save()

    const dispatcherUser = new User({
      name: 'Priya Deshmukh',
      email: 'dispatcher@emergency.example',
      password: 'password123',
      role: UserRole.DISPATCHER,
      phone: '+91-9848022334',
    })
    await dispatcherUser.save()

    const responderUser = new User({
      name: 'Captain Vikram Singh',
      email: 'responder@emergency.example',
      password: 'password123',
      role: UserRole.RESPONDER,
      phone: '+91-9848033445',
    })
    await responderUser.save()

    const driverUser = new User({
      name: 'Suresh Kumar',
      email: 'driver@emergency.example',
      password: 'password123',
      role: UserRole.DRIVER,
      phone: '+91-9848044556',
    })
    await driverUser.save()

    const hospitalStaffUser = new User({
      name: 'Dr. Ananya Rao',
      email: 'hospital@emergency.example',
      password: 'password123',
      role: UserRole.HOSPITAL_STAFF,
      facility: createdHospitals[0]._id,
      phone: '+91-9848055667',
    })
    await hospitalStaffUser.save()

    const adminUser = new User({
      name: 'Chief Architect Admin',
      email: 'admin@emergency.example',
      password: 'password123',
      role: UserRole.ADMIN,
      phone: '+91-9848099999',
    })
    await adminUser.save()
    console.log('✅ Created 6 RBAC users')

    // 4. Vehicles
    console.log('🚑 Creating Vehicles...')
    const vehiclesData = [
      { plateNumber: 'TS-09-EM-1001', type: VehicleType.AMBULANCE, status: VehicleStatus.AVAILABLE, driver: responderUser._id, coordinates: [78.4750, 17.4100], heading: 45, speed: 0 },
      { plateNumber: 'TS-09-EM-1002', type: VehicleType.AMBULANCE, status: VehicleStatus.AVAILABLE, driver: driverUser._id, coordinates: [78.4920, 17.4310], heading: 90, speed: 0 },
      { plateNumber: 'TS-09-FR-2001', type: VehicleType.FIRE_ENGINE, status: VehicleStatus.AVAILABLE, coordinates: [78.4988, 17.4399], heading: 0, speed: 0 },
      { plateNumber: 'TS-09-PC-3001', type: VehicleType.PATROL_CAR, status: VehicleStatus.AVAILABLE, coordinates: [78.4744, 17.3995], heading: 180, speed: 0 },
      { plateNumber: 'TS-09-RC-4001', type: VehicleType.RESCUE_VEHICLE, status: VehicleStatus.AVAILABLE, coordinates: [78.4344, 17.4156], heading: 270, speed: 0 },
      { plateNumber: 'TS-09-HZ-5001', type: VehicleType.HAZMAT_VEHICLE, status: VehicleStatus.AVAILABLE, coordinates: [78.4578, 17.4259], heading: 120, speed: 0 },
    ]

    const createdVehicles = []
    for (const v of vehiclesData) {
      const veh = new Vehicle({
        plateNumber: v.plateNumber,
        type: v.type,
        status: v.status,
        driver: v.driver,
        currentLocation: { type: 'Point', coordinates: v.coordinates },
        heading: v.heading,
        speed: v.speed,
        batteryOrFuelLevel: 95,
      })
      await veh.save()
      createdVehicles.push(veh)
    }
    console.log(`✅ Created ${createdVehicles.length} fleet vehicles`)

    // Link vehicle to responder
    responderUser.vehicle = createdVehicles[0]._id as any
    await responderUser.save()
    driverUser.vehicle = createdVehicles[1]._id as any
    await driverUser.save()

    // 5. Road Hazards
    console.log('⚠️ Creating Road Hazards...')
    const hazards = [
      {
        title: 'Begumpet Flyover Repair Work',
        description: 'Single lane closed for structural resurfacing',
        type: 'construction',
        severity: 3,
        location: { type: 'Point', coordinates: [78.4720, 17.4410] },
        radiusMeters: 250,
      },
      {
        title: 'Tank Bund Road Waterlogging',
        description: 'Monsoon water accumulation causing slow movement',
        type: 'flooding',
        severity: 4,
        location: { type: 'Point', coordinates: [78.4740, 17.4230] },
        radiusMeters: 300,
      },
    ]
    await Hazard.insertMany(hazards)
    console.log(`✅ Created ${hazards.length} road hazards`)

    // 6. Sample Incidents with Routes
    console.log('🚨 Creating Sample Incidents...')
    const incidentCoords: [number, number] = [78.4680, 17.4050] // Near Lakdikapul
    const hospitalCoords: [number, number] = createdHospitals[0].location.coordinates

    // Calculate real route
    console.log('🗺️ Calculating initial OSRM emergency route...')
    const route = await calculateRoute(incidentCoords, hospitalCoords)

    const sampleIncident = new Incident({
      incidentNumber: 'INC-2026-0001',
      citizen: citizenUser._id,
      contactPhone: citizenUser.phone,
      emergencyType: 1, // Medical
      severity: 4,
      description: 'Severe vehicular accident with multiple injuries near Lakdikapul Junction',
      source: { type: 'Point', coordinates: incidentCoords },
      sourceAddress: 'Lakdikapul Metro Station, Saifabad, Hyderabad',
      destination: { type: 'Point', coordinates: hospitalCoords },
      destinationAddress: createdHospitals[0].address,
      hospital: createdHospitals[0]._id,
      assignedVehicle: createdVehicles[0]._id,
      assignedResponder: responderUser._id,
      status: IncidentStatus.ASSIGNED,
      currentRoute: route,
      acknowledgedAt: new Date(Date.now() - 1000 * 60 * 12),
      acknowledgedBy: dispatcherUser._id,
      assignedAt: new Date(Date.now() - 1000 * 60 * 8),
      timeline: [
        {
          status: IncidentStatus.REPORTED,
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
          actor: citizenUser._id,
          actorRole: UserRole.CITIZEN,
          note: 'Emergency reported via Mobile SOS',
        },
        {
          status: IncidentStatus.ACKNOWLEDGED,
          timestamp: new Date(Date.now() - 1000 * 60 * 12),
          actor: dispatcherUser._id,
          actorRole: UserRole.DISPATCHER,
          note: 'Triaged as Critical Code 1 Medical Emergency',
        },
        {
          status: IncidentStatus.ASSIGNED,
          timestamp: new Date(Date.now() - 1000 * 60 * 8),
          actor: dispatcherUser._id,
          actorRole: UserRole.DISPATCHER,
          note: `Assigned Ambulance unit ${createdVehicles[0].plateNumber}`,
        },
      ],
    })
    await sampleIncident.save()

    // Mark vehicle assigned
    createdVehicles[0].status = VehicleStatus.ASSIGNED
    createdVehicles[0].currentIncident = sampleIncident._id as any
    await createdVehicles[0].save()

    console.log(`✅ Created active incident ${sampleIncident.incidentNumber}`)
    console.log('🎉 Seeding completed successfully!')
    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('❌ Seeding failed:', err)
    process.exit(1)
  }
}

seedDatabase()
