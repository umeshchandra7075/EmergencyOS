import mongoose, { Schema, Document } from 'mongoose'

export interface IAuditLog extends Document {
  action: string
  entityType: string
  entityId: string
  actorId?: mongoose.Types.ObjectId
  actorEmail?: string
  actorRole?: string
  previousState?: any
  newState?: any
  ipAddress?: string
  userAgent?: string
  details?: string
  timestamp: Date
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorEmail: { type: String },
    actorRole: { type: String },
    previousState: { type: Schema.Types.Mixed },
    newState: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    details: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
)

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema)
export default AuditLog
