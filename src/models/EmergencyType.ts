import mongoose, { Schema, Document } from 'mongoose'
import { VehicleType } from '../config/constants.js'

export interface IEmergencyType extends Document {
  name: string
  priority: number
  vehicleType: VehicleType
  specialty?: string | null
  description?: string
}

const emergencyTypeSchema = new Schema<IEmergencyType>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    priority: { type: Number, required: true, min: 1, max: 5 },
    vehicleType: { type: String, enum: Object.values(VehicleType), required: true },
    specialty: { type: String, default: null },
    description: { type: String },
  },
  { timestamps: true }
)

export const EmergencyType = mongoose.model<IEmergencyType>('EmergencyType', emergencyTypeSchema)
export default EmergencyType
