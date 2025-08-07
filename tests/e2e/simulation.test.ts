import { SimulationEngine } from '@/core/simulation-engine';
import { FleetManager } from '@/core/fleet-manager';
import { MissionManager } from '@/core/mission';

describe('End-to-End Simulation', () => {
  let simulationEngine: SimulationEngine;
  let fleetManager: FleetManager;
  let missionManager: MissionManager;

  beforeEach(() => {
    fleetManager = new FleetManager();
    missionManager = new MissionManager();
    simulationEngine = new SimulationEngine(fleetManager, missionManager);
    
    fleetManager.initializeFleet(100);
  });

  it('should handle 100 robot fleet simulation', () => {
    simulationEngine.start();
    
    // Run simulation for 10 minutes
    jest.advanceTimersByTime(600000);
    
    const robots = fleetManager.getAllRobots();
    const missions = missionManager.getAllMissions();
    const stats = fleetManager.getFleetStatistics();
    
    expect(robots.length).toBe(100);
    expect(missions.length).toBe(20); // 2 missions per minute * 10 minutes
    expect(stats.total).toBe(100);
    
    // Verify system stability
    expect(stats.idle + stats.assigned + stats.en_route + stats.delivering + stats.completed).toBe(100);
    
    simulationEngine.stop();
  });

  it('should maintain system performance under load', () => {
    const startTime = Date.now();
    
    simulationEngine.start();
    jest.advanceTimersByTime(300000); // 5 minutes
    simulationEngine.stop();
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    // Should complete in reasonable time (less than 1 second)
    expect(executionTime).toBeLessThan(1000);
  });

  it('should handle mission cancellations during simulation', () => {
    simulationEngine.start();
    
    // Generate some missions
    jest.advanceTimersByTime(120000); // 2 minutes
    
    const robots = fleetManager.getAllRobots();
    const busyRobots = robots.filter(r => r.getStatus() !== 'idle');
    
    // Cancel half of the busy robots
    const robotsToCancel = busyRobots.slice(0, Math.floor(busyRobots.length / 2));
    robotsToCancel.forEach(robot => {
      fleetManager.cancelRobotMission(robot.getId());
    });
    
    // Continue simulation
    jest.advanceTimersByTime(60000); // 1 more minute
    
    const finalStats = fleetManager.getFleetStatistics();
    
    // Verify cancelled robots are back to idle
    expect(finalStats.idle).toBeGreaterThanOrEqual(robotsToCancel.length);
    
    simulationEngine.stop();
  });
});
