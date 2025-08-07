import { RobotStatus, Mission, RobotData } from '@/types';
import { Logger } from '@/utils/logger';
import { EventEmitter } from '@/utils/event-emitter';

export class Robot extends EventEmitter {
  private id: string;
  private status: RobotStatus;
  private currentMissionId: string | null;
  private createdAt: Date;
  private lastUpdated: Date;
  private logger: Logger;

  constructor(id: string) {
    super();
    this.id = id;
    this.status = RobotStatus.IDLE;
    this.currentMissionId = null;
    this.createdAt = new Date();
    this.lastUpdated = new Date();
    this.logger = Logger.getInstance();
    
    this.logger.debug(`Robot ${id} initialized`);
  }

  public getId(): string {
    return this.id;
  }

  public getStatus(): RobotStatus {
    return this.status;
  }

  public getCurrentMissionId(): string | null {
    return this.currentMissionId;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getLastUpdated(): Date {
    return this.lastUpdated;
  }

  public assignMission(mission: Mission): boolean {
    if (this.status !== RobotStatus.IDLE) {
      this.logger.warn(`Cannot assign mission ${mission.id} to robot ${this.id} - robot is ${this.status}`);
      return false;
    }

    this.status = RobotStatus.ASSIGNED;
    this.currentMissionId = mission.id;
    this.updateTimestamp();
    
    this.logger.info(`Robot ${this.id} assigned to mission ${mission.id}`);
    this.emit('statusChanged', { robotId: this.id, status: this.status, missionId: mission.id });
    
    return true;
  }

  public startMission(): void {
    if (this.status !== RobotStatus.ASSIGNED) {
      throw new Error(`Cannot start mission - robot ${this.id} is not assigned`);
    }

    this.status = RobotStatus.EN_ROUTE;
    this.updateTimestamp();
    
    this.logger.info(`Robot ${this.id} started mission ${this.currentMissionId} - en route`);
    this.emit('statusChanged', { robotId: this.id, status: this.status, missionId: this.currentMissionId });
  }

  public startDelivering(): void {
    if (this.status !== RobotStatus.EN_ROUTE) {
      throw new Error(`Cannot start delivering - robot ${this.id} is not en route`);
    }

    this.status = RobotStatus.DELIVERING;
    this.updateTimestamp();
    
    this.logger.info(`Robot ${this.id} started delivering mission ${this.currentMissionId}`);
    this.emit('statusChanged', { robotId: this.id, status: this.status, missionId: this.currentMissionId });
  }

  public completeMission(): void {
    if (this.status !== RobotStatus.DELIVERING) {
      throw new Error(`Cannot complete mission - robot ${this.id} is not delivering`);
    }

    this.status = RobotStatus.COMPLETED;
    this.updateTimestamp();
    
    this.logger.info(`Robot ${this.id} completed mission ${this.currentMissionId}`);
    this.emit('statusChanged', { robotId: this.id, status: this.status, missionId: this.currentMissionId });
  }

  public returnToIdle(): void {
    if (this.status !== RobotStatus.COMPLETED) {
      throw new Error(`Cannot return to idle - robot ${this.id} is not completed`);
    }

    const completedMissionId = this.currentMissionId;
    this.status = RobotStatus.IDLE;
    this.currentMissionId = null;
    this.updateTimestamp();
    
    this.logger.info(`Robot ${this.id} returned to idle after completing mission ${completedMissionId}`);
    this.emit('statusChanged', { robotId: this.id, status: this.status, missionId: null });
  }

  public cancelCurrentMission(): void {
    if (this.status === RobotStatus.IDLE) {
      this.logger.warn(`Robot ${this.id} has no mission to cancel`);
      return;
    }

    const cancelledMissionId = this.currentMissionId;
    this.status = RobotStatus.IDLE;
    this.currentMissionId = null;
    this.updateTimestamp();
    
    this.logger.info(`Robot ${this.id} cancelled mission ${cancelledMissionId}`);
    this.emit('missionCancelled', { robotId: this.id, missionId: cancelledMissionId });
    this.emit('statusChanged', { robotId: this.id, status: this.status, missionId: null });
  }

  public toData(): RobotData {
    return {
      id: this.id,
      status: this.status,
      currentMissionId: this.currentMissionId,
      createdAt: this.createdAt,
      lastUpdated: this.lastUpdated
    };
  }

  private updateTimestamp(): void {
    this.lastUpdated = new Date();
  }
}