import { Router, Request, Response } from 'express'
import { calculateRoute, checkRoutingServiceHealth } from '../services/routingService.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// Route calculation endpoint (requires authentication)
router.post('/calculate', authenticate, async (req: Request, res: Response) => {
  try {
    const { source, destination, alternatives } = req.body

    if (!source || !Array.isArray(source) || source.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Valid source coordinates [longitude, latitude] are required.',
      })
    }

    if (!destination || !Array.isArray(destination) || destination.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Valid destination coordinates [longitude, latitude] are required.',
      })
    }

    // Geographic coordinate bounds validation
    if (
      source[0] < -180 ||
      source[0] > 180 ||
      source[1] < -90 ||
      source[1] > 90 ||
      destination[0] < -180 ||
      destination[0] > 180 ||
      destination[1] < -90 ||
      destination[1] > 90
    ) {
      return res.status(400).json({
        success: false,
        message: 'Coordinates out of bounds: Longitude must be between -180 and 180, Latitude between -90 and 90.',
      })
    }

    const route = await calculateRoute(
      [source[0], source[1]],
      [destination[0], destination[1]],
      alternatives ? Number(alternatives) : 2
    )

    return res.json({
      success: true,
      data: route,
    })
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message,
    })
  }
})

// Routing engine status endpoint
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await checkRoutingServiceHealth()
    return res.json({
      success: true,
      data: health,
    })
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message,
    })
  }
})

export default router
