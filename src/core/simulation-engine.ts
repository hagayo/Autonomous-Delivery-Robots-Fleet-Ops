import { FleetManager } from './fleet-manager';
import { MissionManager } from './mission';
import { Robot } from './robot';
import { RobotStatus } from '@/types';
import { Logger } from '@/utils/logger';
import { EventEmitter } from '@/utils/event-emitter';
import { TimeUtils } from '@/utils/time-utils';

export class SimulationEngine extends EventEmitter {
  private fleetManager: FleetManager;
  private missionManager: MissionManager;
  private logger: Logger;
  private isSimulationRunning: boolean = false;
  
  // Timers
  private missionGenerationTimer: NodeJS.Timeout | null = null;
  private stateTransitionTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  // Configuration
  private static readonly MISSION_GENERATION_INTERVAL = 60 * 1000; // 1 minute
  private static readonly STATE_TRANSITION_INTERVAL = 10 * 1000;   // 10 seconds
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000;        // 5 minutes
  
  // State transition timing (in milliseconds)
  private static readonly STATE_DURATIONS = {
    ASSIGNED_TO_EN_ROUTE: { min: 30000, max: 60000 },     // 30-60 seconds
    EN_ROUTE_TO_DELIVERING: { min: 60000, max: 120000 },   // 1-2 minutes
    DELIVERING_TO_COMPLETED: { min: 120000, max: 300000 }, // 2-5 minutes
    COMPLETED_TO_IDLE: { min: 10000, max: 30000 }          // 10-30 seconds
  };

  constructor(fleetManager: FleetManager, missionManager: MissionManager) {
    super();
    this.fleetManager = fleetManager;
    this.missionManager = missionManager;
    this.logger = Logger.getInstance();

    // Listen to fleet events
    this.fleetManager.on('robotStatusChanged', (data) => {
      this.emit('robotStatusChanged', data);
    });

    this.fleetManager.on('robotMissionCancelled', (data) => {
      this.missionManager.cancelMission(data.missionId);
      this.emit('missionCancelled', data);
    });
  }

  public start(): void {
    if (this.isSimulationRunning) {
      throw new Error('Simulation is already running');
    }

    this.isSimulationRunning = true;
    this.logger.info('Starting simulation engine');

    // Start mission generation (2 missions every minute)
    this.missionGenerationTimer = setInterval(() => {
      this.generateMissions();
    }, SimulationEngine.MISSION_GENERATION_INTERVAL);

    // Start state transitions processing
    this.stateTransitionTimer = setInterval(() => {
      this.processStateTransitions();
    }, SimulationEngine.STATE_TRANSITION_INTERVAL);

    // Start cleanup process
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, SimulationEngine.CLEANUP_INTERVAL);

    this.emit('simulationStarted');
    this.logger.info('Simulation engine started successfully');
  }

  public stop(): void {
    if (!this.isSimulationRunning) {
      this.logger.warn('Simulation is not running');
      return;
    }

    this.isSimulationRunning = false;
    this.logger.info('Stopping simulation engine');

    // Clear all timers
    if (this.missionGenerationTimer) {
      clearInterval(this.missionGenerationTimer);
      this.missionGenerationTimer = null;
    }

    if (this.stateTransitionTimer) {
      clearInterval(this.stateTransitionTimer);
      this.stateTransitionTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.emit('simulationStopped');
    this.logger.info('Simulation engine stopped');
  }

  public isRunning(): boolean {
    return this.isSimulationRunning;
  }

  private generateMissions(): void {
    try {
      // Generate 2 missions as specified in requirements
      for (let i = 0; i < 2; i++) {
        const mission = this.missionManager.createMission();
        
        // Try to assign to available robot immediately
        const robot = this.fleetManager.assignMissionToAvailableRobot(mission);
        
        if (robot) {
          this.missionManager.assignMission(mission.id, robot.getId());
          this.emit('missionAssigned', { missionId: mission.id, robotId: robot.getId() });
        } else {
          this.logger.debug(`Mission ${mission.id} created but no robots available`);
        }
      }
    } catch (error) {
      this.logger.error('Error generating missions:', error);
    }
  }

  private processStateTransitions(): void {
    try {
      this.processAssignedRobots();
      this.processEnRouteRobots();
      this.processDeliveringRobots();
      this.processCompletedRobots();
    } catch (error) {
      this.logger.error('Error processing state transitions:', error);
    }
  }

  private processAssignedRobots(): void {
    const assignedRobots = this.fleetManager.getRobotsByStatus(RobotStatus.ASSIGNED);
    
    for (const robot of assignedRobots) {
      const missionId = robot.getCurrentMissionId();
      if (!missionId) continue;

      const mission = this.missionManager.getMission(missionId);
      if (!mission || !mission.assignedAt) continue;

      const timeInState = Date.now() - mission.assignedAt.getTime();
      const transitionDelay = TimeUtils.getRandomDuration(
        SimulationEngine.STATE_DURATIONS.ASSIGNED_TO_EN_ROUTE.min,
        SimulationEngine.STATE_DURATIONS.ASSIGNED_TO_EN_ROUTE.max
      );

      if (timeInState >= transitionDelay) {
        robot.startMission();
        this.missionManager.startMission(missionId);
      }
    }
  }

  private processEnRouteRobots(): void {
    const enRouteRobots = this.fleetManager.getRobotsByStatus(RobotStatus.EN_ROUTE);
    
    for (const robot of enRouteRobots) {
      const missionId = robot.getCurrentMissionId();
      if (!missionId) continue;

      const mission = this.missionManager.getMission(missionId);
      if (!mission || !mission.startedAt) continue;

      const timeInState = Date.now() - mission.startedAt.getTime();
      const transitionDelay = TimeUtils.getRandomDuration(
        SimulationEngine.STATE_DURATIONS.EN_ROUTE_TO_DELIVERING.min,
        SimulationEngine.STATE_DURATIONS.EN_ROUTE_TO_DELIVERING.max
      );

      if (timeInState >= transitionDelay) {
        robot.startDelivering();
      }
    }
  }

  private processDeliveringRobots(): void {
    const deliveringRobots = this.fleetManager.getRobotsByStatus(RobotStatus.DELIVERING);
    
    for (const robot of deliveringRobots) {
      const missionId = robot.getCurrentMissionId();
      if (!missionId) continue;

      const mission = this.missionManager.getMission(missionId);
      if (!mission || !mission.startedAt) continue;

      const timeInState = Date.now() - mission.startedAt.getTime();
      const transitionDelay = TimeUtils.getRandomDuration(
        SimulationEngine.STATE_DURATIONS.DELIVERING_TO_COMPLETED.min,
        SimulationEngine.STATE_DURATIONS.DELIVERING_TO_COMPLETED.max
      );

      if (timeInState >= transitionDelay) {
        robot.completeMission();
        this.missionManager.completeMission(missionId);
      }
    }
  }

  private processCompletedRobots(): void {
    const completedRobots = this.fleetManager.getRobotsByStatus(RobotStatus.COMPLETED);
    
    for (const robot of completedRobots) {
      const missionId = robot.getCurrentMissionId();
      if (!missionId) continue;

      const mission = this.missionManager.getMission(missionId);
      if (!mission || !mission.completedAt) continue;

      const timeInState = Date.now() - mission.completedAt.getTime();
      const transitionDelay = TimeUtils.getRandomDuration(
        SimulationEngine.STATE_DURATIONS.COMPLETED_TO_IDLE.min,
        SimulationEngine.STATE_DURATIONS.COMPLETED_TO_IDLE.max
      );

      if (timeInState >= transitionDelay) {
        robot.returnToIdle();
      }
    }
  }

  private performCleanup(): void {
    try {
      // Clean up old completed missions (older than 1 hour)
      const cleanedMissions = this.missionManager.cleanupCompletedMissions(60 * 60 * 1000);
      
      if (cleanedMissions > 0) {
        this.logger.debug(`Cleaned up ${cleanedMissions} old missions`);
      }
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }
  }
}