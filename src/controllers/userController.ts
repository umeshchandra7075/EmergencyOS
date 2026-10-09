import { Request, Response } from 'express'
import User from '../models/User.js'
import { UserRole } from '../config/constants.js'

export async function getUsers(req: Request, res: Response) {
  try {
    const { role } = req.query
    const query: any = {}
    if (role) query.role = role

    const users = await User.find(query).select('-password').sort({ createdAt: -1 })
    return res.json({ success: true, data: { users } })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export async function updateUserRole(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { role, isActive } = req.body

    const update: any = {}
    if (role && Object.values(UserRole).includes(role)) {
      update.role = role
    }
    if (isActive !== undefined) {
      update.isActive = Boolean(isActive)
    }

    const user = await User.findByIdAndUpdate(id, update, { new: true }).select('-password')
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' })
    }

    return res.json({ success: true, message: 'User updated.', data: user })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
}
