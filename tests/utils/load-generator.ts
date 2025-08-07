import { FleetManager } from '@/core/fleet-manager';
import { MissionManager } from '@/core/mission';

export interface LoadTestConfig {
  concurrentOperations: number;
  operationsPerSecond: number;
  durationSeconds: number;
  robotCount: number;
}

export class LoadGenerator {
  private fleetManager: FleetManager;
  private missionManager: MissionManager;

  constructor(fleetManager: FleetManager, missionManager: MissionManager) {
    this.fleetManager = fleetManager;
    this.missionManager = missionManager;
  }

  public async generateConcurrentMissionAssignments(
    count: number,
    delayMs: number = 0
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < count; i++) {
      promises.push(
        new Promise((resolve) => {
          setTimeout(() => {
            const mission = this.missionManager.createMission();
            this.fleetManager.assignMissionToAvailableRobot(mission);
            resolve();
          }, i * delayMs);
        })
      );
    }

    await Promise.all(promises);
  }

  public async generateRapidCancellations(
    robotIds: string[],
    intervalMs: number = 10
  ): Promise<void> {
    const promises = robotIds.map((robotId, index) => 
      new Promise<void>((resolve) => {
        setTimeout(() => {
          this.fleetManager.cancelRobotMission(robotId);
          resolve();
        }, index * intervalMs);
      })
    );

    await Promise.all(promises);
  }

  public simulateHighFrequencyOperations(
    config: LoadTestConfig
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let operationsCount = 0;
      const totalOperations = config.operationsPerSecond * config.durationSeconds;
      const operationInterval = 1000 / config.operationsPerSecond;

      const interval = setInterval(() => {
        try {
          // Mix of operations
          if (operationsCount % 3 === 0) {
            // Create and assign mission
            const mission = this.missionManager.createMission();
            this.fleetManager.assignMissionToAvailableRobot(mission);
          } else if (operationsCount % 3 === 1) {
            // Cancel random robot mission
            const robots = this.fleetManager.getActiveRobots();
            if (robots.length > 0) {
              const randomRobot = robots[Math.floor(Math.random() * robots.length)];
              this.fleetManager.cancelRobotMission(randomRobot.getId());
            }
          } else {
            // Query fleet statistics
            this.fleetManager.getFleetStatistics();
          }

          operationsCount++;

          if (operationsCount >= totalOperations) {
            clearInterval(interval);
            resolve();
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, operationInterval);
    });
  }
}