import { Router, Request, Response } from 'express';
import { DashboardService } from '@/services/dashboard-service';
import { Logger } from '@/utils/logger';

export function createRobotsRouter(dashboardService: DashboardService): Router {
  const router = Router();
  const logger = Logger.getInstance();

  // GET /api/robots - Get all robots
  router.get('/', (req: Request, res: Response) => {
    try {
      const dashboardData = dashboardService.getDashboardData();
      
      res.json({
        success: true,
        robots: dashboardData.robots,
        fleetStats: dashboardData.fleetStats,
        lastUpdated: dashboardData.lastUpdated
      });
    } catch (error) {
      logger.error('Error fetching robots:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch robots data'
      });
    }
  });

  // GET /api/robots/:id - Get specific robot details
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const robotId = req.params.id;
      const robotDetails = dashboardService.getRobotDetails(robotId);
      
      if (!robotDetails) {
        return res.status(404).json({
          success: false,
          error: 'Robot not found'
        });
      }

      res.json({
        success: true,
        data: robotDetails
      });
    } catch (error) {
      logger.error(`Error fetching robot ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch robot details'
      });
    }
  });

  // POST /api/robots/:id/cancel - Cancel robot's current mission
  router.post('/:id/cancel', (req: Request, res: Response) => {
    try {
      const robotId = req.params.id;
      const success = dashboardService.cancelRobotMission(robotId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Robot not found or has no active mission'
        });
      }

      logger.info(`Mission cancelled for robot ${robotId} via API`);
      
      res.json({
        success: true,
        message: `Mission cancelled for robot ${robotId}`
      });
    } catch (error) {
      logger.error(`Error cancelling mission for robot ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel robot mission'
      });
    }
  });

  return router;
}