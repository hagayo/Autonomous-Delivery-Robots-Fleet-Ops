import { FleetManager } from '@/core/fleet-manager';
import { MissionManager } from '@/core/mission';
import { SimulationEngine } from '@/core/simulation-engine';
import { RobotStatus } from '@/types';
import { LoadGenerator } from '../utils/load-generator';

describe('Rapid Operations Edge Cases', () => {
  let fleetManager: FleetManager;
  let missionManager: MissionManager;
  let simulationEngine: SimulationEngine;
  let loadGenerator: LoadGenerator;

  beforeEach(() => {
    fleetManager = new FleetManager();
    missionManager = new MissionManager();
    simulationEngine = new SimulationEngine(fleetManager, missionManager);
    loadGenerator = new LoadGenerator(fleetManager, missionManager);

    fleetManager.initializeFleet(30);
  });

  afterEach(() => {
    simulationEngine.stop();
  });

  test('should handle rapid cancellation and re-assignment cycles', async () => {
    // Initial assignment phase
    const initialMissions: string[] = [];
    for (let i = 0; i < 20; i++) {
      const mission = missionManager.createMission();
      const robot = fleetManager.assignMissionToAvailableRobot(mission);
      if (robot) {
        missionManager.assignMission(mission.id, robot.getId());
        initialMissions.push(mission.id);
      }
    }

    expect(initialMissions.length).toBe(20);

    // Rapid cancellation/reassignment cycles
    for (let cycle = 0; cycle < 10; cycle++) {
      const activeRobots = fleetManager.getActiveRobots();
      
      // Cancel all active missions rapidly
      const cancellationPromises = activeRobots.map((robot, index) => 
        new Promise<void>((resolve) => {
          setTimeout(() => {
            fleetManager.cancelRobotMission(robot.getId());
            resolve();
          }, index * 5); // Very rapid - 5ms apart
        })
      );

      await Promise.all(cancellationPromises);

      // Immediately reassign new missions
      const reassignmentPromises: Promise<void>[] = [];
      for (let i = 0; i < 20; i++) {
        reassignmentPromises.push(
          new Promise((resolve) => {
            setTimeout(() => {
              const mission = missionManager.createMission();
              fleetManager.assignMissionToAvailableRobot(mission);
              resolve();
            }, i * 3); // Even more rapid - 3ms apart
          })
        );
      }

      await Promise.all(reassignmentPromises);

      // Verify system consistency after each cycle
      const stats = fleetManager.getFleetStatistics();
      expect(stats.total).toBe(30);
      
      const totalAccounted = stats.idle + stats.assigned + stats.en_route + 
                           stats.delivering + stats.completed;
      expect(totalAccounted).toBe(30);
    }
  });

  test('should handle burst mission creation and assignment', async () => {
    const burstSize = 100;
    const burstInterval = 1; // 1ms between operations

    // Create burst of missions
    const missionPromises: Promise<void>[] = [];
    for (let i = 0; i < burstSize; i++) {
      missionPromises.push(
        new Promise((resolve) => {
          setTimeout(() => {
            const mission = missionManager.createMission();
            fleetManager.assignMissionToAvailableRobot(mission);
            resolve();
          }, i * burstInterval);
        })
      );
    }

    const startTime = Date.now();
    await Promise.all(missionPromises);
    const endTime = Date.now();

    // Should complete quickly despite burst
    expect(endTime - startTime).toBeLessThan(5000); // Less than 5 seconds

    // Verify no more than fleet size missions were assigned
    const activeRobots = fleetManager.getActiveRobots();
    expect(activeRobots.length).toBeLessThanOrEqual(30);

    // Verify all assigned robots have valid missions
    activeRobots.forEach(robot => {
      const missionId = robot.getCurrentMissionId();
      expect(missionId).not.toBeNull();
      
      const mission = missionManager.getMission(missionId!);
      expect(mission).toBeDefined();
      expect(mission!.robotId).toBe(robot.getId());
    });
  });

  test('should handle immediate cancellation after assignment', async () => {
    const operations: Array<{ type: 'assign' | 'cancel'; robotId?: string; delay: number }> = [];
    
    // Create interleaved assign/cancel operations
    for (let i = 0; i < 50; i++) {
      if (i % 2 === 0) {
        operations.push({ type: 'assign', delay: i * 10 });
      } else {
        // Cancel the robot that was just assigned
        const robotIndex = Math.floor(i / 2);
        operations.push({ 
          type: 'cancel', 
          robotId: `robot-${(robotIndex % 30 + 1).toString().padStart(3, '0')}`,
          delay: i * 10 + 5 // Cancel 5ms after assignment
        });
      }
    }

    // Execute operations
    const promises = operations.map(op => 
      new Promise<void>((resolve) => {
        setTimeout(() => {
          if (op.type === 'assign') {
            const mission = missionManager.createMission();
            fleetManager.assignMissionToAvailableRobot(mission);
          } else if (op.type === 'cancel' && op.robotId) {
            fleetManager.cancelRobotMission(op.robotId);
          }
          resolve();
        }, op.delay);
      })
    );

    await Promise.all(promises);

    // System should remain consistent
    const stats = fleetManager.getFleetStatistics();
    expect(stats.total).toBe(30);
    
    // No robot should be in an invalid state
    const robots = fleetManager.getAllRobots();
    robots.forEach(robot => {
      const status = robot.getStatus();
      expect(Object.values(RobotStatus)).toContain(status);
      
      if (status === RobotStatus.IDLE) {
        expect(robot.getCurrentMissionId()).toBeNull();
      } else {
        expect(robot.getCurrentMissionId()).not.toBeNull();
      }
    });
  });

  test('should handle overlapping state transition attempts', async () => {
    // Assign missions to robots
    const robots = fleetManager.getAllRobots().slice(0, 10);
    for (const robot of robots) {
      const mission = missionManager.createMission();
      robot.assignMission(mission);
      missionManager.assignMission(mission.id, robot.getId());
    }

    // Attempt overlapping state transitions
    const transitionPromises = robots.map((robot, index) => {
      return Promise.all([
        // Attempt 1: Normal transition
        new Promise<void>((resolve) => {
          setTimeout(() => {
            try {
              robot.startMission();
              missionManager.startMission(robot.getCurrentMissionId()!);
            } catch (error) {
              // Expected if robot already transitioned
            }
            resolve();
          }, index * 20);
        }),
        
        // Attempt 2: Competing transition (should fail or be ignored)
        new Promise<void>((resolve) => {
          setTimeout(() => {
            try {
              robot.startMission(); // Should fail if already started
            } catch (error) {
              // Expected
            }
            resolve();
          }, index * 20 + 10);
        }),

        // Attempt 3: Cancel during transition
        new Promise<void>((resolve) => {
          setTimeout(() => {
            try {
              fleetManager.cancelRobotMission(robot.getId());
            } catch (error) {
              // May fail if robot is in non-cancellable state
            }
            resolve();
          }, index * 20 + 15);
        })
      ]);
    });

    await Promise.all(transitionPromises);

    // Verify all robots are in valid states
    robots.forEach(robot => {
      const status = robot.getStatus();
      expect(Object.values(RobotStatus)).toContain(status);
      
      // If robot has a mission, it should exist in mission manager
      const missionId = robot.getCurrentMissionId();
      if (missionId) {
        const mission = missionManager.getMission(missionId);
        expect(mission).toBeDefined();
      }
    });
  });

  test('should handle high-frequency status queries during operations', async () => {
    simulationEngine.start();

    const queryPromises: Promise<void>[] = [];
    const operationPromises: Promise<void>[] = [];

    // High-frequency queries
    for (let i = 0; i < 1000; i++) {
      queryPromises.push(
        new Promise((resolve) => {
          setTimeout(() => {
            // Various query operations
            fleetManager.getFleetStatistics();
            fleetManager.getActiveRobots();
            fleetManager.getAvailableRobots();
            missionManager.getActiveMissions();
            resolve();
          }, i * 5); // Every 5ms
        })
      );
    }

    // Concurrent operations
    for (let i = 0; i < 100; i++) {
      operationPromises.push(
        new Promise((resolve) => {
          setTimeout(() => {
            const mission = missionManager.createMission();
            const robot = fleetManager.assignMissionToAvailableRobot(mission);
            if (robot) {
              missionManager.assignMission(mission.id, robot.getId());
            }
            resolve();
          }, i * 50); // Every 50ms
        })
      );
    }

    const startTime = Date.now();
    await Promise.all([...queryPromises, ...operationPromises]);
    const endTime = Date.now();

    // Should complete within reasonable time despite high query frequency
    expect(endTime - startTime).toBeLessThan(10000); // Less than 10 seconds

    // System should remain consistent
    const finalStats = fleetManager.getFleetStatistics();
    expect(finalStats.total).toBe(30);
  });
});
