import { FleetManager } from '@/core/fleet-manager';
import { MissionManager } from '@/core/mission';
import { SimulationEngine } from '@/core/simulation-engine';
import { MemoryMonitor } from '../utils/memory-monitor';
import { LoadGenerator, LoadTestConfig } from '../utils/load-generator';

describe('Resource Exhaustion Testing', () => {
  let fleetManager: FleetManager;
  let missionManager: MissionManager;
  let simulationEngine: SimulationEngine;
  let memoryMonitor: MemoryMonitor;
  let loadGenerator: LoadGenerator;

  beforeEach(() => {
    fleetManager = new FleetManager();
    missionManager = new MissionManager();
    simulationEngine = new SimulationEngine(fleetManager, missionManager);
    memoryMonitor = new MemoryMonitor();
    loadGenerator = new LoadGenerator(fleetManager, missionManager);

    fleetManager.initializeFleet(100); // Full fleet for stress testing
  });

  afterEach(() => {
    simulationEngine.stop();
    memoryMonitor.stopMonitoring();
    memoryMonitor.clear();
  });

  test('should handle CPU overload scenarios', async () => {
    const config: LoadTestConfig = {
      concurrentOperations: 50,
      operationsPerSecond: 100,
      durationSeconds: 10,
      robotCount: 100
    };

    memoryMonitor.startMonitoring(250);
    simulationEngine.start();

    const startTime = Date.now();
    const cpuStartUsage = process.cpuUsage();

    // Generate high CPU load
    await loadGenerator.simulateHighFrequencyOperations(config);

    const endTime = Date.now();
    const cpuEndUsage = process.cpuUsage(cpuStartUsage);
    const actualDuration = endTime - startTime;

    // System should complete operations within reasonable time multiplier
    expect(actualDuration).toBeLessThan(config.durationSeconds * 2000); // Max 2x expected time

    // CPU usage should be reasonable (not indicating infinite loops)
    const totalCpuTime = (cpuEndUsage.user + cpuEndUsage.system) / 1000; // Convert to ms
    const cpuUtilization = totalCpuTime / actualDuration;
    expect(cpuUtilization).toBeLessThan(5.0); // Less than 500% CPU (reasonable for multi-core)

    // System should remain responsive
    const stats = fleetManager.getFleetStatistics();
    expect(stats.total).toBe(100);
  }, 25000);

  test('should gracefully handle memory pressure', async () => {
    memoryMonitor.startMonitoring(500);

    // Create memory pressure by generating large numbers of missions and operations
    const memoryPressureOperations = async () => {
      const largeDataSets = [];

      for (let i = 0; i < 1000; i++) {
        // Create missions with large estimated durations to stress object creation
        const mission = missionManager.createMission();
        
        // Create temporary large objects to simulate memory pressure
        const tempData = new Array(1000).fill(0).map((_, index) => ({
          id: `temp-${i}-${index}`,
          data: new Array(100).fill(`data-${i}-${index}`),
          timestamp: Date.now()
        }));
        
        largeDataSets.push(tempData);

        // Assign mission
        fleetManager.assignMissionToAvailableRobot(mission);

        // Periodically clean up to prevent actual memory exhaustion
        if (i % 100 === 0) {
          largeDataSets.splice(0, 50); // Remove half
          memoryMonitor.forceGC();
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      return largeDataSets;
    };

    await memoryPressureOperations();

    // Force garbage collection
    memoryMonitor.forceGC();
    await new Promise(resolve => setTimeout(resolve, 1000));

    memoryMonitor.stopMonitoring();

    // Check that system recovered and didn't crash
    const stats = fleetManager.getFleetStatistics();
    expect(stats.total).toBe(100);

    // Memory should not have leaked excessively
    const snapshots = memoryMonitor.getSnapshots();
    const hasLeak = memoryMonitor.detectMemoryLeak(2.0); // Allow 100% increase due to stress
    expect(hasLeak).toBe(false);

    // System should still be functional
    const mission = missionManager.createMission();
    const robot = fleetManager.assignMissionToAvailableRobot(mission);
    expect(robot).not.toBeNull();
  }, 20000);

  test('should handle event emitter overflow', async () => {
    let eventCount = 0;
    const maxEvents = 10000;

    // Add listener to count events
    const eventCounter = () => { eventCount++; };
    fleetManager.on('robotStatusChanged', eventCounter);
    simulationEngine.on('robotStatusChanged', eventCounter);

    // Generate many events rapidly
    const eventPromises: Promise<void>[] = [];
    for (let i = 0; i < maxEvents; i++) {
      eventPromises.push(
        new Promise((resolve) => {
          setTimeout(() => {
            const mission = missionManager.createMission();
            const robot = fleetManager.assignMissionToAvailableRobot(mission);
            if (robot) {
              missionManager.assignMission(mission.id, robot.getId());
              // This should trigger robotStatusChanged event
            }
            
            // Also trigger manual cancellation for more events
            if (i % 10 === 0) {
              const activeRobots = fleetManager.getActiveRobots();
              if (activeRobots.length > 0) {
                fleetManager.cancelRobotMission(activeRobots[0].getId());
              }
            }
            
            resolve();
          }, Math.floor(i / 10)); // Batch events to avoid overwhelming
        })
      );
    }

    await Promise.all(eventPromises);

    // Wait for all events to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // System should have processed many events without crashing
    expect(eventCount).toBeGreaterThan(100);
    expect(eventCount).toBeLessThan(maxEvents * 3); // Reasonable upper bound

    // System should still be functional
    const stats = fleetManager.getFleetStatistics();
    expect(stats.total).toBe(100);

    fleetManager.off('robotStatusChanged', eventCounter);
    simulationEngine.off('robotStatusChanged', eventCounter);
  });

  test('should handle timer overflow scenarios', async () => {
    // Create many short-lived timers to stress the event loop
    const timerPromises: Promise<void>[] = [];
    const timerCount = 1000;

    for (let i = 0; i < timerCount; i++) {
      timerPromises.push(
        new Promise((resolve) => {
          const timeout = setTimeout(() => {
            // Perform small operation
            fleetManager.getFleetStatistics();
            clearTimeout(timeout);
            resolve();
          }, Math.random() * 100); // Random delay 0-100ms
        })
      );
    }

    const startTime = Date.now();
    await Promise.all(timerPromises);
    const endTime = Date.now();

    // Should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(5000);

    // System should remain functional
    const mission = missionManager.createMission();
    expect(mission.id).toBeDefined();
  });

  test('should handle large fleet scaling limits', async () => {
    // Test with maximum reasonable fleet size
    const megaFleetManager = new FleetManager();
    const megaMissionManager = new MissionManager();
    
    memoryMonitor.startMonitoring(1000);
    
    // Initialize very large fleet
    const largeFleetSize = 1000;
    megaFleetManager.initializeFleet(largeFleetSize);

    // Perform operations on large fleet
    const startTime = Date.now();
    
    // Create missions for significant portion of fleet
    for (let i = 0; i < 500; i++) {
      const mission = megaMissionManager.createMission();
      megaFleetManager.assignMissionToAvailableRobot(mission);
    }

    // Query operations on large dataset
    for (let i = 0; i < 100; i++) {
      megaFleetManager.getFleetStatistics();
      megaFleetManager.getActiveRobots();
      megaFleetManager.getAvailableRobots();
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Operations should complete in reasonable time even with large fleet
    expect(duration).toBeLessThan(10000); // Less than 10 seconds

    // Verify fleet statistics are correct
    const stats = megaFleetManager.getFleetStatistics();
    expect(stats.total).toBe(largeFleetSize);
    expect(stats.assigned).toBeLessThanOrEqual(500);

    memoryMonitor.stopMonitoring();
    
    // Memory usage should be reasonable for large fleet
    const snapshots = memoryMonitor.getSnapshots();
    const finalMemory = snapshots[snapshots.length - 1];
    expect(finalMemory.heapUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
  }, 15000);

  test('should recover from simulated out-of-memory conditions', async () => {
    const recoveryTest = async () => {
      const tempArrays: any[][] = [];
      
      try {
        // Gradually increase memory usage
        for (let i = 0; i < 100; i++) {
          // Create large temporary arrays
          const largeArray = new Array(100000).fill(0).map((_, index) => ({
            id: `recovery-test-${i}-${index}`,
            data: `data-${Math.random()}`,
            nested: new Array(10).fill(Math.random())
          }));
          
          tempArrays.push(largeArray);

          // Test system functionality under memory pressure
          const mission = missionManager.createMission();
          const robot = fleetManager.assignMissionToAvailableRobot(mission);
          
          if (robot) {
            missionManager.assignMission(mission.id, robot.getId());
          }

          // Clean up periodically to prevent actual crash
          if (i % 20 === 0) {
            tempArrays.splice(0, 10);
            memoryMonitor.forceGC();
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      } catch (error) {
        // If we get an out-of-memory error, that's expected
        console.log('Memory pressure reached, testing recovery');
      }

      // Clear memory pressure
      tempArrays.length = 0;
      memoryMonitor.forceGC();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // System should recover and be functional
      const stats = fleetManager.getFleetStatistics();
      expect(stats.total).toBe(100);

      const mission = missionManager.createMission();
      const robot = fleetManager.assignMissionToAvailableRobot(mission);
      expect(robot).not.toBeNull();
    };

    await recoveryTest();
  }, 20000);
});
