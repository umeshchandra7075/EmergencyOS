export enum UserRole {
  CITIZEN = 'citizen',
  DISPATCHER = 'dispatcher',
  RESPONDER = 'responder',
  DRIVER = 'driver',
  HOSPITAL_STAFF = 'hospital_staff',
  ADMIN = 'admin',
}

export enum IncidentStatus {
  REPORTED = 'Reported',
  ACKNOWLEDGED = 'Acknowledged',
  ASSIGNED = 'Assigned',
  ACCEPTED = 'Accepted',
  EN_ROUTE = 'En Route',
  ON_SCENE = 'On Scene',
  RESOLVED = 'Resolved',
  CANCELLED = 'Cancelled',
}

export interface User {
  id: string
  _id?: string
  name: string
  email: string
  role: UserRole
  phone?: string
  facility?: any
  vehicle?: any
}

export interface IncidentRoute {
  distanceMeters: number
  durationSeconds: number
  geometry: {
    type: string
    coordinates: [number, number][]
  }
  alternatives?: any[]
  isFallback?: boolean
  provider?: string
  calculatedAt?: string
}

export interface TimelineEntry {
  status: IncidentStatus
  timestamp: string
  actor?: {
    _id: string
    name: string
    email: string
    role: string
  }
  note?: string
}

export interface Incident {
  _id: string
  incidentNumber: string
  citizen: User
  contactPhone?: string
  emergencyType: number | string
  severity: number
  description: string
  source: {
    type: 'Point'
    coordinates: [number, number] // [lng, lat]
  }
  sourceAddress?: string
  destination?: {
    type: 'Point'
    coordinates: [number, number]
  }
  destinationAddress?: string
  hospital?: Facility
  assignedVehicle?: Vehicle
  assignedResponder?: User
  status: IncidentStatus
  currentRoute?: IncidentRoute
  timeline: TimelineEntry[]
  rejectionReason?: string
  cancellationReason?: string
  resolutionSummary?: string
  acknowledgedAt?: string
  assignedAt?: string
  acceptedAt?: string
  enRouteAt?: string
  onSceneAt?: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Vehicle {
  _id: string
  plateNumber: string
  type: 'ambulance' | 'fire_engine' | 'patrol_car' | 'rescue_vehicle' | 'hazmat_vehicle'
  status: 'available' | 'assigned' | 'en_route' | 'on_scene' | 'returning' | 'out_of_service'
  driver?: User
  currentLocation: {
    type: 'Point'
    coordinates: [number, number]
  }
  heading?: number
  speed?: number
  batteryOrFuelLevel?: number
  currentIncident?: string
}

export interface Facility {
  _id: string
  name: string
  type: 'hospital' | 'fire_station' | 'police_station'
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
    coordinates: [number, number]
  }
  address?: string
  contactPhone?: string
  distanceMeters?: number
}

export interface Hazard {
  _id: string
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
}
