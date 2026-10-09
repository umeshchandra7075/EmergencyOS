import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/emergency_route_planner'),
  JWT_SECRET: z.string().default('emergencyos_dev_super_secret_jwt_key_2026_xyz!#'),
  JWT_REFRESH_SECRET: z.string().default('emergencyos_dev_super_secret_refresh_key_2026_xyz!#'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  OSRM_BASE_URL: z.string().default('http://router.project-osrm.org/route/v1/driving'),
  OSRM_TIMEOUT: z.string().default('6000').transform((val) => parseInt(val, 10)),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX: z.string().default('500').transform((val) => parseInt(val, 10)),
})

export const config = envSchema.parse(process.env)
