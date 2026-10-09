import mongoose, { Schema, Document } from 'mongoose'
import { IncidentSeverity, IncidentStatus } from '../config/constants.js'

export interface ITimelineEntry {
  status: IncidentStatus
  timestamp: Date
  actor?: mongoose.Types.ObjectId
  actorRole?: string
  note?: string
}

export interface IRouteAlternative {
  distanceMeters: number
  durationSeconds: number
  geometry: any
  summary?: string
}

export interface IIncidentRoute {
  distanceMeters: number
  durationSeconds: number
  geometry: any // GeoJSON LineString
  alternatives?: IRouteAlternative[]
  isFallback?: boolean
  isNavigable?: boolean
  diagnosticOnly?: boolean
  status?: string
  warningMessage?: string
  provider?: string
  calculatedAt: Date
}

export interface IIncident extends Document {
  incidentNumber: string
  citizen: mongoose.Types.ObjectId
  contactPhone?: string
  emergencyType: number | string
  severity: number
  description: string
  source: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
  }
  sourceAddress?: string
  destination?: {
    type: 'Point'
    coordinates: [number, number]
  }
  destinationAddress?: string
  hospital?: mongoose.Types.ObjectId
  assignedVehicle?: mongoose.Types.ObjectId
  assignedResponder?: mongoose.Types.ObjectId
  status: IncidentStatus
  rejectionReason?: string
  cancellationReason?: string
  resolutionSummary?: string
  currentRoute?: IIncidentRoute
  timeline: ITimelineEntry[]
  acknowledgedAt?: Date
  acknowledgedBy?: mongoose.Types.ObjectId
  assignedAt?: Date
  acceptedAt?: Date
  enRouteAt?: Date
  onSceneAt?: Date
  resolvedAt?: Date
  cancelledAt?: Date
  createdAt: Date
  updatedAt: Date
}

const timelineSchema = new Schema<ITimelineEntry>(
  {
    status: { type: String, enum: Object.values(IncidentStatus), required: true },
    timestamp: { type: Date, default: Date.now },
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String },
    note: { type: String },
  },
  { _id: false }
)

const incidentSchema = new Schema<IIncident>(
  {
    incidentNumber: { type: String, required: true, unique: true, index: true },
    citizen: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contactPhone: { type: String },
    emergencyType: { type: Schema.Types.Mixed, required: true, index: true }, // can be number 1-5 or ObjectId or name
    severity: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: IncidentSeverity.SERIOUS,
      index: true,
    },
    description: { type: String, required: true },
    source: {
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
    sourceAddress: { type: String },
    destination: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
      },
    },
    destinationAddress: { type: String },
    hospital: { type: Schema.Types.ObjectId, ref: 'Facility' },
    assignedVehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    assignedResponder: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: Object.values(IncidentStatus),
      default: IncidentStatus.REPORTED,
      index: true,
    },
    rejectionReason: { type: String },
    cancellationReason: { type: String },
    resolutionSummary: { type: String },
    currentRoute: {
      distanceMeters: { type: Number },
      durationSeconds: { type: Number },
      geometry: { type: Schema.Types.Mixed },
      alternatives: [{ type: Schema.Types.Mixed }],
      isFallback: { type: Boolean, default: false },
      isNavigable: { type: Boolean, default: true },
      diagnosticOnly: { type: Boolean, default: false },
      status: { type: String, default: 'available' },
      warningMessage: { type: String },
      provider: { type: String, default: 'OSRM' },
      calculatedAt: { type: Date },
    },
    timeline: [timelineSchema],
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date },
    acceptedAt: { type: Date },
    enRouteAt: { type: Date },
    onSceneAt: { type: Date },
    resolvedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
)

incidentSchema.index({ source: '2dsphere' })
incidentSchema.index({ status: 1, createdAt: -1 })

export const Incident = mongoose.model<IIncident>('Incident', incidentSchema)
export default Incident
