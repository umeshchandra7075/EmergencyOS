import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'
import User, { IUser } from '../models/User.js'
import { UserRole } from '../config/constants.js'
import { AuthenticatedRequest } from '../middleware/auth.js'
import { logAudit } from '../services/auditService.js'

function generateTokens(user: IUser) {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
  }

  const accessToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as any,
  })

  const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN as any,
  })

  return { accessToken, refreshToken }
}

function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProd = config.NODE_ENV === 'production'

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 mins
  })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  })
}

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, role, phone } = req.body

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      })
    }

    // Citizens can self-register; administrative roles default to citizen unless caller is admin
    let assignedRole = UserRole.CITIZEN
    if (role && Object.values(UserRole).includes(role)) {
      assignedRole = role
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: assignedRole,
      phone: phone?.trim(),
    })

    await user.save()

    const { accessToken, refreshToken } = generateTokens(user)
    setTokenCookies(res, accessToken, refreshToken)

    await logAudit({
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user._id,
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        accessToken,
      },
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password')
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated.',
      })
    }

    const { accessToken, refreshToken } = generateTokens(user)
    setTokenCookies(res, accessToken, refreshToken)

    await logAudit({
      action: 'USER_LOGGED_IN',
      entityType: 'User',
      entityId: user._id,
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        facility: user.facility,
        vehicle: user.vehicle,
        accessToken,
      },
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const user = await User.findById(req.user?._id)
      .populate('facility')
      .populate('vehicle')

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' })
    }

    return res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        facility: user.facility,
        vehicle: user.vehicle,
        createdAt: user.createdAt,
      },
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    let token = req.cookies?.refreshToken || req.body?.refreshToken

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required.',
      })
    }

    const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as { id: string }
    const user = await User.findById(decoded.id)

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session or account deactivated.',
      })
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user)
    setTokenCookies(res, accessToken, newRefreshToken)

    return res.json({
      success: true,
      message: 'Token refreshed successfully.',
      data: { accessToken },
    })
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token.',
    })
  }
}

export async function logout(req: AuthenticatedRequest, res: Response) {
  try {
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')

    if (req.user) {
      await logAudit({
        action: 'USER_LOGGED_OUT',
        entityType: 'User',
        entityId: req.user._id,
        actorId: req.user._id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })
    }

    return res.json({
      success: true,
      message: 'Logged out successfully.',
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}
