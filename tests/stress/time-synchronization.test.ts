import { FleetManager } from '@/core/fleet-manager';
import { MissionManager } from '@/core/mission';
import { SimulationEngine } from '@/core/simulation-engine';
import { RobotStatus } from '@/types';
import { createMockTimer, waitForCondition } from '../utils/test-helpers';

describe('Time Synchronization and Clock Skew Testing', () => {
  let fleetManager: FleetManager;
  let missionManager: MissionManager;
  let simulationEngine: SimulationEngine;
  let mockTimer: ReturnType<typeof createMockTimer>;

  beforeEach(() => {
    fleetManager = new FleetManager();
    missionManager = new MissionManager();
    simulationEngine = new SimulationEngine(fleetManager, missionManager);
    mockTimer = createMockTimer();

    fleetManager.initializeFleet(20);
  });

  afterEach(() => {
    simulationEngine.stop();
    mockTimer.reset();
  });

  test('should handle clock skew in mission timestamps', async () => {
    // Create missions with different timestamp scenarios
    const mission1 = missionManager.createMission();
    const originalTime = mockTimer.currentTime;

    // Simulate clock going backwards (negative skew)
    mockTimer.advance(-5000); // Go back 5 seconds
    const mission2 = missionManager.createMission();

    // Simulate clock jumping forward (positive skew)  
    mockTimer.advance(15000); // Jump forward 10 seconds from original
    const mission3 = missionManager.createMission();

    // Reset to normal progression
    mockTimer.currentTime = originalTime + 1000;

    // All missions should be valid despite timestamp inconsistencies
    expect(mission1.createdAt).toBeInstanceOf(Date);
    expect(mission2.createdAt).toBeInstanceOf(Date);
    expect(mission3.createdAt).toBeInstanceOf(Date);

    // System should handle assignment regardless of timestamp issues
    const robot1 = fleetManager.assignMissionToAvailableRobot(mission1);
    const robot2 = fleetManager.assignMissionToAvailableRobot(mission2);
    const robot3 = fleetManager.assignMissionToAvailableRobot(mission3);

    expect(robot1).not.toBeNull();
    expect(robot2).not.toBeNull();
    expect(robot3).not.toBeNull();

    // Missions should be assignable and track-able
    if (robot1) missionManager.assignMission(mission1.id, robot1.getId());
    if (robot2) missionManager.assignMission(mission2.id, robot2.getId());
    if (robot3) missionManager.assignMission(mission3.id, robot3.getId());

    const activeMissions = missionManager.getActiveMissions();
    expect(activeMissions.length).toBe(3);
  });

  test('should handle rapid time changes during state transitions', async () => {
    // Assign mission to robot
    const robot = fleetManager.getAllRobots()[0];
    const mission = missionManager.createMission();
    robot.assignMission(mission);
    missionManager.assignMission(mission.id, robot.getId());

    const baseTime = mockTimer.currentTime;

    // Start normal transition
    mockTimer.advance(35000); // 35 seconds (within transition range)
    robot.startMission();
    missionManager.startMission(mission.id);

    expect(robot.getStatus()).toBe(RobotStatus.EN_ROUTE);
    expect(mission.status).toBe('in_progress');

    // Simulate time jumping backwards during next transition
    mockTimer.currentTime = baseTime + 30000; // Go back to earlier time
    
    // Continue with transition despite time inconsistency
    robot.startDelivering();
    expect(robot.getStatus()).toBe(RobotStatus.DELIVERING);

    // Jump time forward dramatically
    mockTimer.advance(300000); // 5 minutes forward
    robot.completeMission();
    missionManager.completeMission(mission.id);

    expect(robot.getStatus()).toBe(RobotStatus.COMPLETED);
    expect(mission.status).toBe('completed');

    // Final transition should work
    robot.returnToIdle();
    expect(robot.getStatus()).toBe(RobotStatus.IDLE);
  });

  test('should handle mission cleanup with inconsistent timestamps', async () => {
    const missions: string[] = [];

    // Create missions with various timestamp scenarios
    for (let i = 0; i < 10; i++) {
      if (i === 3) mockTimer.advance(-10000); // Clock goes backward
      if (i === 6) mockTimer.advance(50000);  // Clock jumps forward
      if (i === 8) mockTimer.advance(-5000);  // Clock goes backward again
      
      const mission = missionManager.createMission();
      const robot = fleetManager.assignMissionToAvailableRobot(mission);
      
      if (robot) {
        missionManager.assignMission(mission.id, robot.getId());
        
        // Simulate completion with current time
        robot.assignMission(mission);
        robot.startMission();
        missionManager.startMission(mission.id);
        robot.startDelivering();
        robot.completeMission();
        missionManager.completeMission(mission.id);
        robot.returnToIdle();
        
        missions.push(mission.id);
      }
      
      mockTimer.advance(1000); // Normal progression
    }

    // Attempt cleanup - should handle timestamp inconsistencies gracefully
    const cleanedCount = missionManager.cleanupCompletedMissions(0);
    expect(cleanedCount).toBeGreaterThan(0);

    // Remaining missions should still be accessible
    const allMissions = missionManager.getAllMissions();
    expect(allMissions.length).toBeLessThanOrEqual(missions.length);
  });

  test('should handle timer drift in simulation engine', async () => {
    const stateTransitions: Array<{ robotId: string; status: RobotStatus; timestamp: number }> = [];

    // Monitor state changes
    fleetManager.on('robotStatusChanged', (data) => {
      stateTransitions.push({
        robotId: data.robotId,
        status: data.status,
        timestamp: mockTimer.currentTime
      });
    });

    simulationEngine.start();

    // Simulate timer drift scenarios
    const driftScenarios = [
      { advance: 1000, description: 'normal tick' },
      { advance: 500, description: 'slower tick' },
      { advance: 2000, description: 'faster tick' },
      { advance: -500, description: 'backward drift' },
      { advance: 10000, description: 'major jump forward' },
      { advance: 100, description: 'return to normal' }
    ];

    for (const scenario of driftScenarios) {
      mockTimer.advance(scenario.advance);
      
      // Create some missions to trigger activity
      for (let i = 0; i < 3; i++) {
        const mission = missionManager.createMission();
        fleetManager.assignMissionToAvailableRobot(mission);
      }
      
      // Wait for potential state transitions
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait for simulation to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    simulationEngine.stop();

    // System should have handled timer drift without crashing
    expect(stateTransitions.length).toBeGreaterThan(0);

    // Verify system consistency despite time irregularities
    const stats = fleetManager.getFleetStatistics();
    expect(stats.total).toBe(20);
    
    // All robots should be in valid states
    const robots = fleetManager.getAllRobots();
    robots.forEach(robot => {
      expect(Object.values(RobotStatus)).toContain(robot.getStatus());
    });
  });

  test('should handle mission duration calculation with time skew', async () => {
    const robot = fleetManager.getAllRobots()[0];
    const mission = missionManager.createMission();
    
    // Record initial time
    const startTime = mockTimer.currentTime;
    
    robot.assignMission(mission);
    missionManager.assignMission(mission.id, robot.getId());

    // Simulate time going backward during mission
    mockTimer.advance(30000); // 30 seconds
    robot.startMission();
    missionManager.startMission(mission.id);

    mockTimer.advance(-10000); // Time goes backward 10 seconds
    robot.startDelivering();

    mockTimer.advance(120000); // Jump forward 2 minutes
    robot.completeMission();
    missionManager.completeMission(mission.id);

    const completedMission = missionManager.getMission(mission.id)!;
    
    // Mission should be marked as completed despite time inconsistencies
    expect(completedMission.status).toBe('completed');
    expect(completedMission.completedAt).toBeDefined();
    expect(completedMission.startedAt).toBeDefined();
    expect(completedMission.assignedAt).toBeDefined();

    // Duration calculations should not crash system
    const assignedTime = completedMission.assignedAt!.getTime();
    const completedTime = completedMission.completedAt!.getTime();
    
    // Even if duration is negative due to time skew, system should handle it
    const duration = completedTime - assignedTime;
    expect(typeof duration).toBe('number');
    expect(isFinite(duration)).toBe(true);
  });

  test('should handle concurrent operations with time synchronization issues', async () => {
    const operations: Promise<void>[] = [];
    const results: Array<{ operation: string; success: boolean; timestamp: number }> = [];

    // Create concurrent operations with time manipulation
    for (let i = 0; i < 20; i++) {
      operations.push(
        new Promise((resolve) => {
          setTimeout(() => {
            // Randomly manipulate time during operation
            if (Math.random() < 0.3) {
              mockTimer.advance(Math.random() * 10000 - 5000); // -5s to +5s
            }

            try {
              const mission = missionManager.createMission();
              const robot = fleetManager.assignMissionToAvailableRobot(mission);
              
              results.push({
                operation: `create_assign_${i}`,
                success: robot !== null,
                timestamp: mockTimer.currentTime
              });

              if (robot) {
                missionManager.assignMission(mission.id, robot.getId());
              }
            } catch (error) {
              results.push({
                operation: `create_assign_${i}`,
                success: false,
                timestamp: mockTimer.currentTime
              });
            }

            resolve();
          }, i * 10);
        })
      );
    }

    await Promise.all(operations);

    // Most operations should succeed despite time inconsistencies
    const successfulOps = results.filter(r => r.success);
    expect(successfulOps.length).toBeGreaterThan(results.length * 0.8); // At least 80% success

    // System should remain consistent
    const stats = fleetManager.getFleetStatistics();
    expect(stats.total).toBe(20);
  });

  test('should handle long-running operations with time zone changes', async () => {
    // Simulate a scenario where system time zone or DST changes during operation
    const robot = fleetManager.getAllRobots()[0];
    const mission = missionManager.createMission();
    
    robot.assignMission(mission);
    missionManager.assignMission(mission.id, robot.getId());

    // Simulate DST change (1 hour jump)
    mockTimer.advance(30000); // 30 seconds normal
    robot.startMission();
    missionManager.startMission(mission.id);

    mockTimer.advance(3600000); // Simulate 1-hour DST jump
    robot.startDelivering();

    mockTimer.advance(120000); // 2 minutes
    robot.completeMission();
    missionManager.completeMission(mission.id);

    mockTimer.advance(30000); // 30 seconds
    robot.returnToIdle();

    // Robot should complete full cycle despite time jump
    expect(robot.getStatus()).toBe(RobotStatus.IDLE);
    expect(robot.getCurrentMissionId()).toBeNull();

    const completedMission = missionManager.getMission(mission.id)!;
    expect(completedMission.status).toBe('completed');
  });
});