import { FleetManager } from '@/core/fleet-manager';
import { MissionManager } from '@/core/mission';
import { SimulationEngine } from '@/core/simulation-engine';
import { DashboardService } from '@/services/dashboard-service';
import { createServer } from '@/api/server';
import { Logger, LogLevel } from '@/utils/logger';
import fs from 'fs';
import path from 'path';

async function main() {
  const logger = Logger.getInstance();
  logger.setLogLevel(LogLevel.INFO);

  try {
    logger.info('🚀 Starting FleetOps Dashboard...');

    // Create frontend files
    await createFrontendFiles();

    // Initialize core components
    const fleetManager = new FleetManager();
    const missionManager = new MissionManager();
    const dashboardService = new DashboardService(fleetManager, missionManager);
    
    // Initialize fleet with 100 robots as specified in requirements
    fleetManager.initializeFleet(100);
    logger.info('✅ Fleet initialized with 100 robots');

    // Create simulation engine
    const simulationEngine = new SimulationEngine(fleetManager, missionManager);
    
    // Create and configure server
    const app = createServer(dashboardService, fleetManager, missionManager);
    const port = parseInt(process.env.PORT || '3000', 10);

    // Start server
    const server = app.listen(port, () => {
      logger.info(`🌐 Server running on http://localhost:${port}`);
      logger.info('📊 Dashboard available at http://localhost:' + port);
    });

    // Start simulation
    simulationEngine.start();
    logger.info('⚡ Simulation engine started');

    // Graceful shutdown handling
    const shutdown = () => {
      logger.info('🛑 Shutting down gracefully...');
      
      simulationEngine.stop();
      logger.info('✅ Simulation engine stopped');
      
      server.close(() => {
        logger.info('✅ HTTP server closed');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('❌ Forced shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    logger.info('🎉 FleetOps Dashboard is ready!');
    
  } catch (error) {
    logger.error('❌ Failed to start FleetOps Dashboard:', error);
    process.exit(1);
  }
}

async function createFrontendFiles(): Promise<void> {
  const logger = Logger.getInstance();
  
  try {
    const frontendDir = path.join(__dirname, 'frontend', 'public');
    
    // Ensure directory exists
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }

    // Write HTML file
    const htmlPath = path.join(frontendDir, 'index.html');
    fs.writeFileSync(htmlPath, indexHtml.trim());

    // Write CSS file
    const cssPath = path.join(frontendDir, 'style.css');
    fs.writeFileSync(cssPath, styleCss.trim());

    // Write JavaScript file
    const jsPath = path.join(frontendDir, 'app.js');
    fs.writeFileSync(jsPath, appJs.trim());

    logger.info('✅ Frontend files created successfully');
  } catch (error) {
    logger.error('❌ Failed to create frontend files:', error);
    throw error;
  }
}

// Start the application
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main, createFrontendFiles };