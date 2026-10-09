import { Request, Response } from 'express'
import Hazard from '../models/Hazard.js'
import { AuthenticatedRequest } from '../middleware/auth.js'

export async function getHazards(req: Request, res: Response) {
  try {
    const hazards = await Hazard.find({ isActive: true }).sort({ createdAt: -1 })
    return res.json({ success: true, data: { hazards } })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function createHazard(req: AuthenticatedRequest, res: Response) {
  try {
    const { title, description, type, severity, location, radiusMeters } = req.body

    const hazard = new Hazard({
      title,
      description,
      type,
      severity,
      location: {
        type: 'Point',
        coordinates: location?.coordinates || [78.4867, 17.3850],
      },
      radiusMeters: radiusMeters || 150,
      reportedBy: req.user?._id,
      isActive: true,
    })

    await hazard.save()
    return res.status(201).json({ success: true, message: 'Hazard registered.', data: hazard })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function toggleHazard(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params
    const hazard = await Hazard.findById(id)
    if (!hazard) {
      return res.status(404).json({ success: false, message: 'Hazard not found.' })
    }

    hazard.isActive = !hazard.isActive
    await hazard.save()
    return res.json({ success: true, message: 'Hazard status updated.', data: hazard })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}
