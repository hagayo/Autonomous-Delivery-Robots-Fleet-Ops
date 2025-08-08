import { Robot, RobotStatus, RobotStateTransition } from '../types/robot.types.js';
import { EventEmitter } from 'events';

export class RobotService extends EventEmitter {
  private robots: Map<string, Robot> = new Map();
  private stateHistory: RobotStateTransition[] = [];

  constructor() {
    super();
    this.initializeRobots();
  }

  private initializeRobots(): void {
    // Initialize 100 robots
    for (let i = 1; i <= 100; i++) {
      const robot: Robot = {
        id: `ROBOT-${i.toString().padStart(3, '0')}`,
        status: RobotStatus.IDLE,
        currentMissionId: null,
        lastUpdated: new Date(),
        position: {
          x: Math.floor(Math.random() * 1000),
          y: Math.floor(Math.random() * 1000),
          floor: Math.floor(Math.random() * 5) + 1
        },
        battery: Math.floor(Math.random() * 30) + 70 // 70-100%
      };
      this.robots.set(robot.id, robot);
    }
    console.log(`Initialized ${this.robots.size} robots`);
  }

  getAllRobots(): Robot[] {
    return Array.from(this.robots.values())
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  getRobot(robotId: string): Robot | undefined {
    return this.robots.get(robotId);
  }

  getAvailableRobots(): Robot[] {
    return Array.from(this.robots.values())
      .filter(robot => robot.status === RobotStatus.IDLE);
  }

  updateRobotStatus(robotId: string, newStatus: RobotStatus, missionId?: string): boolean {
    const robot = this.robots.get(robotId);
    if (!robot) {
      console.error(`Robot ${robotId} not found`);
      return false;
    }

    const oldStatus = robot.status;
    
    // Record state transition
    const transition: RobotStateTransition = {
      robotId,
      fromStatus: oldStatus,
      toStatus: newStatus,
      timestamp: new Date(),
      missionId
    };
    this.stateHistory.push(transition);

    // Update robot
    robot.status = newStatus;
    robot.lastUpdated = new Date();
    
    if (missionId) {
      robot.currentMissionId = missionId;
    } else if (newStatus === RobotStatus.IDLE) {
      robot.currentMissionId = null;
    }

    console.log(`Robot ${robotId}: ${oldStatus} -> ${newStatus}${missionId ? ` (Mission: ${missionId})` : ''}`);
    
    // Emit event for real-time updates
    this.emit('robotStatusChanged', { robot, transition });
    
    return true;
  }

  assignMission(robotId: string, missionId: string): boolean {
    return this.updateRobotStatus(robotId, RobotStatus.ASSIGNED, missionId);
  }

  startMission(robotId: string): boolean {
    const robot = this.robots.get(robotId);
    if (!robot || robot.status !== RobotStatus.ASSIGNED) {
      return false;
    }
    return this.updateRobotStatus(robotId, RobotStatus.EN_ROUTE);
  }

  startDelivering(robotId: string): boolean {
    const robot = this.robots.get(robotId);
    if (!robot || robot.status !== RobotStatus.EN_ROUTE) {
      return false;
    }
    return this.updateRobotStatus(robotId, RobotStatus.DELIVERING);
  }

  completeMission(robotId: string): boolean {
    const robot = this.robots.get(robotId);
    if (!robot || robot.status !== RobotStatus.DELIVERING) {
      return false;
    }
    
    // First mark as completed, then return to idle
    this.updateRobotStatus(robotId, RobotStatus.COMPLETED);
    
    // After a brief delay, return to idle
    setTimeout(() => {
      this.updateRobotStatus(robotId, RobotStatus.IDLE);
    }, 5000); // 5 seconds delay
    
    return true;
  }

  cancelMission(robotId: string): boolean {
    const robot = this.robots.get(robotId);
    if (!robot || robot.status === RobotStatus.IDLE) {
      console.warn(`Cannot cancel mission for robot ${robotId}: Robot is not on a mission`);
      return false;
    }

    console.log(`Cancelling mission for robot ${robotId}`);
    return this.updateRobotStatus(robotId, RobotStatus.IDLE);
  }

  getRobotsByStatus(status: RobotStatus): Robot[] {
    return Array.from(this.robots.values())
      .filter(robot => robot.status === status);
  }

  getStateHistory(): RobotStateTransition[] {
    return [...this.stateHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Utility method to simulate battery drain and position updates
  simulateRobotUpdates(): void {
    this.robots.forEach((robot) => {
      // Simulate battery drain for active robots
      if (robot.status !== RobotStatus.IDLE && robot.battery && robot.battery > 0) {
        robot.battery = Math.max(0, robot.battery - 0.1);
      }

      // Simulate position updates for moving robots
      if (robot.status === RobotStatus.EN_ROUTE || robot.status === RobotStatus.DELIVERING) {
        if (robot.position) {
          robot.position.x += (Math.random() - 0.5) * 10;
          robot.position.y += (Math.random() - 0.5) * 10;
          robot.position.x = Math.max(0, Math.min(1000, robot.position.x));
          robot.position.y = Math.max(0, Math.min(1000, robot.position.y));
        }
      }
      
      robot.lastUpdated = new Date();
    });
  }

  getStatistics() {
    const stats = {
      total: this.robots.size,
      idle: 0,
      assigned: 0,
      enRoute: 0,
      delivering: 0,
      completed: 0,
      averageBattery: 0
    };

    let totalBattery = 0;
    
    this.robots.forEach(robot => {
      switch (robot.status) {
        case RobotStatus.IDLE:
          stats.idle++;
          break;
        case RobotStatus.ASSIGNED:
          stats.assigned++;
          break;
        case RobotStatus.EN_ROUTE:
          stats.enRoute++;
          break;
        case RobotStatus.DELIVERING:
          stats.delivering++;
          break;
        case RobotStatus.COMPLETED:
          stats.completed++;
          break;
      }
      totalBattery += robot.battery || 0;
    });

    stats.averageBattery = Math.round(totalBattery / this.robots.size);
    
    return stats;
  }
}
