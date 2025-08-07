import { FleetManager } from '@/core/fleet-manager';
import { MissionManager } from '@/core/mission';
import { SimulationEngine } from '@/core/simulation-engine';
import { MemoryMonitor } from '../utils/memory-monitor';
import { LoadGenerator } from '../utils/load-generator';

describe('Memory Leak Detection', () => {
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

    fleetManager.initializeFleet(50); // Smaller fleet for memory tests
  });

  afterEach(() => {
    memoryMonitor.stopMonitoring();
    simulationEngine.stop();
    memoryMonitor.clear();
  });

  test('should not leak memory during long-running simulation', async () => {
    // Start memory monitoring
    memoryMonitor.startMonitoring(500); // Monitor every 500ms
    
    // Start simulation
    simulationEngine.start();

    // Run for 30 seconds with continuous operations
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Stop monitoring and check for leaks
    memoryMonitor.stopMonitoring();
    
    // Force garbage collection before final check
    memoryMonitor.forceGC();
    await new Promise(resolve => setTimeout(resolve, 1000));

    const hasLeak = memoryMonitor.detectMemoryLeak(1.3); // 30% increase threshold
    const snapshots = memoryMonitor.getSnapshots();

    expect(snapshots.length).toBeGreaterThan(50); // Should have many snapshots
    expect(hasLeak).toBe(false);

    // Additional check: memory should stabilize
    const lastTenSnapshots = snapshots.slice(-10);
    const memoryVariance = lastTenSnapshots.reduce((variance, snapshot, index) => {
      if (index === 0) return 0;
      const diff = snapshot.heapUsed - lastTenSnapshots[index - 1].heapUsed;
      return variance + Math.abs(diff);
    }, 0) / (lastTenSnapshots.length - 1);

    // Memory variance should be reasonable (less than 1MB average change)
    expect(memoryVariance).toBeLessThan(1024 * 1024);
  }, 35000);

  test('should handle mission lifecycle without memory accumulation', async () => {
    memoryMonitor.startMonitoring(200);

    // Create, assign, complete, and cleanup many missions
    for (let cycle = 0; cycle < 100; cycle++) {
      // Create multiple missions
      for (let i = 0; i < 10; i++) {
        const mission = missionManager.createMission();
        const robot = fleetManager.assignMissionToAvailableRobot(mission);
        
        if (robot) {
          missionManager.assignMission(mission.id, robot.getId());
          
          // Simulate mission completion
          robot.startMission();
          robot.startDelivering();
          robot.completeMission();
          missionManager.completeMission(mission.id);
          robot.returnToIdle();
        }
      }

      // Cleanup old missions periodically
      if (cycle % 10 === 0) {
        missionManager.cleanupCompletedMissions(0); // Clean all completed
        memoryMonitor.forceGC();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    memoryMonitor.stopMonitoring();
    const hasLeak = memoryMonitor.detectMemoryLeak(1.2);
    
    expect(hasLeak).toBe(false);
  }, 15000);

  test('should handle event emitter memory leaks', async () => {
    memoryMonitor.startMonitoring(300);

    // Add and remove many event listeners
    for (let i = 0; i < 1000; i++) {
      const callback = () => {};
      
      // Add listeners
      fleetManager.on('robotStatusChanged', callback);
      simulationEngine.on('simulationStarted', callback);
      
      // Remove listeners
      fleetManager.off('robotStatusChanged', callback);
      simulationEngine.off('simulationStarted', callback);
    }

    memoryMonitor.forceGC();
    await new Promise(resolve => setTimeout(resolve, 1000));

    memoryMonitor.stopMonitoring();
    const hasLeak = memoryMonitor.detectMemoryLeak(1.1);
    
    expect(hasLeak).toBe(false);
  });
});
