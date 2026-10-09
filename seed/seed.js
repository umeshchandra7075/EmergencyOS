/**
 * Seed Script - Realistic sample data for Hyderabad area
 * Creates sample users, emergency types, vehicles, facilities, and incidents
 * Runs with: node seed/seed.js
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../src/models/User.model.js'
import EmergencyType from '../src/models/EmergencyType.model.js'
import Vehicle from '../src/models/Vehicle.model.js'
import Facility from '../src/models/Facility.model.js'
import Incident from '../src/models/Incident.model.js'

dotenv.config()

// Hyderabad area coordinates center
const HYDERABAD_CENTER = {
  lat: 17.3850,
  lng: 78.4884,
}

// Helper: Generate random coordinates within a radius of Hyderabad center
function randomCoordsAroundCenter(radiusKm = 10) {
  const earthRadiusKm = 6371
  const radiusRad = radiusKm / earthRadiusKm

  const u = Math.random()
  const v = Math.random()
  const w = radiusRad * Math.sqrt(u)
  const t = 2 * Math.PI * v

  const latOffset = w * (180 / Math.PI)
  const lngOffset = (t * Math.sqrt(1 - w * w) * (180 / Math.PI))

  const lat = HYDERABAD_CENTER.lat + latOffset
  const lng = HYDERABAD_CENTER.lng + lngOffset

  return [lng, lat] // [longitude, latitude] for GeoJSON
}

// Helper: Generate random emergency type
function randomEmergencyType() {
  const types = [1, 2, 3, 4, 5] // MEDICAL, FIRE, POLICE, RESCUE, HAZMAT
  return types[Math.floor(Math.random() * types.length)]
}

// Helper: Generate random severity
function randomSeverity() {
  return Math.floor(Math.random() * 5) + 1 // 1-5
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...')

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency_route_planner')
      console.log('📡 Connected to MongoDB')
    }

    // Clear existing data (optional - comment out to append)
    await User.deleteMany({})
    await EmergencyType.deleteMany({})
    await Vehicle.deleteMany({})
    await Facility.deleteMany({})
    await Incident.deleteMany({})
    console.log('🗑️ Cleared existing data')

    // 1. Create Emergency Types (if not exist)
    console.log('📋 Creating emergency types...')
    const emergencyTypeNames = [
      { name: 'Medical', priority: 1, vehicleType: 'ambulance', specialty: 'trauma' },
      { name: 'Fire', priority: 2, vehicleType: 'fire_engine', specialty: null },
      { name: 'Police', priority: 3, vehicleType: 'patrol_car', specialty: null },
      { name: 'Rescue', priority: 4, vehicleType: 'rescue_vehicle', specialty: null },
      { name: 'Hazmat', priority: 5, vehicleType: 'hazmat_vehicle', specialty: 'chemical' },
    ]

    const createdEmergencyTypes = []
    for (const et of emergencyTypeNames) {
      const exists = await EmergencyType.findOne({ name: et.name })
      if (exists) {
        createdEmergencyTypes.push(exists)
      } else {
        const etDoc = new EmergencyType(et)
        const saved = await etDoc.save()
        createdEmergencyTypes.push(saved)
      }
    }
    console.log(`✅ Created ${createdEmergencyTypes.length} emergency types`)

    // 2. Create Sample Users (Citizens, Dispatcher, Driver, Hospital Staff, Admin)
    console.log('👥 Creating sample users...')

    const citizenUsers = []
    for (let i = 1; i <= 3; i++) {
      const user = new User({
        name: `Citizen ${i}`,
        email: `citizen${i}@example.com`,
        password: 'password123', // Will be hashed by pre-save middleware
        role: 'citizen',
        phone: `+91-98${String(10000000 + i * 100000).slice(1)}`,
      })
      await user.save()
      citizenUsers.push(user)
    }

    const dispatcher = new User({
      name: 'Dispatcher Admin',
      email: 'dispatcher@emergency.example',
      password: 'password123',
      role: 'dispatcher',
      phone: '+91-9811111111',
    })
    await dispatcher.save()

    const driver = new User({
      name: 'Driver Raj',
      email: 'driver@emergency.example',
      password: 'password123',
      role: 'driver',
      phone: '+91-9822222222',
    })
    await driver.save()

    const hospitalStaff = new User({
      name: 'Hospital Matron',
      email: 'hospital@emergency.example',
      password: 'password123',
      role: 'hospital_staff',
      phone: '+91-9833333333',
    })
    await hospitalStaff.save()

    const admin = new User({
      name: 'System Admin',
      email: 'admin@emergency.example',
      password: 'password123',
      role: 'admin',
      phone: '+91-9844444444',
    })
    await admin.save()

    console.log(`✅ Created ${citizenUsers.length + 4} users`)

    // 3. Create Vehicles
    console.log('🚗 Creating vehicles...')

    const vehicleTypes = ['ambulance', 'fire_engine', 'patrol_car', 'rescue_vehicle', 'hazmat_vehicle']
    const vehicles = []

    // Create 5 vehicles - one per type, currently available
    for (let i = 0; i < 5; i++) {
      const loc = randomCoordsAroundCenter(15)
      const vehicle = new Vehicle({
        plateNumber: `EG-${String(100 + i).padStart(3, '0')}`,
        type: vehicleTypes[i],
        currentLocation: {
          type: 'Point',
          coordinates: loc,
        },
        status: 'available',
        driver: driver._id, // Assign driver
      })
      await vehicle.save()
      vehicles.push(vehicle)
    }

    // Create a few more vehicles out of service or en route
    for (let i = 0; i < 3; i++) {
      const loc = randomCoordsAroundCenter(20)
      const vehicle = new Vehicle({
        plateNumber: `EG-${String(105 + i).padStart(3, '0')}`,
        type: vehicleTypes[i % vehicleTypes.length],
        currentLocation: {
          type: 'Point',
          coordinates: loc,
        },
        status: i < 2 ? 'en_route' : 'out_of_service',
      })
      await vehicle.save()
      vehicles.push(vehicle)
    }

    console.log(`✅ Created ${vehicles.length} vehicles`)

    // 4. Create Facilities (Hospitals, Fire Stations, Police Stations)
    console.log('🏥 Creating facilities...')

    const facilities = []

    // Hospitals with varying capacity
    const hospitalNames = ['General Hospital', 'City Hospital', 'Cardiac Center', 'Children\'s Hospital']
    const specialties = ['trauma', 'cardiology', 'pediatrics', 'general']

    for (let i = 0; i < 4; i++) {
      const loc = randomCoordsAroundCenter(12)
      const totalBeds = 100 + i * 50
      const facility = new Facility({
        name: hospitalNames[i],
        type: 'hospital',
        specialty: specialties[i],
        bedCapacity: {
          total: totalBeds,
          available: totalBeds - 20, // Some beds occupied
          icuTotal: 20,
          icuAvailable: 15,
          oxygenTotal: 50,
          oxygenAvailable: 40,
        },
        currentPatientCount: 15 + i * 5,
        location: {
          type: 'Point',
          coordinates: loc,
        },
        isActive: true,
      })
      await facility.save()
      facilities.push(facility)
    }

    // Fire stations
    const fireStationNames = ['Fire Station North', 'Fire Station South', 'Fire Station East']
    for (let i = 0; i < 3; i++) {
      const loc = randomCoordsAroundCenter(15)
      const facility = new Facility({
        name: fireStationNames[i],
        type: 'fire_station',
        location: {
          type: 'Point',
          coordinates: loc,
        },
        isActive: true,
      })
      await facility.save()
      facilities.push(facility)
    }

    // Police stations
    const policeStationNames = ['Police Station Central', 'Police Station West']
    for (let i = 0; i < 2; i++) {
      const loc = randomCoordsAroundCenter(15)
      const facility = new Facility({
        name: policeStationNames[i],
        type: 'police_station',
        location: {
          type: 'Point',
          coordinates: loc,
        },
        isActive: true,
      })
      await facility.save()
      facilities.push(facility)
    }

    console.log(`✅ Created ${facilities.length} facilities`)

    // 5. Create Sample Incidents
    console.log('🚨 Creating sample incidents...')

    const sampleIncidents = [
      {
        citizen: citizenUsers[0]._id,
        emergencyType: 1, // MEDICAL
        severity: 3,
        status: 'Assigned',
        source: {
          type: 'Point',
          coordinates: [78.4800, 17.3700], // Area near Secunderabad
        },
        destination: {
          type: 'Point',
          coordinates: [78.4600, 17.3900], // Near General Hospital
        },
      },
      {
        citizen: citizenUsers[1]._id,
        emergencyType: 2, // FIRE
        severity: 4,
        status: 'En Route',
        source: {
          type: 'Point',
          coordinates: [78.5200, 17.4300], // Near Kukatpally
        },
        destination: null,
      },
      {
        citizen: citizenUsers[2]._id,
        emergencyType: 3, // POLICE
        severity: 2,
        status: 'Reported',
        source: {
          type: 'Point',
          coordinates: [78.4500, 17.3500], // Near Hyderabad Central
        },
        destination: {
          type: 'Point',
          coordinates: [78.4800, 17.4000], // Near Police Commissioner office
        },
      },
    ]

    for (const incData of sampleIncidents) {
      // For medical emergencies, assign nearest hospital with capacity
      let assignedHospital = null
      let assignedVehicle = null
      let route = null

      if (incData.emergencyType === 1) {
        // Find nearest hospital
        const hospitals = await Facility.find({
          type: 'hospital',
          isActive: true,
          'bedCapacity.available': { $gt: 0 },
        })

        if (hospitals.length > 0) {
          // Use first hospital with capacity
          const hospital = hospitals[0]
          assignedHospital = hospital._id

          // Decrement available beds
          await Facility.findByIdAndUpdate(hospital._id, {
            $inc: { 'bedCapacity.available': -1 },
          })
        }
      }

      const incident = new Incident({
        ...incData,
        citizen: incData.citizen,
        hospital: assignedHospital,
        status: incData.status,
      })

      // Plan route if source and destination have coordinates
      const sourceCoords = incData.source?.coordinates
      const destCoords = incData.destination?.coordinates

      if (sourceCoords && destCoords) {
        route = await getRoute(sourceCoords, destCoords, incData.emergencyType)

        if (route && route.alternatives && route.alternatives.length > 0) {
          incident.currentRoute = {
            osrmTripId: `trip_${incident._id}`,
            distance: route.distance,
            duration: route.duration,
            alternatives: route.alternatives.map((alt: any) => ({
              distance: alt.distance,
              duration: alt.duration,
              path: alt.path,
              hazardScore: alt.hazardScore,
            })),
            hazardPenalty: route.hazardPenalty,
            createdAt: new Date(),
          }
        }
      }

      await incident.save()

      // Log audit
      await logIncientCreate({
        incidentId: incident._id.toString(),
        createdBy: incData.citizen.toString(),
        role: 'citizen',
      })
    }

    console.log(`✅ Created ${sampleIncidents.length} sample incidents`)

    // 6. Create Sample Hazards
    console.log('⚠️ Creating sample hazards...')

    const sampleHazards = [
      {
        type: 'road_block',
        description: 'Accident on NH65 - lane closure',
        coordinates: [78.4900, 17.3950],
        radius: 150,
      },
      {
        type: 'construction',
        description: 'Road construction near Miyapur',
        coordinates: [78.5100, 17.4500],
        radius: 200,
      },
    ]

    for (const hd of sampleHazards) {
      const hazard = new Hazard(hd)
      await hazard.save()
    }

    console.log(`✅ Created ${sampleHazards.length} sample hazards`)

    console.log('🌱 Database seeding complete!')
    console.log('\nSample login credentials:')
    console.log('  Citizen: citizen1@example.com / password123')
    console.log('  Dispatcher: dispatcher@emergency.example / password123')
    console.log('  Driver: driver@emergency.example / password123')
    console.log('  Hospital: hospital@emergency.example / password123')
    console.log('  Admin: admin@emergency.example / password123')

    // Disconnect
    mongoose.connection.close()
    console.log('👋 MongoDB connection closed')

  } catch (error: any) {
    console.error('❌ Seeding error:', error)
    process.exit(1)
  }
}

// Run seed
seedDatabase()