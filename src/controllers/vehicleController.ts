import { Request, Response } from 'express'
import Vehicle from '../models/Vehicle.js'
import { AuthenticatedRequest } from '../middleware/auth.js'
import { VehicleStatus } from '../config/constants.js'
import { getIO } from '../services/socketService.js'

export async function getVehicles(req: Request, res: Response) {
  try {
    const { status, type } = req.query
    const query: any = {}
    if (status) query.status = status
    if (type) query.type = type

    const vehicles = await Vehicle.find(query).populate('driver', 'name email phone role').sort({ createdAt: -1 })
    return res.json({ success: true, data: { vehicles } })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function getVehicleById(req: Request, res: Response) {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('driver', 'name email phone role')
      .populate('currentIncident')
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' })
    }
    return res.json({ success: true, data: vehicle })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function updateVehicleLocation(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params
    const { latitude, longitude, heading = 0, speed = 0, status } = req.body

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude are required.',
      })
    }

    const updateFields: any = {
      currentLocation: {
        type: 'Point',
        coordinates: [longitude, latitude], // GeoJSON [lng, lat]
      },
      heading,
      speed,
      lastActiveAt: new Date(),
    }

    if (status && Object.values(VehicleStatus).includes(status)) {
      updateFields.status = status
    }

    const vehicle = await Vehicle.findByIdAndUpdate(id, updateFields, { new: true })
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' })
    }

    // Broadcast location update
    try {
      const io = getIO()
      io.to('role:dispatcher').emit('vehicle:location_broadcast', {
        vehicleId: vehicle._id,
        coordinates: [longitude, latitude],
        heading,
        speed,
        status: vehicle.status,
        timestamp: new Date(),
      })
    } catch (e) {
      // socket might be uninitialized in some test scenarios
    }

    return res.json({ success: true, message: 'Location updated.', data: vehicle })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function createVehicle(req: AuthenticatedRequest, res: Response) {
  try {
    const { plateNumber, type, driverId, coordinates } = req.body

    const existing = await Vehicle.findOne({ plateNumber: plateNumber.toUpperCase().trim() })
    if (existing) {
      return res.status(409).json({ success: false, message: 'Plate number already registered.' })
    }

    const vehicle = new Vehicle({
      plateNumber: plateNumber.toUpperCase().trim(),
      type,
      driver: driverId || req.user?._id,
      currentLocation: {
        type: 'Point',
        coordinates: coordinates || [78.4867, 17.3850], // Default Hyderabad if not given
      },
      status: VehicleStatus.AVAILABLE,
    })

    await vehicle.save()
    return res.status(201).json({ success: true, message: 'Vehicle added successfully.', data: vehicle })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}
