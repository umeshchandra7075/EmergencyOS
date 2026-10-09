export enum UserRole {
  CITIZEN = 'citizen',
  DISPATCHER = 'dispatcher',
  RESPONDER = 'responder',
  DRIVER = 'driver', // alias for responder
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

export enum IncidentSeverity {
  LOW = 1,
  MODERATE = 2,
  SERIOUS = 3,
  CRITICAL = 4,
  CATASTROPHIC = 5,
}

export enum VehicleType {
  AMBULANCE = 'ambulance',
  FIRE_ENGINE = 'fire_engine',
  PATROL_CAR = 'patrol_car',
  RESCUE_VEHICLE = 'rescue_vehicle',
  HAZMAT_VEHICLE = 'hazmat_vehicle',
}

export enum VehicleStatus {
  AVAILABLE = 'available',
  ASSIGNED = 'assigned',
  EN_ROUTE = 'en_route',
  ON_SCENE = 'on_scene',
  RETURNING = 'returning',
  OUT_OF_SERVICE = 'out_of_service',
}

export enum FacilityType {
  HOSPITAL = 'hospital',
  FIRE_STATION = 'fire_station',
  POLICE_STATION = 'police_station',
}

export const PERMITTED_STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.REPORTED]: [IncidentStatus.ACKNOWLEDGED, IncidentStatus.CANCELLED],
  [IncidentStatus.ACKNOWLEDGED]: [IncidentStatus.ASSIGNED, IncidentStatus.CANCELLED],
  [IncidentStatus.ASSIGNED]: [IncidentStatus.ACCEPTED, IncidentStatus.ACKNOWLEDGED, IncidentStatus.CANCELLED], // ACKNOWLEDGED on rejection
  [IncidentStatus.ACCEPTED]: [IncidentStatus.EN_ROUTE, IncidentStatus.CANCELLED],
  [IncidentStatus.EN_ROUTE]: [IncidentStatus.ON_SCENE, IncidentStatus.CANCELLED],
  [IncidentStatus.ON_SCENE]: [IncidentStatus.EN_ROUTE, IncidentStatus.RESOLVED], // EN_ROUTE for transport to hospital
  [IncidentStatus.RESOLVED]: [],
  [IncidentStatus.CANCELLED]: [],
}
