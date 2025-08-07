import { FleetManager } from '@/core/fleet-manager';
import { RobotStatus } from '@/types';

describe('FleetManager', () => {
  let fleetManager: FleetManager;

  beforeEach(() => {
    fleetManager = new FleetManager();
  });

  describe('fleet initialization', () => {
    it('should initialize with specified number of robots', () => {
      fleetManager.initializeFleet(10);
      
      const robots = fleetManager.getAllRobots();
      expect(robots).toHaveLength(10);
      expect(robots.every(robot => robot.getStatus() === RobotStatus.IDLE)).toBe(true);
    });

    it('should handle large fleet sizes', () => {
      fleetManager.initializeFleet(100);
      
      const robots = fleetManager.getAllRobots();
      expect(robots).toHaveLength(100);
    });
  });

  describe('robot assignment', () => {
    beforeEach(() => {
      fleetManager.initializeFleet(5);
    });

    it('should find and assign idle robots', () => {
      const mission = { id: 'mission-001', status: 'created' as const, createdAt: new Date(), estimatedDuration: 300000 };
      
      const robot = fleetManager.assignMissionToAvailableRobot(mission);
      
      expect(robot).not.toBeNull();
      expect(robot?.getStatus()).toBe(RobotStatus.ASSIGNED);
      expect(robot?.getCurrentMissionId()).toBe('mission-001');
    });

    it('should return null when no robots available', () => {
      // Assign missions to all robots
      for (let i = 0; i < 5; i++) {
        const mission = { id: `mission-${i}`, status: 'created' as const, createdAt: new Date(), estimatedDuration: 300000 };
        fleetManager.assignMissionToAvailableRobot(mission);
      }
      
      const mission = { id: 'mission-extra', status: 'created' as const, createdAt: new Date(), estimatedDuration: 300000 };
      const robot = fleetManager.assignMissionToAvailableRobot(mission);
      
      expect(robot).toBeNull();
    });
  });

  describe('robot cancellation', () => {
    beforeEach(() => {
      fleetManager.initializeFleet(3);
    });

    it('should cancel robot mission by robot ID', () => {
      const mission = { id: 'mission-001', status: 'created' as const, createdAt: new Date(), estimatedDuration: 300000 };
      const robot = fleetManager.assignMissionToAvailableRobot(mission);
      
      const result = fleetManager.cancelRobotMission(robot!.getId());
      
      expect(result).toBe(true);
      expect(robot?.getStatus()).toBe(RobotStatus.IDLE);
    });

    it('should handle cancellation of non-existent robot', () => {
      const result = fleetManager.cancelRobotMission('invalid-robot');
      expect(result).toBe(false);
    });
  });

  describe('fleet statistics', () => {
    beforeEach(() => {
      fleetManager.initializeFleet(10);
    });

    it('should provide accurate fleet statistics', () => {
      // Assign some missions
      for (let i = 0; i < 3; i++) {
        const mission = { id: `mission-${i}`, status: 'created' as const, createdAt: new Date(), estimatedDuration: 300000 };
        fleetManager.assignMissionToAvailableRobot(mission);
      }
      
      const stats = fleetManager.getFleetStatistics();
      
      expect(stats.total).toBe(10);
      expect(stats.idle).toBe(7);
      expect(stats.assigned).toBe(3);
      expect(stats.en_route).toBe(0);
      expect(stats.delivering).toBe(0);
      expect(stats.completed).toBe(0);
    });
  });
});
