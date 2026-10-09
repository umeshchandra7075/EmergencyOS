import mongoose, { Schema, Document } from 'mongoose'

export interface IHazard extends Document {
  title: string
  description?: string
  type: string
  severity: number
  location: {
    type: 'Point'
    coordinates: [number, number]
  }
  radiusMeters: number
  isActive: boolean
  reportedBy?: mongoose.Types.ObjectId
  createdAt: Date
}

const hazardSchema = new Schema<IHazard>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    type: { type: String, default: 'road_block', index: true },
    severity: { type: Number, min: 1, max: 5, default: 3 },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    radiusMeters: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true, index: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

hazardSchema.index({ location: '2dsphere' })

export const Hazard = mongoose.model<IHazard>('Hazard', hazardSchema)
export default Hazard
