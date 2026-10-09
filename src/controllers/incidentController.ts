import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.js'
import Incident from '../models/Incident.js'
import Vehicle from '../models/Vehicle.js'
import Facility from '../models/Facility.js'
import { IncidentStatus, UserRole, PERMITTED_STATUS_TRANSITIONS, VehicleStatus } from '../config/constants.js'
import { calculateRoute } from '../services/routingService.js'
import {
  broadcastIncidentCreated,
  broadcastIncidentUpdated,
  broadcastIncidentAssigned,
} from '../services/socketService.js'
import { logAudit } from '../services/auditService.js'

function generateIncidentNumber(): string {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `INC-${dateStr}-${randomSuffix}`
}

export async function createIncident(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user!
    const {
      emergencyType,
      severity,
      description,
      source, // { type: 'Point', coordinates: [lng, lat] } or [lng, lat]
      sourceAddress,
      destination,
      destinationAddress,
      contactPhone,
    } = req.body

    // Parse source coordinates
    let sourceCoords: [number, number]
    if (Array.isArray(source)) {
      sourceCoords = [source[0], source[1]]
    } else if (source?.coordinates && Array.isArray(source.coordinates)) {
      sourceCoords = [source.coordinates[0], source.coordinates[1]]
    } else {
      return res.status(400).json({
        success: false,
        message: 'Valid source coordinates [longitude, latitude] are required.',
      })
    }

    // GEO-01: Coordinate bounds validation
    if (
      typeof sourceCoords[0] !== 'number' ||
      typeof sourceCoords[1] !== 'number' ||
      isNaN(sourceCoords[0]) ||
      isNaN(sourceCoords[1]) ||
      sourceCoords[0] < -180 ||
      sourceCoords[0] > 180 ||
      sourceCoords[1] < -90 ||
      sourceCoords[1] > 90
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinate bounds. Longitude must be between -180 and 180, Latitude between -90 and 90.',
      })
    }

    // Auto-locate nearest hospital if medical emergency and destination is not provided
    let assignedHospitalId: any = null
    let targetDestCoords: [number, number] | null = null

    if (destination?.coordinates && Array.isArray(destination.coordinates)) {
      targetDestCoords = [destination.coordinates[0], destination.coordinates[1]]
    } else if (Array.isArray(destination)) {
      targetDestCoords = [destination[0], destination[1]]
    }

    if (emergencyType === 1 || String(emergencyType).toLowerCase().includes('medical')) {
      const nearestHospitals = await Facility.find({
        type: 'hospital',
        isActive: true,
        'bedCapacity.available': { $gt: 0 },
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: sourceCoords },
            $maxDistance: 50000, // 50km
          },
        },
      }).limit(1)

      if (nearestHospitals.length > 0) {
        assignedHospitalId = nearestHospitals[0]._id
        if (!targetDestCoords) {
          targetDestCoords = nearestHospitals[0].location.coordinates
        }
      }
    }

    // Calculate initial route if destination is available
    let initialRoute = undefined
    if (targetDestCoords) {
      initialRoute = await calculateRoute(sourceCoords, targetDestCoords)
    }

    const incidentNumber = generateIncidentNumber()

    const incident = new Incident({
      incidentNumber,
      citizen: user._id,
      contactPhone: contactPhone || user.phone,
      emergencyType: emergencyType || 1,
      severity: severity || 3,
      description: description || 'Emergency report submitted',
      source: {
        type: 'Point',
        coordinates: sourceCoords,
      },
      sourceAddress,
      destination: targetDestCoords
        ? { type: 'Point', coordinates: targetDestCoords }
        : undefined,
      destinationAddress,
      hospital: assignedHospitalId,
      status: IncidentStatus.REPORTED,
      currentRoute: initialRoute,
      timeline: [
        {
          status: IncidentStatus.REPORTED,
          timestamp: new Date(),
          actor: user._id,
          actorRole: user.role,
          note: 'Incident reported by citizen',
        },
      ],
    })

    await incident.save()

    // Real-time broadcast to dispatchers and admins
    broadcastIncidentCreated(incident)

    // Audit log
    await logAudit({
      action: 'INCIDENT_CREATED',
      entityType: 'Incident',
      entityId: incident._id,
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      newState: { incidentNumber, status: incident.status, sourceCoords },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return res.status(201).json({
      success: true,
      message: 'Incident reported successfully.',
      data: incident,
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function getIncidents(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user!
    const { status, severity, emergencyType, search, page = '1', limit = '20' } = req.query

    const query: any = {}

    // Role-based access restriction
    if (user.role === UserRole.CITIZEN) {
      query.citizen = user._id
    } else if (user.role === UserRole.RESPONDER || user.role === UserRole.DRIVER) {
      query.assignedResponder = user._id
    } else if (user.role === UserRole.HOSPITAL_STAFF && user.facility) {
      query.hospital = user.facility
    }

    if (status) {
      query.status = status
    }
    if (severity) {
      query.severity = Number(severity)
    }
    if (emergencyType) {
      query.emergencyType = emergencyType
    }
    if (search) {
      query.$or = [
        { incidentNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sourceAddress: { $regex: search, $options: 'i' } },
      ]
    }

    const pageNum = Math.max(1, parseInt(page as string, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)))
    const skip = (pageNum - 1) * limitNum

    const [incidents, total] = await Promise.all([
      Incident.find(query)
        .populate('citizen', 'name email phone')
        .populate('hospital', 'name specialty bedCapacity location contactPhone')
        .populate({
          path: 'assignedVehicle',
          populate: { path: 'driver', select: 'name email phone' },
        })
        .populate('assignedResponder', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Incident.countDocuments(query),
    ])

    return res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function getIncidentById(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user!
    const { id } = req.params

    const incident = await Incident.findById(id)
      .populate('citizen', 'name email phone')
      .populate('hospital', 'name specialty bedCapacity location contactPhone')
      .populate({
        path: 'assignedVehicle',
        populate: { path: 'driver', select: 'name email phone' },
      })
      .populate('assignedResponder', 'name email phone')
      .populate('timeline.actor', 'name email role')

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' })
    }

    // Role verification
    if (user.role === UserRole.CITIZEN && String(incident.citizen._id || incident.citizen) !== String(user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this incident.',
      })
    }

    return res.json({ success: true, data: incident })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function acknowledgeIncident(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user!
    const { id } = req.params

    const incident = await Incident.findById(id)
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' })
    }

    if (incident.status !== IncidentStatus.REPORTED) {
      return res.status(400).json({
        success: false,
        message: `Cannot acknowledge incident in '${incident.status}' state. Must be in '${IncidentStatus.REPORTED}'.`,
      })
    }

    incident.status = IncidentStatus.ACKNOWLEDGED
    incident.acknowledgedAt = new Date()
    incident.acknowledgedBy = user._id
    incident.timeline.push({
      status: IncidentStatus.ACKNOWLEDGED,
      timestamp: new Date(),
      actor: user._id,
      actorRole: user.role,
      note: 'Incident acknowledged and triaged by dispatcher',
    })

    await incident.save()
    broadcastIncidentUpdated(incident)

    await logAudit({
      action: 'INCIDENT_ACKNOWLEDGED',
      entityType: 'Incident',
      entityId: incident._id,
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return res.json({
      success: true,
      message: 'Incident acknowledged successfully.',
      data: incident,
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function assignIncident(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user!
    const { id } = req.params
    const { vehicleId, responderId } = req.body

    const incident = await Incident.findById(id)
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' })
    }

    // Pre-check incident state before vehicle lock
    if (![IncidentStatus.REPORTED, IncidentStatus.ACKNOWLEDGED].includes(incident.status)) {
      return res.status(400).json({
        success: false,
        message: `Incident is in '${incident.status}' state and cannot be assigned.`,
      })
    }

    // Atomic assignment check on vehicle: vehicle must be available
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: vehicleId, status: VehicleStatus.AVAILABLE },
      {
        status: VehicleStatus.ASSIGNED,
        currentIncident: incident._id,
      },
      { new: true }
    )

    if (!vehicle) {
      return res.status(409).json({
        success: false,
        message: 'Vehicle is currently unavailable or assigned to another incident.',
      })
    }

    // Calculate route from vehicle's current location to incident location
    let routeToIncident = incident.currentRoute
    if (vehicle.currentLocation?.coordinates && incident.source?.coordinates) {
      try {
        routeToIncident = await calculateRoute(
          vehicle.currentLocation.coordinates,
          incident.source.coordinates
        )
      } catch (e) {
        console.warn('Failed to calculate vehicle dispatch route:', e)
      }
    }

    // SEC-04: Atomic Incident-Vehicle Double-Lock
    // Atomically transition the incident only if it remains in assignable state
    const updatedIncident = await Incident.findOneAndUpdate(
      {
        _id: id,
        status: { $in: [IncidentStatus.REPORTED, IncidentStatus.ACKNOWLEDGED] },
      },
      {
        $set: {
          status: IncidentStatus.ASSIGNED,
          assignedVehicle: vehicle._id,
          assignedResponder: responderId || vehicle.driver,
          assignedAt: new Date(),
          currentRoute: routeToIncident,
        },
        $push: {
          timeline: {
            status: IncidentStatus.ASSIGNED,
            timestamp: new Date(),
            actor: user._id,
            actorRole: user.role,
            note: `Assigned to unit ${vehicle.plateNumber}`,
          },
        },
      },
      { new: true }
    )

    if (!updatedIncident) {
      // Concurrency conflict: incident was assigned by another dispatcher. Rollback vehicle!
      await Vehicle.findByIdAndUpdate(vehicleId, {
        status: VehicleStatus.AVAILABLE,
        $unset: { currentIncident: 1 },
      })
      return res.status(409).json({
        success: false,
        message: 'Concurrent assignment conflict: Incident has already transitioned to another state.',
      })
    }

    // Populate for clean response
    await updatedIncident.populate('assignedVehicle')
    await updatedIncident.populate('assignedResponder', 'name email phone')

    broadcastIncidentAssigned(updatedIncident, String(updatedIncident.assignedResponder))
    broadcastIncidentUpdated(updatedIncident)

    await logAudit({
      action: 'INCIDENT_ASSIGNED',
      entityType: 'Incident',
      entityId: updatedIncident._id,
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      newState: { vehicleId, responderId: updatedIncident.assignedResponder },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return res.json({
      success: true,
      message: 'Responder assigned successfully.',
      data: updatedIncident,
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function acceptIncident(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user!
    const { id } = req.params

    const incident = await Incident.findById(id)
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' })
    }

    // SEC-03: Responder ownership enforcement
    if (
      user.role !== UserRole.ADMIN &&
      String(incident.assignedResponder) !== String(user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not the assigned responder for this incident.',
      })
    }

    if (incident.status !== IncidentStatus.ASSIGNED) {
      return res.status(400).json({
        success: false,
        message: `Cannot accept incident in '${incident.status}' state. Must be '${IncidentStatus.ASSIGNED}'.`,
      })
    }

    incident.status = IncidentStatus.ACCEPTED
    incident.acceptedAt = new Date()
    incident.timeline.push({
      status: IncidentStatus.ACCEPTED,
      timestamp: new Date(),
      actor: user._id,
      actorRole: user.role,
      note: 'Assignment accepted by responder unit',
    })

    await incident.save()
    broadcastIncidentUpdated(incident)

    await logAudit({
      action: 'INCIDENT_ACCEPTED',
      entityType: 'Incident',
      entityId: incident._id,
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return res.json({
      success: true,
      message: 'Assignment accepted.',
      data: incident,
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function rejectIncident(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user!
    const { id } = req.params
    const { reason } = req.body

    const incident = await Incident.findById(id)
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' })
    }

    // SEC-03: Responder ownership enforcement
    if (
      user.role !== UserRole.ADMIN &&
      String(incident.assignedResponder) !== String(user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not the assigned responder for this incident.',
      })
    }

    if (incident.status !== IncidentStatus.ASSIGNED) {
      return res.status(400).json({
        success: false,
        message: `Cannot reject incident in '${incident.status}' state.`,
      })
    }

    // Release assigned vehicle back to available
    if (incident.assignedVehicle) {
      await Vehicle.findByIdAndUpdate(incident.assignedVehicle, {
        status: VehicleStatus.AVAILABLE,
        $unset: { currentIncident: 1 },
      })
    }

    incident.status = IncidentStatus.ACKNOWLEDGED // Re-queued for dispatcher assignment
    incident.rejectionReason = reason || 'Declined by responder unit'
    incident.assignedVehicle = undefined
    incident.assignedResponder = undefined

    incident.timeline.push({
      status: IncidentStatus.ACKNOWLEDGED,
      timestamp: new Date(),
      actor: user._id,
      actorRole: user.role,
      note: `Assignment rejected: ${reason || 'Unit unavailable'}`,
    })

    await incident.save()
    broadcastIncidentUpdated(incident)

    await logAudit({
      action: 'INCIDENT_REJECTED',
      entityType: 'Incident',
      entityId: incident._id,
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      details: reason,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return res.json({
      success: true,
      message: 'Assignment rejected. Incident re-queued for dispatch.',
      data: incident,
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function updateIncidentStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user!
    const { id } = req.params
    const { status: targetStatus, note, summary } = req.body

    const incident = await Incident.findById(id)
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' })
    }

    // SEC-03: Authorization & Ownership Validation
    if (user.role === UserRole.CITIZEN) {
      if (String(incident.citizen) !== String(user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You cannot modify incidents created by other citizens.',
        })
      }
      if (targetStatus !== IncidentStatus.CANCELLED) {
        return res.status(403).json({
          success: false,
          message: 'Citizens are only authorized to cancel their own reported incidents.',
        })
      }
      if ([IncidentStatus.EN_ROUTE, IncidentStatus.ON_SCENE, IncidentStatus.RESOLVED].includes(incident.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel incident once responder unit is en route or on scene. Please contact dispatcher.',
        })
      }
    } else if (user.role === UserRole.RESPONDER || user.role === UserRole.DRIVER) {
      if (String(incident.assignedResponder) !== String(user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are not the assigned responder for this incident.',
        })
      }
    }

    const permitted = PERMITTED_STATUS_TRANSITIONS[incident.status] || []
    if (!permitted.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid state transition from '${incident.status}' to '${targetStatus}'. Permitted transitions: ${permitted.join(', ')}`,
      })
    }

    // Handle timestamps & side effects based on target status
    if (targetStatus === IncidentStatus.EN_ROUTE) {
      incident.enRouteAt = new Date()
      if (incident.assignedVehicle) {
        await Vehicle.findByIdAndUpdate(incident.assignedVehicle, { status: VehicleStatus.EN_ROUTE })
      }
    } else if (targetStatus === IncidentStatus.ON_SCENE) {
      incident.onSceneAt = new Date()
      if (incident.assignedVehicle) {
        await Vehicle.findByIdAndUpdate(incident.assignedVehicle, { status: VehicleStatus.ON_SCENE })
      }
    } else if (targetStatus === IncidentStatus.RESOLVED) {
      incident.resolvedAt = new Date()
      incident.resolutionSummary = summary || note || 'Resolved successfully'

      // Free vehicle
      if (incident.assignedVehicle) {
        await Vehicle.findByIdAndUpdate(incident.assignedVehicle, {
          status: VehicleStatus.AVAILABLE,
          $unset: { currentIncident: 1 },
        })
      }

      // Decrement bed capacity in assigned hospital if medical
      if (incident.hospital) {
        await Facility.findByIdAndUpdate(incident.hospital, {
          $inc: { 'bedCapacity.available': -1, currentPatientCount: 1 },
        })
      }
    } else if (targetStatus === IncidentStatus.CANCELLED) {
      incident.cancelledAt = new Date()
      incident.cancellationReason = note || 'Incident cancelled'

      if (incident.assignedVehicle) {
        await Vehicle.findByIdAndUpdate(incident.assignedVehicle, {
          status: VehicleStatus.AVAILABLE,
          $unset: { currentIncident: 1 },
        })
      }
    }

    incident.status = targetStatus
    incident.timeline.push({
      status: targetStatus,
      timestamp: new Date(),
      actor: user._id,
      actorRole: user.role,
      note: note || `Status updated to ${targetStatus}`,
    })

    await incident.save()
    broadcastIncidentUpdated(incident)

    await logAudit({
      action: `INCIDENT_STATUS_${targetStatus.toUpperCase().replace(/\s+/g, '_')}`,
      entityType: 'Incident',
      entityId: incident._id,
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      newState: { status: targetStatus },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return res.json({
      success: true,
      message: `Status updated to ${targetStatus}.`,
      data: incident,
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function recalculateIncidentRoute(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params
    const incident = await Incident.findById(id).populate('assignedVehicle')

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' })
    }

    let origin = incident.source.coordinates
    if (incident.assignedVehicle && (incident.assignedVehicle as any).currentLocation?.coordinates) {
      origin = (incident.assignedVehicle as any).currentLocation.coordinates
    }

    const destination = incident.destination?.coordinates || incident.source.coordinates
    const newRoute = await calculateRoute(origin, destination)

    incident.currentRoute = newRoute
    await incident.save()
    broadcastIncidentUpdated(incident)

    return res.json({
      success: true,
      message: 'Route recalculated successfully.',
      data: newRoute,
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}
