import { Router } from 'express'
import {
  getVehicles,
  getVehicleById,
  updateVehicleLocation,
  createVehicle,
} from '../controllers/vehicleController.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/rbac.js'
import { UserRole } from '../config/constants.js'

const router = Router()

router.use(authenticate)

router.get('/', getVehicles)
router.get('/:id', getVehicleById)
router.patch(
  '/:id/location',
  authorize(UserRole.RESPONDER, UserRole.DRIVER, UserRole.ADMIN),
  updateVehicleLocation
)
router.post('/', authorize(UserRole.ADMIN), createVehicle)

export default router
