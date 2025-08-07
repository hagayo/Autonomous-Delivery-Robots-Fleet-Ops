import { FleetManager } from '@/core/fleet-manager';
import { MissionManager } from '@/core/mission';
import { RobotStatus } from '@/types';
import { LoadGenerator } from '../utils/load-generator';
import { TestEventCollector } from '../utils/test-helpers';

describe('Race Condition Testing', () => {
  let fleetManager: FleetManager;
  let missionManager: MissionManager;
  let loadGenerator: LoadGenerator;
  let eventCollector: TestEventCollector;

  beforeEach(() => {
    fleetManager = new FleetManager();
    missionManager = new MissionManager();
    loadGenerator = new LoadGenerator(fleetManager, missionManager);
    eventCollector = new TestEventCollector();

    fleetManager.initializeFleet(20);
    
    eventCollector.attachToEmitter(fleetManager, [
      'robotStatusChanged',
      'robotMissionCancelled'
    ]);
  });

  test('should handle concurrent mission assignments without double-booking', async () => {
    const concurrentAssignments = 50;
    
    // Generate many concurrent mission assignments
    await loadGenerator.generateConcurrentMissionAssignments(concurrentAssignments);

    // Wait for all operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify no robot is assigned to multiple missions
    const robots = fleetManager.getAllRobots();
    const assignedRobots = robots.filter(r => r.getStatus() !== RobotStatus.IDLE);
    const assignedMissionIds = assignedRobots
      .map(r => r.getCurrentMissionId())
      .filter(id => id !== null);

    // Check for duplicate mission assignments
    const uniqueMissionIds = new Set(assignedMissionIds);
    expect(assignedMissionIds.length).toBe(uniqueMissionIds.size);

    // Verify fleet statistics consistency
    const stats = fleetManager.getFleetStatistics();
    const calculatedTotal = stats.idle + stats.assigned + stats.en_route + 
                           stats.delivering + stats.completed;
    expect(calculatedTotal).toBe(stats.total);
  });

  test('should handle rapid cancellation/assignment cycles', async () => {
    // First, assign missions to some robots
    for (let i = 0; i < 15; i++) {
      const mission = missionManager.createMission();
      const robot = fleetManager.assignMissionToAvailableRobot(mission);
      if (robot) {
        missionManager.assignMission(mission.id, robot.getId());
      }
    }

    const activeRobots = fleetManager.getActiveRobots();
    const robotIds = activeRobots.map(r => r.getId());

    // Rapidly cancel and reassign missions
    for (let cycle = 0; cycle < 5; cycle++) {
      // Cancel all missions
      await loadGenerator.generateRapidCancellations(robotIds, 5);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reassign new missions
      await loadGenerator.generateConcurrentMissionAssignments(robotIds.length);
      
      // Verify consistency
      const stats = fleetManager.getFleetStatistics();
      const total = stats.idle + stats.assigned + stats.en_route + 
                   stats.delivering + stats.completed;
      expect(total).toBe(20);
    }
  });

  test('should maintain data integrity under concurrent state changes', async () => {
    const concurrentOperations = async () => {
      const promises: Promise<void>[] = [];

      // Concurrent mission creations
      for (let i = 0; i < 20; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            const mission = missionManager.createMission();
            fleetManager.assignMissionToAvailableRobot(mission);
            resolve();
          })
        );
      }

      // Concurrent cancellations
      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              const activeRobots = fleetManager.getActiveRobots();
              if (activeRobots.length > 0) {
                const randomRobot = activeRobots[
                  Math.floor(Math.random() * activeRobots.length)
                ];
                fleetManager.cancelRobotMission(randomRobot.getId());
              }
              resolve();
            }, Math.random() * 100);
          })
        );
      }

      // Concurrent status queries
      for (let i = 0; i < 30; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            fleetManager.getFleetStatistics();
            fleetManager.getActiveRobots();
            resolve();
          })
        );
      }

      await Promise.all(promises);
    };

    // Run concurrent operations multiple times
    for (let run = 0; run < 3; run++) {
      await concurrentOperations();
      
      // Verify system is still consistent
      const stats = fleetManager.getFleetStatistics();
      expect(stats.total).toBe(20);
      
      const robots = fleetManager.getAllRobots();
      expect(robots.length).toBe(20);
      
      // Verify no orphaned missions
      const activeMissions = missionManager.getActiveMissions();
      const activeRobots = fleetManager.getActiveRobots();
      const robotMissionIds = activeRobots
        .map(r => r.getCurrentMissionId())
        .filter(id => id !== null);
      
      activeMissions.forEach(mission => {
        if (mission.robotId) {
          expect(robotMissionIds).toContain(mission.id);
        }
      });
    }
  });

  test('should handle simultaneous robot state transitions', async () => {
    // Assign missions to all robots
    const robots = fleetManager.getAllRobots();
    for (const robot of robots) {
      const mission = missionManager.createMission();
      robot.assignMission(mission);
      missionManager.assignMission(mission.id, robot.getId());
    }

    // Simultaneously trigger state transitions
    const transitionPromises = robots.map((robot, index) => 
      new Promise<void>((resolve) => {
        setTimeout(() => {
          try {
            if (robot.getStatus() === RobotStatus.ASSIGNED) {
              robot.startMission();
              missionManager.startMission(robot.getCurrentMissionId()!);
            }
          } catch (error) {
            // Expected if robot state changed due to race condition
          }
          resolve();
        }, index * 10); // Stagger slightly
      })
    );

    await Promise.all(transitionPromises);

    // Verify system consistency
    const stats = fleetManager.getFleetStatistics();
    expect(stats.total).toBe(robots.length);
    
    // All robots should either be assigned or en_route (not both states for one robot)
    robots.forEach(robot => {
      const status = robot.getStatus();
      expect([
        RobotStatus.ASSIGNED, 
        RobotStatus.EN_ROUTE
      ]).toContain(status);
    });
  });
});