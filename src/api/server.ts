import express from 'express';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/error-handler';
import { createRobotsRouter } from './routes/robots';
import { createMissionsRouter } from './routes/missions';
import { createDashboardRouter } from './routes/dashboard';
import { DashboardService } from '@/services/dashboard-service';
import { FleetManager } from '@/core/fleet-manager';
import { MissionManager } from '@/core/mission';
import { Logger } from '@/utils/logger';
import path from 'path';

export function createServer(
  dashboardService: DashboardService,
  fleetManager: FleetManager,
  missionManager: MissionManager
): express.Application {
  const app = express();
  const logger = Logger.getInstance();

  // Middleware
  app.use(corsMiddleware);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files
  app.use(express.static(path.join(__dirname, '../frontend/public')));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // API routes
  app.use('/api/robots', createRobotsRouter(dashboardService));
  app.use('/api/missions', createMissionsRouter(missionManager));
  app.use('/api/dashboard', createDashboardRouter(dashboardService));

  // Root route - serve dashboard
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
  });

  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found'
    });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}