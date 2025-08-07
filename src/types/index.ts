export interface Mission {
  id: string;
  status: MissionStatus;
  createdAt: Date;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  robotId?: string;
  estimatedDuration: number; // in milliseconds
}

export type MissionStatus = 'created' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export enum RobotStatus {
  IDLE = 'idle',
  ASSIGNED = 'assigned',
  EN_ROUTE = 'en_route',
  DELIVERING = 'delivering',
  COMPLETED = 'completed'
}

export interface RobotData {
  id: string;
  status: RobotStatus;
  currentMissionId: string | null;
  createdAt: Date;
  lastUpdated: Date;
}

export interface FleetStatistics {
  total: number;
  idle: number;
  assigned: number;
  en_route: number;
  delivering: number;
  completed: number;
}

export interface DashboardData {
  robots: RobotData[];
  fleetStats: FleetStatistics;
  activeMissions: Mission[];
  lastUpdated: Date;
}