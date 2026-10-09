import { Router } from 'express'
import {
  getFacilities,
  getNearestFacilities,
  updateBedCapacity,
  createFacility,
} from '../controllers/facilityController.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/rbac.js'
import { UserRole } from '../config/constants.js'

const router = Router()

// Public search for nearest facilities (can also be authenticated)
router.get('/nearest', getNearestFacilities)
router.get('/', getFacilities)

// Authenticated facility operations
router.use(authenticate)
router.patch(
  '/:id/capacity',
  authorize(UserRole.HOSPITAL_STAFF, UserRole.ADMIN),
  updateBedCapacity
)
router.post('/', authorize(UserRole.ADMIN), createFacility)

export default router
