import { Mission, MissionStatus } from '@/types';
import { MissionManager } from '@/core/mission';

describe('Mission', () => {
  let missionManager: MissionManager;

  beforeEach(() => {
    missionManager = new MissionManager();
  });

  describe('mission creation', () => {
    it('should create mission with correct initial state', () => {
      const mission = missionManager.createMission();
      
      expect(mission.id).toMatch(/^mission-/);
      expect(mission.status).toBe('created');
      expect(mission.createdAt).toBeInstanceOf(Date);
      expect(mission.estimatedDuration).toBeGreaterThan(0);
    });

    it('should create unique mission IDs', () => {
      const mission1 = missionManager.createMission();
      const mission2 = missionManager.createMission();
      
      expect(mission1.id).not.toBe(mission2.id);
    });
  });

  describe('mission lifecycle', () => {
    it('should transition through all states correctly', () => {
      const mission = missionManager.createMission();
      
      missionManager.assignMission(mission.id, 'robot-001');
      expect(missionManager.getMission(mission.id)?.status).toBe('assigned');
      
      missionManager.startMission(mission.id);
      expect(missionManager.getMission(mission.id)?.status).toBe('in_progress');
      
      missionManager.completeMission(mission.id);
      expect(missionManager.getMission(mission.id)?.status).toBe('completed');
    });

    it('should handle mission cancellation', () => {
      const mission = missionManager.createMission();
      missionManager.assignMission(mission.id, 'robot-001');
      
      missionManager.cancelMission(mission.id);
      expect(missionManager.getMission(mission.id)?.status).toBe('cancelled');
    });
  });

  describe('mission validation', () => {
    it('should reject invalid state transitions', () => {
      const mission = missionManager.createMission();
      
      // Try to complete without starting
      expect(() => missionManager.completeMission(mission.id)).toThrow();
    });

    it('should reject operations on non-existent missions', () => {
      expect(() => missionManager.startMission('invalid-id')).toThrow();
    });
  });
});