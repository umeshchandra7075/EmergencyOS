import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { config } from '../config/env.js'
import User, { IUser } from '../models/User.js'
import Session from '../models/Session.js'
import { UserRole } from '../config/constants.js'
import { AuthenticatedRequest } from '../middleware/auth.js'
import { logAudit } from '../services/auditService.js'
import { disconnectUserSockets } from '../services/socketService.js'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function generateTokens(user: IUser) {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
  }

  const accessToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as any,
  })

  // Cryptographically random high-entropy refresh token string encoded in JWT format
  const refreshToken = jwt.sign(
    { ...payload, nonce: crypto.randomBytes(16).toString('hex') },
    config.JWT_REFRESH_SECRET,
    {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN as any,
    }
  )

  return { accessToken, refreshToken }
}

function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProd = config.NODE_ENV === 'production'

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 mins
    path: '/',
  })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  })
}

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, phone } = req.body

    const normalizedEmail = email.toLowerCase().trim()
    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      })
    }

    // SEC-01 Remediation: Public registration strictly assigns Citizen role.
    // Privileged accounts must be provisioned by authorized administrators.
    const assignedRole = UserRole.CITIZEN

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: assignedRole,
      phone: phone?.trim(),
    })

    await user.save()

    const { accessToken, refreshToken } = generateTokens(user)
    const tokenHash = hashToken(refreshToken)

    // Store state-backed session
    await Session.create({
      user: user._id,
      tokenHash,
      isRevoked: false,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

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

    const normalizedEmail = email.toLowerCase().trim()
    const user = await User.findOne({ email: normalizedEmail }).select('+password')
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
    const tokenHash = hashToken(refreshToken)

    // Persist new active session
    await Session.create({
      user: user._id,
      tokenHash,
      isRevoked: false,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

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

    let decoded: any
    try {
      decoded = jwt.verify(token, config.JWT_REFRESH_SECRET)
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token signature.',
      })
    }

    const currentHash = hashToken(token)
    const session = await Session.findOne({ tokenHash: currentHash })

    // SEC-02 Remediation: State-backed Replay Attack Detection
    if (session && session.isRevoked) {
      // Token replay detected: an already-rotated token was presented!
      // Invalidate ALL sessions for this user to contain potential compromise.
      await Session.updateMany({ user: session.user }, { isRevoked: true })
      disconnectUserSockets(String(session.user), 'Security alert: Replay attack detected')

      await logAudit({
        action: 'SECURITY_ALERT_REFRESH_TOKEN_REPLAY',
        entityType: 'User',
        entityId: session.user,
        details: 'Replay attack detected with previously revoked refresh token. All active sessions invalidated.',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
      })

      res.clearCookie('accessToken', { path: '/' })
      res.clearCookie('refreshToken', { path: '/' })

      return res.status(401).json({
        success: false,
        code: 'TOKEN_REPLAY_DETECTED',
        message: 'Security violation: Refresh token reuse detected. All active sessions terminated.',
      })
    }

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired or does not exist.',
      })
    }

    const user = await User.findById(decoded.id)
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or deactivated.',
      })
    }

    // Atomically rotate: Issue new tokens, revoke current session, insert new session
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user)
    const newHash = hashToken(newRefreshToken)

    session.isRevoked = true
    session.replacedByTokenHash = newHash
    await session.save()

    await Session.create({
      user: user._id,
      tokenHash: newHash,
      isRevoked: false,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    setTokenCookies(res, accessToken, newRefreshToken)

    return res.json({
      success: true,
      message: 'Token rotated and refreshed successfully.',
      data: { accessToken, refreshToken: newRefreshToken },
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function logout(req: AuthenticatedRequest, res: Response) {
  try {
    let token = req.cookies?.refreshToken || req.body?.refreshToken
    if (token) {
      const currentHash = hashToken(token)
      await Session.findOneAndUpdate({ tokenHash: currentHash }, { isRevoked: true })
    }

    res.clearCookie('accessToken', { path: '/' })
    res.clearCookie('refreshToken', { path: '/' })

    if (req.user) {
      disconnectUserSockets(String(req.user._id), 'User logged out')
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
      message: 'Logged out successfully and server session invalidated.',
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}
