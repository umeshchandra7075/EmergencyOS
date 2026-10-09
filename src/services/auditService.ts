import AuditLog from '../models/AuditLog.js'
import mongoose from 'mongoose'

interface LogAuditParams {
  action: string
  entityType: string
  entityId: string | mongoose.Types.ObjectId
  actorId?: mongoose.Types.ObjectId
  actorEmail?: string
  actorRole?: string
  previousState?: any
  newState?: any
  ipAddress?: string
  userAgent?: string
  details?: string
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await AuditLog.create({
      action: params.action,
      entityType: params.entityType,
      entityId: String(params.entityId),
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      previousState: params.previousState,
      newState: params.newState,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      details: params.details,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}
