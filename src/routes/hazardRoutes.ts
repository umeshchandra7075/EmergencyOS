import { Router } from 'express'
import { getHazards, createHazard, toggleHazard } from '../controllers/hazardController.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/rbac.js'
import { UserRole } from '../config/constants.js'

const router = Router()

router.get('/', getHazards)

router.use(authenticate)
router.post(
  '/',
  authorize(UserRole.DISPATCHER, UserRole.RESPONDER, UserRole.DRIVER, UserRole.ADMIN),
  createHazard
)
router.patch(
  '/:id/toggle',
  authorize(UserRole.DISPATCHER, UserRole.ADMIN),
  toggleHazard
)

export default router
