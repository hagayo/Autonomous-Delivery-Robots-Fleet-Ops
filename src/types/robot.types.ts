export enum RobotStatus {
  IDLE = 'idle',
  ASSIGNED = 'assigned',
  EN_ROUTE = 'en_route',
  DELIVERING = 'delivering',
  COMPLETED = 'completed'
}

export interface Robot {
  id: string;
  status: RobotStatus;
  currentMissionId: string | null;
  lastUpdated: Date;
  position?: {
    x: number;
    y: number;
    floor: number;
  };
  battery?: number;
}

export interface RobotStateTransition {
  robotId: string;
  fromStatus: RobotStatus;
  toStatus: RobotStatus;
  timestamp: Date;
  missionId?: string;
}
