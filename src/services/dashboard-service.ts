import { FleetManager } from '@/core/fleet-manager';
import { MissionManager } from '@/core/mission';
import { DashboardData } from '@/types';
import { Logger } from '@/utils/logger';
import { EventEmitter } from '@/utils/event-emitter';

export class DashboardService extends EventEmitter {
  private fleetManager: FleetManager;
  private missionManager: MissionManager;
  private logger: Logger;

  constructor(fleetManager: FleetManager, missionManager: MissionManager) {
    super();
    this.fleetManager = fleetManager;
    this.missionManager = missionManager;
    this.logger = Logger.getInstance();

    // Listen to fleet changes for real-time updates
    this.fleetManager.on('robotStatusChanged', () => {
      this.emit('dashboardUpdate', this.getDashboardData());
    });
  }

  public getDashboardData(): DashboardData {
    const robots = this.fleetManager.getAllRobots().map(robot => robot.toData());
    const fleetStats = this.fleetManager.getFleetStatistics();
    const activeMissions = this.missionManager.getActiveMissions();

    return {
      robots,
      fleetStats,
      activeMissions,
      lastUpdated: new Date()
    };
  }

  public cancelRobotMission(robotId: string): boolean {
    const result = this.fleetManager.cancelRobotMission(robotId);
    
    if (result) {
      this.emit('dashboardUpdate', this.getDashboardData());
    }
    
    return result;
  }

  public getRobotDetails(robotId: string) {
    const robot = this.fleetManager.getRobot(robotId);
    if (!robot) {
      return null;
    }

    const robotData = robot.toData();
    let missionData = null;

    if (robotData.currentMissionId) {
      missionData = this.missionManager.getMission(robotData.currentMissionId);
    }

    return {
      robot: robotData,
      mission: missionData
    };
  }
}