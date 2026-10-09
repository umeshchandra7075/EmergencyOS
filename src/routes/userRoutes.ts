import { Router } from 'express'
import { getUsers, updateUserRole } from '../controllers/userController.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/rbac.js'
import { UserRole } from '../config/constants.js'

const router = Router()

router.use(authenticate)
router.use(authorize(UserRole.ADMIN))

router.get('/', getUsers)
router.patch('/:id/role', updateUserRole)

export default router
