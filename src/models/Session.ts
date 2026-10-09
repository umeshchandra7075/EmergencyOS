import mongoose, { Schema, Document } from 'mongoose'

export interface ISession extends Document {
  user: mongoose.Types.ObjectId
  tokenHash: string
  isRevoked: boolean
  replacedByTokenHash?: string
  ipAddress?: string
  userAgent?: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const sessionSchema = new Schema<ISession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    isRevoked: { type: Boolean, default: false, index: true },
    replacedByTokenHash: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
)

export const Session = mongoose.model<ISession>('Session', sessionSchema)
export default Session
