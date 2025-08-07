import { SimulationEngine } from '@/core/simulation-engine';
import { FleetManager } from '@/core/fleet-manager';
import { MissionManager } from '@/core/mission';

describe('SimulationEngine', () => {
  let simulationEngine: SimulationEngine;
  let fleetManager: FleetManager;
  let missionManager: MissionManager;

  beforeEach(() => {
    fleetManager = new FleetManager();
    missionManager = new MissionManager();
    simulationEngine = new SimulationEngine(fleetManager, missionManager);
    
    fleetManager.initializeFleet(10);
  });

  describe('simulation lifecycle', () => {
    it('should start and stop simulation', () => {
      simulationEngine.start();
      expect(simulationEngine.isRunning()).toBe(true);
      
      simulationEngine.stop();
      expect(simulationEngine.isRunning()).toBe(false);
    });

    it('should prevent multiple starts', () => {
      simulationEngine.start();
      expect(() => simulationEngine.start()).toThrow();
    });
  });

  describe('mission generation', () => {
    it('should create 2 missions every minute', () => {
      simulationEngine.start();
      
      // Fast-forward 1 minute
      jest.advanceTimersByTime(60000);
      
      const missions = missionManager.getAllMissions();
      expect(missions.length).toBe(2);
      
      simulationEngine.stop();
    });

    it('should continuously generate missions', () => {
      simulationEngine.start();
      
      // Fast-forward 3 minutes
      jest.advanceTimersByTime(180000);
      
      const missions = missionManager.getAllMissions();
      expect(missions.length).toBe(6);
      
      simulationEngine.stop();
    });
  });

  describe('state transitions', () => {
    it('should progress robot states over time', () => {
      simulationEngine.start();
      
      // Generate missions
      jest.advanceTimersByTime(60000);
      
      // Check that missions are assigned
      const robots = fleetManager.getAllRobots();
      const assignedRobots = robots.filter(r => r.getStatus() === 'assigned');
      expect(assignedRobots.length).toBe(2);
      
      // Fast-forward to allow state transitions
      jest.advanceTimersByTime(120000); // 2 more minutes
      
      // Check that robots have progressed through states
      const enRouteRobots = robots.filter(r => r.getStatus() === 'en_route');
      const deliveringRobots = robots.filter(r => r.getStatus() === 'delivering');
      
      expect(enRouteRobots.length + deliveringRobots.length).toBeGreaterThan(0);
      
      simulationEngine.stop();
    });
  });
});
