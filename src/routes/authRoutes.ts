import { Router } from 'express'
import { register, login, getProfile, refreshToken, logout } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'
import { authRateLimiter } from '../middleware/rateLimiter.js'
import { validate } from '../middleware/validate.js'
import { z } from 'zod'

const router = Router()

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.string().optional(),
    phone: z.string().optional(),
  }),
})

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
})

router.post('/register', authRateLimiter, validate(registerSchema), register)
router.post('/login', authRateLimiter, validate(loginSchema), login)
router.post('/refresh', refreshToken)
router.post('/logout', authenticate, logout)
router.get('/me', authenticate, getProfile)

export default router
