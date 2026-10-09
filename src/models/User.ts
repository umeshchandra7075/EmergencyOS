import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'
import { UserRole } from '../config/constants.js'

export interface IUser extends Document {
  name: string
  email: string
  password?: string
  role: UserRole
  phone?: string
  facility?: mongoose.Types.ObjectId
  vehicle?: mongoose.Types.ObjectId
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CITIZEN,
      index: true,
    },
    phone: { type: String, trim: true },
    facility: { type: Schema.Types.ObjectId, ref: 'Facility' },
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (err: any) {
    next(err)
  }
})

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  const user = this as IUser
  if (!user.password) return false
  return bcrypt.compare(candidatePassword, user.password)
}

export const User = mongoose.model<IUser>('User', userSchema)
export default User
