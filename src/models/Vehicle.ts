import mongoose, { Schema, Document } from 'mongoose'
import { VehicleStatus, VehicleType } from '../config/constants.js'

export interface IVehicle extends Document {
  plateNumber: string
  type: VehicleType
  status: VehicleStatus
  driver?: mongoose.Types.ObjectId
  currentLocation: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
  }
  heading?: number
  speed?: number
  batteryOrFuelLevel?: number
  currentIncident?: mongoose.Types.ObjectId
  lastActiveAt?: Date
}

const vehicleSchema = new Schema<IVehicle>(
  {
    plateNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: Object.values(VehicleType), required: true },
    status: {
      type: String,
      enum: Object.values(VehicleStatus),
      default: VehicleStatus.AVAILABLE,
      index: true,
    },
    driver: { type: Schema.Types.ObjectId, ref: 'User' },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    heading: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    batteryOrFuelLevel: { type: Number, default: 100 },
    currentIncident: { type: Schema.Types.ObjectId, ref: 'Incident' },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

vehicleSchema.index({ currentLocation: '2dsphere' })

export const Vehicle = mongoose.model<IVehicle>('Vehicle', vehicleSchema)
export default Vehicle
