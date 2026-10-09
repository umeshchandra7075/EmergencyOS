import { Router } from 'express'
import {
  createIncident,
  getIncidents,
  getIncidentById,
  acknowledgeIncident,
  assignIncident,
  acceptIncident,
  rejectIncident,
  updateIncidentStatus,
  recalculateIncidentRoute,
} from '../controllers/incidentController.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/rbac.js'
import { UserRole } from '../config/constants.js'

const router = Router()

// All incident routes require authentication
router.use(authenticate)

// Incident CRUD
router.post('/', createIncident)
router.get('/', getIncidents)
router.get('/:id', getIncidentById)

// Incident Lifecycle Transitions
router.post(
  '/:id/acknowledge',
  authorize(UserRole.DISPATCHER, UserRole.ADMIN),
  acknowledgeIncident
)

router.post(
  '/:id/assign',
  authorize(UserRole.DISPATCHER, UserRole.ADMIN),
  assignIncident
)

router.post(
  '/:id/accept',
  authorize(UserRole.RESPONDER, UserRole.DRIVER, UserRole.ADMIN),
  acceptIncident
)

router.post(
  '/:id/reject',
  authorize(UserRole.RESPONDER, UserRole.DRIVER, UserRole.ADMIN),
  rejectIncident
)

router.patch(
  '/:id/status',
  authorize(UserRole.RESPONDER, UserRole.DRIVER, UserRole.DISPATCHER, UserRole.ADMIN, UserRole.CITIZEN),
  updateIncidentStatus
)

router.post('/:id/reroute', recalculateIncidentRoute)

export default router
