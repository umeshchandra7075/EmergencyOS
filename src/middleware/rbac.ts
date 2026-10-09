import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from './auth.js'
import { UserRole } from '../config/constants.js'

export function authorize(...allowedRoles: (UserRole | string)[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.',
      })
    }

    // Admin always authorized
    if (req.user.role === UserRole.ADMIN) {
      return next()
    }

    const userRole = req.user.role

    // Match roles (including driver/responder equivalence)
    const isMatch = allowedRoles.some((role) => {
      if (role === userRole) return true
      if (
        (role === UserRole.RESPONDER && userRole === UserRole.DRIVER) ||
        (role === UserRole.DRIVER && userRole === UserRole.RESPONDER)
      ) {
        return true
      }
      return false
    })

    if (!isMatch) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: role '${userRole}' is not permitted to perform this action.`,
      })
    }

    next()
  }
}
