import { Request, Response } from 'express'
import Facility from '../models/Facility.js'
import { AuthenticatedRequest } from '../middleware/auth.js'
import { broadcastFacilityUpdated } from '../services/socketService.js'
import { logAudit } from '../services/auditService.js'

export async function getFacilities(req: Request, res: Response) {
  try {
    const { type, specialty, isActive } = req.query
    const query: any = {}
    if (type) query.type = type
    if (specialty) query.specialty = specialty
    if (isActive !== undefined) query.isActive = isActive === 'true'

    const facilities = await Facility.find(query).sort({ name: 1 })
    return res.json({ success: true, data: { facilities } })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function getNearestFacilities(req: Request, res: Response) {
  try {
    const { lng, lat, type, maxDistance = 25000, limit = 5 } = req.query

    if (!lng || !lat) {
      return res.status(400).json({
        success: false,
        message: 'Longitude (lng) and Latitude (lat) query parameters are required.',
      })
    }

    const longitude = parseFloat(lng as string)
    const latitude = parseFloat(lat as string)

    if (
      isNaN(longitude) ||
      isNaN(latitude) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinate bounds. Longitude must be between -180 and 180, Latitude between -90 and 90.',
      })
    }

    const matchQuery: any = { isActive: true }
    if (type) matchQuery.type = type

    const facilities = await Facility.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distanceMeters',
          maxDistance: parseInt(maxDistance as string, 10),
          spherical: true,
          query: matchQuery,
        },
      },
      { $limit: parseInt(limit as string, 10) },
    ])

    return res.json({ success: true, data: { facilities } })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function updateBedCapacity(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params
    const { bedCapacity, currentPatientCount } = req.body

    const facility = await Facility.findById(id)
    if (!facility) {
      return res.status(404).json({ success: false, message: 'Facility not found.' })
    }

    const previousCapacity = { ...facility.bedCapacity }

    if (bedCapacity) {
      facility.bedCapacity = {
        ...facility.bedCapacity,
        ...bedCapacity,
      }
    }

    if (currentPatientCount !== undefined) {
      facility.currentPatientCount = currentPatientCount
    }

    await facility.save()
    broadcastFacilityUpdated(facility)

    await logAudit({
      action: 'FACILITY_CAPACITY_UPDATED',
      entityType: 'Facility',
      entityId: facility._id,
      actorId: req.user?._id,
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      previousState: previousCapacity,
      newState: facility.bedCapacity,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return res.json({
      success: true,
      message: 'Facility capacity updated successfully.',
      data: facility,
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function createFacility(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, type, specialty, bedCapacity, location, address, contactPhone } = req.body

    const facility = new Facility({
      name,
      type,
      specialty,
      bedCapacity,
      location: {
        type: 'Point',
        coordinates: location?.coordinates || [78.4867, 17.3850],
      },
      address,
      contactPhone,
      isActive: true,
    })

    await facility.save()
    return res.status(201).json({ success: true, message: 'Facility created.', data: facility })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}
