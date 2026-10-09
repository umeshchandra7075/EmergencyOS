import mongoose, { Schema, Document } from 'mongoose'
import { FacilityType } from '../config/constants.js'

export interface IFacility extends Document {
  name: string
  type: FacilityType
  specialty?: string
  bedCapacity: {
    total: number
    available: number
    icuTotal: number
    icuAvailable: number
    oxygenTotal: number
    oxygenAvailable: number
  }
  currentPatientCount: number
  location: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
  }
  address?: string
  contactPhone?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const facilitySchema = new Schema<IFacility>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(FacilityType), required: true, index: true },
    specialty: { type: String, default: 'general' },
    bedCapacity: {
      total: { type: Number, default: 0 },
      available: { type: Number, default: 0 },
      icuTotal: { type: Number, default: 0 },
      icuAvailable: { type: Number, default: 0 },
      oxygenTotal: { type: Number, default: 0 },
      oxygenAvailable: { type: Number, default: 0 },
    },
    currentPatientCount: { type: Number, default: 0 },
    location: {
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
    address: { type: String },
    contactPhone: { type: String },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)

facilitySchema.index({ location: '2dsphere' })

export const Facility = mongoose.model<IFacility>('Facility', facilitySchema)
export default Facility
