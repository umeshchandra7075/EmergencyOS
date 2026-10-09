import { Router } from 'express'
import { getDashboardStats, getAuditLogs } from '../controllers/analyticsController.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/rbac.js'
import { UserRole } from '../config/constants.js'

const router = Router()

router.use(authenticate)

router.get(
  '/stats',
  authorize(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.HOSPITAL_STAFF),
  getDashboardStats
)

router.get(
  '/audits',
  authorize(UserRole.ADMIN),
  getAuditLogs
)

export default router
