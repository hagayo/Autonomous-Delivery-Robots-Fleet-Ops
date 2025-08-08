export enum MissionStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export enum MissionType {
  DELIVERY = 'delivery',
  PICKUP = 'pickup',
  MAINTENANCE = 'maintenance',
  PATROL = 'patrol'
}

export interface Mission {
  id: string;
  type: MissionType;
  status: MissionStatus;
  assignedRobotId: string | null;
  createdAt: Date;
  assignedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  priority: number;
  origin: Location;
  destination: Location;
  estimatedDuration: number; // in minutes
  actualDuration?: number; // in minutes
  payload?: string;
  instructions?: string;
}

export interface Location {
  id: string;
  name: string;
  coordinates: {
    x: number;
    y: number;
    floor: number;
  };
}

export interface MissionStateTransition {
  missionId: string;
  fromStatus: MissionStatus;
  toStatus: MissionStatus;
  timestamp: Date;
  robotId?: string;
}
