import { Robot } from './robot';
import { Mission, FleetStatistics, RobotStatus } from '@/types';
import { Logger } from '@/utils/logger';
import { EventEmitter } from '@/utils/event-emitter';

export class FleetManager extends EventEmitter {
  private robots: Map<string, Robot> = new Map();
  private logger: Logger;

  constructor() {
    super();
    this.logger = Logger.getInstance();
  }

  public initializeFleet(robotCount: number): void {
    this.logger.info(`Initializing fleet with ${robotCount} robots`);
    
    for (let i = 1; i <= robotCount; i++) {
      const robotId = `robot-${i.toString().padStart(3, '0')}`;
      const robot = new Robot(robotId);
      
      // Forward robot events
      robot.on('statusChanged', (data) => this.emit('robotStatusChanged', data));
      robot.on('missionCancelled', (data) => this.emit('robotMissionCancelled', data));
      
      this.robots.set(robotId, robot);
    }

    this.logger.info(`Fleet initialized with ${this.robots.size} robots`);
  }

  public getAllRobots(): Robot[] {
    return Array.from(this.robots.values());
  }

  public getRobot(robotId: string): Robot | undefined {
    return this.robots.get(robotId);
  }

  public getAvailableRobots(): Robot[] {
    return Array.from(this.robots.values()).filter(
      robot => robot.getStatus() === RobotStatus.IDLE
    );
  }

  public assignMissionToAvailableRobot(mission: Mission): Robot | null {
    const availableRobots = this.getAvailableRobots();
    
    if (availableRobots.length === 0) {
      this.logger.warn(`No available robots for mission ${mission.id}`);
      return null;
    }

    // Use round-robin or first available strategy
    const selectedRobot = availableRobots[0];
    
    if (selectedRobot.assignMission(mission)) {
      this.logger.info(`Mission ${mission.id} assigned to robot ${selectedRobot.getId()}`);
      return selectedRobot;
    }

    return null;
  }

  public cancelRobotMission(robotId: string): boolean {
    const robot = this.robots.get(robotId);
    
    if (!robot) {
      this.logger.warn(`Robot ${robotId} not found for mission cancellation`);
      return false;
    }

    robot.cancelCurrentMission();
    return true;
  }

  public getFleetStatistics(): FleetStatistics {
    const stats: FleetStatistics = {
      total: this.robots.size,
      idle: 0,
      assigned: 0,
      en_route: 0,
      delivering: 0,
      completed: 0
    };

    for (const robot of this.robots.values()) {
      switch (robot.getStatus()) {
        case RobotStatus.IDLE:
          stats.idle++;
          break;
        case RobotStatus.ASSIGNED:
          stats.assigned++;
          break;
        case RobotStatus.EN_ROUTE:
          stats.en_route++;
          break;
        case RobotStatus.DELIVERING:
          stats.delivering++;
          break;
        case RobotStatus.COMPLETED:
          stats.completed++;
          break;
      }
    }

    return stats;
  }

  public getRobotsByStatus(status: RobotStatus): Robot[] {
    return Array.from(this.robots.values()).filter(
      robot => robot.getStatus() === status
    );
  }

  public getActiveRobots(): Robot[] {
    return Array.from(this.robots.values()).filter(
      robot => robot.getStatus() !== RobotStatus.IDLE
    );
  }
}