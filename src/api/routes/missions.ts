import { Router, Request, Response } from 'express';
import { MissionManager } from '@/core/mission';
import { Logger } from '@/utils/logger';

export function createMissionsRouter(missionManager: MissionManager): Router {
  const router = Router();
  const logger = Logger.getInstance();

  // GET /api/missions - Get all missions
  router.get('/', (req: Request, res: Response) => {
    try {
      const { status, limit } = req.query;
      let missions = missionManager.getAllMissions();

      // Filter by status if provided
      if (status && typeof status === 'string') {
        missions = missions.filter(mission => mission.status === status);
      }

      // Apply limit if provided
      if (limit && typeof limit === 'string') {
        const limitNum = parseInt(limit, 10);
        if (!isNaN(limitNum) && limitNum > 0) {
          missions = missions.slice(0, limitNum);
        }
      }

      res.json({
        success: true,
        missions,
        total: missions.length
      });
    } catch (error) {
      logger.error('Error fetching missions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch missions data'
      });
    }
  });

  // GET /api/missions/active - Get active missions
  router.get('/active', (req: Request, res: Response) => {
    try {
      const activeMissions = missionManager.getActiveMissions();
      
      res.json({
        success: true,
        missions: activeMissions,
        total: activeMissions.length
      });
    } catch (error) {
      logger.error('Error fetching active missions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch active missions'
      });
    }
  });

  // GET /api/missions/:id - Get specific mission
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const missionId = req.params.id;
      const mission = missionManager.getMission(missionId);
      
      if (!mission) {
        return res.status(404).json({
          success: false,
          error: 'Mission not found'
        });
      }

      res.json({
        success: true,
        mission
      });
    } catch (error) {
      logger.error(`Error fetching mission ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch mission details'
      });
    }
  });

  return router;
}