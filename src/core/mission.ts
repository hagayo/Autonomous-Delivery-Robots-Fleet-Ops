import { Mission, MissionStatus } from '@/types';
import { Logger } from '@/utils/logger';
import { TimeUtils } from '@/utils/time-utils';
import { v4 as uuidv4 } from 'uuid';

export class MissionManager {
  private missions: Map<string, Mission> = new Map();
  private logger: Logger;

  // Mission duration ranges in milliseconds
  private static readonly MISSION_DURATION_RANGE = {
    MIN: 3 * 60 * 1000,  // 3 minutes
    MAX: 8 * 60 * 1000   // 8 minutes
  };

  constructor() {
    this.logger = Logger.getInstance();
  }

  public createMission(): Mission {
    const mission: Mission = {
      id: `mission-${uuidv4().slice(0, 8)}`,
      status: 'created',
      createdAt: new Date(),
      estimatedDuration: TimeUtils.getRandomDuration(
        MissionManager.MISSION_DURATION_RANGE.MIN,
        MissionManager.MISSION_DURATION_RANGE.MAX
      )
    };

    this.missions.set(mission.id, mission);
    this.logger.info(`Mission ${mission.id} created with duration ${mission.estimatedDuration}ms`);
    
    return mission;
  }

  public getMission(missionId: string): Mission | undefined {
    return this.missions.get(missionId);
  }

  public getAllMissions(): Mission[] {
    return Array.from(this.missions.values());
  }

  public getActiveMissions(): Mission[] {
    return Array.from(this.missions.values()).filter(
      mission => mission.status === 'assigned' || mission.status === 'in_progress'
    );
  }

  public assignMission(missionId: string, robotId: string): void {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    if (mission.status !== 'created') {
      throw new Error(`Mission ${missionId} cannot be assigned - current status: ${mission.status}`);
    }

    mission.status = 'assigned';
    mission.assignedAt = new Date();
    mission.robotId = robotId;
    
    this.logger.info(`Mission ${missionId} assigned to robot ${robotId}`);
  }

  public startMission(missionId: string): void {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    if (mission.status !== 'assigned') {
      throw new Error(`Mission ${missionId} cannot be started - current status: ${mission.status}`);
    }

    mission.status = 'in_progress';
    mission.startedAt = new Date();
    
    this.logger.info(`Mission ${missionId} started`);
  }

  public completeMission(missionId: string): void {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    if (mission.status !== 'in_progress') {
      throw new Error(`Mission ${missionId} cannot be completed - current status: ${mission.status}`);
    }

    mission.status = 'completed';
    mission.completedAt = new Date();
    
    this.logger.info(`Mission ${missionId} completed`);
  }

  public cancelMission(missionId: string): void {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    if (mission.status === 'completed' || mission.status === 'cancelled') {
      this.logger.warn(`Mission ${missionId} is already ${mission.status}`);
      return;
    }

    mission.status = 'cancelled';
    mission.cancelledAt = new Date();
    
    this.logger.info(`Mission ${missionId} cancelled`);
  }

  public cleanupCompletedMissions(olderThanMs: number = 24 * 60 * 60 * 1000): number {
    const cutoffTime = Date.now() - olderThanMs;
    let cleanedCount = 0;

    for (const [missionId, mission] of this.missions.entries()) {
      if ((mission.status === 'completed' || mission.status === 'cancelled') &&
          mission.createdAt.getTime() < cutoffTime) {
        this.missions.delete(missionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} old missions`);
    }

    return cleanedCount;
  }
}