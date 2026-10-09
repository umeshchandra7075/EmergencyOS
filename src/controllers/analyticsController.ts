import { Request, Response } from 'express'
import Incident from '../models/Incident.js'
import Vehicle from '../models/Vehicle.js'
import Facility from '../models/Facility.js'
import AuditLog from '../models/AuditLog.js'
import { IncidentStatus, VehicleStatus } from '../config/constants.js'

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const [
      totalIncidents,
      activeIncidents,
      resolvedIncidents,
      availableVehicles,
      totalVehicles,
      facilities,
    ] = await Promise.all([
      Incident.countDocuments(),
      Incident.countDocuments({
        status: {
          $in: [
            IncidentStatus.REPORTED,
            IncidentStatus.ACKNOWLEDGED,
            IncidentStatus.ASSIGNED,
            IncidentStatus.ACCEPTED,
            IncidentStatus.EN_ROUTE,
            IncidentStatus.ON_SCENE,
          ],
        },
      }),
      Incident.countDocuments({ status: IncidentStatus.RESOLVED }),
      Vehicle.countDocuments({ status: VehicleStatus.AVAILABLE }),
      Vehicle.countDocuments(),
      Facility.find({ type: 'hospital' }),
    ])

    // Compute bed statistics
    let totalBeds = 0
    let availableBeds = 0
    let icuBeds = 0
    let icuAvailable = 0

    facilities.forEach((f) => {
      totalBeds += f.bedCapacity?.total || 0
      availableBeds += f.bedCapacity?.available || 0
      icuBeds += f.bedCapacity?.icuTotal || 0
      icuAvailable += f.bedCapacity?.icuAvailable || 0
    })

    const statusCounts = await Incident.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])

    const formattedStatusCounts = statusCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count
      return acc
    }, {} as Record<string, number>)

    return res.json({
      success: true,
      data: {
        incidents: {
          total: totalIncidents,
          active: activeIncidents,
          resolved: resolvedIncidents,
          byStatus: formattedStatusCounts,
        },
        vehicles: {
          total: totalVehicles,
          available: availableVehicles,
          deployed: totalVehicles - availableVehicles,
        },
        hospitalCapacity: {
          totalBeds,
          availableBeds,
          occupancyPercentage: totalBeds ? Math.round(((totalBeds - availableBeds) / totalBeds) * 100) : 0,
          icuBeds,
          icuAvailable,
        },
      },
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const { entityType, action, limit = 50 } = req.query
    const query: any = {}
    if (entityType) query.entityType = entityType
    if (action) query.action = action

    const logs = await AuditLog.find(query)
      .populate('actorId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(Number(limit))

    return res.json({ success: true, data: { logs } })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}
