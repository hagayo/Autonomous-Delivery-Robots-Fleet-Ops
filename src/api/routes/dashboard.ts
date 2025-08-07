import { Router, Request, Response } from 'express';
import { DashboardService } from '@/services/dashboard-service';
import { Logger } from '@/utils/logger';

export function createDashboardRouter(dashboardService: DashboardService): Router {
  const router = Router();
  const logger = Logger.getInstance();

  // GET /api/dashboard - Get complete dashboard data
  router.get('/', (req: Request, res: Response) => {
    try {
      const dashboardData = dashboardService.getDashboardData();
      
      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data'
      });
    }
  });

  // GET /api/dashboard/stats - Get fleet statistics only
  router.get('/stats', (req: Request, res: Response) => {
    try {
      const dashboardData = dashboardService.getDashboardData();
      
      res.json({
        success: true,
        fleetStats: dashboardData.fleetStats,
        activeMissionsCount: dashboardData.activeMissions.length,
        lastUpdated: dashboardData.lastUpdated
      });
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard statistics'
      });
    }
  });

  return router;
}