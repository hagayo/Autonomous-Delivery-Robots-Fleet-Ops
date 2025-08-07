import { Robot } from '@/core/robot';
import { RobotStatus, Mission } from '@/types';

describe('Robot', () => {
  let robot: Robot;

  beforeEach(() => {
    robot = new Robot('robot-001');
  });

  describe('initialization', () => {
    it('should create robot with idle status', () => {
      expect(robot.getId()).toBe('robot-001');
      expect(robot.getStatus()).toBe(RobotStatus.IDLE);
      expect(robot.getCurrentMissionId()).toBeNull();
    });

    it('should have valid creation timestamp', () => {
      expect(robot.getCreatedAt()).toBeInstanceOf(Date);
    });
  });

  describe('mission assignment', () => {
    it('should accept mission when idle', () => {
      const mission: Mission = {
        id: 'mission-001',
        status: 'created',
        createdAt: new Date(),
        estimatedDuration: 300000
      };

      const result = robot.assignMission(mission);
      expect(result).toBe(true);
      expect(robot.getStatus()).toBe(RobotStatus.ASSIGNED);
      expect(robot.getCurrentMissionId()).toBe('mission-001');
    });

    it('should reject mission when not idle', () => {
      const mission1: Mission = { id: 'mission-001', status: 'created', createdAt: new Date(), estimatedDuration: 300000 };
      const mission2: Mission = { id: 'mission-002', status: 'created', createdAt: new Date(), estimatedDuration: 300000 };
      
      robot.assignMission(mission1);
      const result = robot.assignMission(mission2);
      
      expect(result).toBe(false);
      expect(robot.getCurrentMissionId()).toBe('mission-001');
    });
  });

  describe('state transitions', () => {
    beforeEach(() => {
      const mission: Mission = { id: 'mission-001', status: 'created', createdAt: new Date(), estimatedDuration: 300000 };
      robot.assignMission(mission);
    });

    it('should transition from assigned to en_route', () => {
      robot.startMission();
      expect(robot.getStatus()).toBe(RobotStatus.EN_ROUTE);
    });

    it('should transition from en_route to delivering', () => {
      robot.startMission();
      robot.startDelivering();
      expect(robot.getStatus()).toBe(RobotStatus.DELIVERING);
    });

    it('should transition from delivering to completed', () => {
      robot.startMission();
      robot.startDelivering();
      robot.completeMission();
      expect(robot.getStatus()).toBe(RobotStatus.COMPLETED);
    });

    it('should return to idle after completion', () => {
      robot.startMission();
      robot.startDelivering();
      robot.completeMission();
      robot.returnToIdle();
      
      expect(robot.getStatus()).toBe(RobotStatus.IDLE);
      expect(robot.getCurrentMissionId()).toBeNull();
    });
  });

  describe('mission cancellation', () => {
    it('should cancel mission and return to idle', () => {
      const mission: Mission = { id: 'mission-001', status: 'created', createdAt: new Date(), estimatedDuration: 300000 };
      robot.assignMission(mission);
      robot.startMission();

      robot.cancelCurrentMission();
      
      expect(robot.getStatus()).toBe(RobotStatus.IDLE);
      expect(robot.getCurrentMissionId()).toBeNull();
    });

    it('should handle cancellation in any state', () => {
      const mission: Mission = { id: 'mission-001', status: 'created', createdAt: new Date(), estimatedDuration: 300000 };
      robot.assignMission(mission);
      robot.startMission();
      robot.startDelivering();

      robot.cancelCurrentMission();
      
      expect(robot.getStatus()).toBe(RobotStatus.IDLE);
    });
  });
});