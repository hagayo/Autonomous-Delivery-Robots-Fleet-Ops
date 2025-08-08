import { Mission, MissionStatus, MissionType, MissionStateTransition, Location } from '../types/mission.types.js';
import { RobotService } from './robot-service.js';
import { RobotStatus } from '../types/robot.types.js';
import { EventEmitter } from 'events';

export class MissionService extends EventEmitter {
  private missions: Map<string, Mission> = new Map();
  private stateHistory: MissionStateTransition[] = [];
  private missionCounter: number = 1;
  private robotService: RobotService;
  private missionCreationInterval?: NodeJS.Timeout;
  private missionProcessingInterval?: NodeJS.Timeout;

  // Predefined locations for missions
  private locations: Location[] = [
    { id: 'LOC-001', name: 'Emergency Room', coordinates: { x: 100, y: 100, floor: 1 } },
    { id: 'LOC-002', name: 'Pharmacy', coordinates: { x: 200, y: 150, floor: 1 } },
    { id: 'LOC-003', name: 'ICU Ward', coordinates: { x: 300, y: 200, floor: 2 } },
    { id: 'LOC-004', name: 'Surgery Room A', coordinates: { x: 150, y: 300, floor: 2 } },
    { id: 'LOC-005', name: 'Cafeteria', coordinates: { x: 400, y: 100, floor: 1 } },
    { id: 'LOC-006', name: 'Laboratory', coordinates: { x: 250, y: 400, floor: 3 } },
    { id: 'LOC-007', name: 'Radiology', coordinates: { x: 350, y: 250, floor: 2 } },
    { id: 'LOC-008', name: 'Reception', coordinates: { x: 50, y: 50, floor: 1 } },
    { id: 'LOC-009', name: 'Storage Room', coordinates: { x: 450, y: 350, floor: 3 } },
    { id: 'LOC-010', name: 'Patient Room 301', coordinates: { x: 180, y: 280, floor: 3 } }
  ];

  constructor(robotService: RobotService) {
    super();
    this.robotService = robotService;
    this.startMissionGeneration();
    this.startMissionProcessing();
  }

  private startMissionGeneration(): void {
    // Create 2 new missions every minute
    this.missionCreationInterval = setInterval(() => {
      this.createRandomMission();
      this.createRandomMission();
    }, 60000); // 60 seconds

    // Create some initial missions for testing
    this.createRandomMission();
    this.createRandomMission();
  }

  private startMissionProcessing(): void {
    // Process missions every 10 seconds
    this.missionProcessingInterval = setInterval(() => {
      this.processMissions();
    }, 10000);
  }

  private createRandomMission(): void {
    const missionTypes = Object.values(MissionType);
    const randomType = missionTypes[Math.floor(Math.random() * missionTypes.length)];
    
    const origin = this.locations[Math.floor(Math.random() * this.locations.length)];
    let destination = this.locations[Math.floor(Math.random() * this.locations.length)];
    
    // Ensure origin and destination are different
    while (destination.id === origin.id) {
      destination = this.locations[Math.floor(Math.random() * this.locations.length)];
    }

    const mission: Mission = {
      id: `MISSION-${this.missionCounter.toString().padStart(6, '0')}`,
      type: randomType,
      status: MissionStatus.PENDING,
      assignedRobotId: null,
      createdAt: new Date(),
      assignedAt: null,
      startedAt: null,
      completedAt: null,
      priority: Math.floor(Math.random() * 5) + 1, // 1-5 priority
      origin,
      destination,
      estimatedDuration: this.calculateEstimatedDuration(origin, destination),
      payload: this.generatePayloadDescription(randomType),
      instructions: this.generateInstructions(randomType)
    };

    this.missions.set(mission.id, mission);
    this.missionCounter++;

    console.log(`Created new mission: ${mission.id} (${mission.type}) from ${mission.origin.name} to ${mission.destination.name}`);
    
    this.emit('missionCreated', mission);
    
    // Try to assign immediately
    this.tryAssignMission(mission.id);
  }

  private calculateEstimatedDuration(origin: Location, destination: Location): number {
    const distance = Math.sqrt(
      Math.pow(destination.coordinates.x - origin.coordinates.x, 2) +
      Math.pow(destination.coordinates.y - origin.coordinates.y, 2) +
      Math.pow((destination.coordinates.floor - origin.coordinates.floor) * 100, 2)
    );
    
    // Base time: 2-8 minutes depending on distance and floor changes
    const baseTime = Math.max(2, Math.min(8, distance / 100));
    
    // Add floor change penalty
    const floorChangePenalty = Math.abs(destination.coordinates.floor - origin.coordinates.floor) * 1.5;
    
    return Math.round(baseTime + floorChangePenalty);
  }

  private generatePayloadDescription(type: MissionType): string {
    const payloads = {
      [MissionType.DELIVERY]: ['Medical supplies', 'Patient meals', 'Laboratory samples', 'Medication', 'Documents'],
      [MissionType.PICKUP]: ['Lab results', 'Used equipment', 'Waste materials', 'Patient belongings', 'Supplies'],
      [MissionType.MAINTENANCE]: ['Cleaning supplies', 'Repair tools', 'Replacement parts', 'Inspection equipment'],
      [MissionType.PATROL]: ['Security scan', 'Temperature check', 'Equipment status', 'Safety inspection']
    };
    
    const options = payloads[type];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateInstructions(type: MissionType): string {
    const instructions = {
      [MissionType.DELIVERY]: ['Handle with care', 'Deliver to nurse station', 'Urgent delivery', 'Contact recipient upon arrival'],
      [MissionType.PICKUP]: ['Check contents before pickup', 'Return to designated area', 'Handle fragile items carefully'],
      [MissionType.MAINTENANCE]: ['Perform routine check', 'Report any anomalies', 'Follow safety protocols'],
      [MissionType.PATROL]: ['Complete security sweep', 'Check all access points', 'Record observations']
    };
    
    const options = instructions[type];
    return options[Math.floor(Math.random() * options.length)];
  }

  private processMissions(): void {
    this.missions.forEach((mission) => {
      switch (mission.status) {
        case MissionStatus.PENDING:
          this.tryAssignMission(mission.id);
          break;
        case MissionStatus.ASSIGNED:
          this.tryStartMission(mission.id);
          break;
        case MissionStatus.IN_PROGRESS:
          this.tryProgressMission(mission.id);
          break;
      }
    });
  }

  private tryAssignMission(missionId: string): void {
    const mission = this.missions.get(missionId);
    if (!mission || mission.status !== MissionStatus.PENDING) {
      return;
    }

    const availableRobots = this.robotService.getAvailableRobots();
    if (availableRobots.length === 0) {
      return;
    }

    // Find the closest available robot
    const closestRobot = availableRobots.reduce((closest, robot) => {
      if (!robot.position || !closest.position) return robot;
      
      const distanceToRobot = Math.sqrt(
        Math.pow(mission.origin.coordinates.x - robot.position.x, 2) +
        Math.pow(mission.origin.coordinates.y - robot.position.y, 2)
      );
      
      const distanceToClosest = Math.sqrt(
        Math.pow(mission.origin.coordinates.x - closest.position.x, 2) +
        Math.pow(mission.origin.coordinates.y - closest.position.y, 2)
      );
      
      return distanceToRobot < distanceToClosest ? robot : closest;
    });

    // Assign mission to robot
    if (this.robotService.assignMission(closestRobot.id, mission.id)) {
      this.updateMissionStatus(mission.id, MissionStatus.ASSIGNED, closestRobot.id);
    }
  }

  private tryStartMission(missionId: string): void {
    const mission = this.missions.get(missionId);
    if (!mission || !mission.assignedRobotId || mission.status !== MissionStatus.ASSIGNED) {
      return;
    }

    // Random delay before starting (0-30 seconds)
    const delay = Math.random() * 30000;
    
    setTimeout(() => {
      if (this.robotService.startMission(mission.assignedRobotId!)) {
        this.updateMissionStatus(mission.id, MissionStatus.IN_PROGRESS);
        mission.startedAt = new Date();
      }
    }, delay);
  }

  private tryProgressMission(missionId: string): void {
    const mission = this.missions.get(missionId);
    if (!mission || !mission.assignedRobotId || mission.status !== MissionStatus.IN_PROGRESS) {
      return;
    }

    const robot = this.robotService.getRobot(mission.assignedRobotId);
    if (!robot) return;

    // Progress through robot states
    if (robot.status === RobotStatus.EN_ROUTE) {
      // Random chance to start delivering (simulates reaching destination)
      if (Math.random() < 0.3) { // 30% chance every 10 seconds
        this.robotService.startDelivering(robot.id);
      }
    } else if (robot.status === RobotStatus.DELIVERING) {
      // Random chance to complete delivery
      if (Math.random() < 0.4) { // 40% chance every 10 seconds
        this.robotService.completeMission(robot.id);
        this.updateMissionStatus(mission.id, MissionStatus.COMPLETED);
        mission.completedAt = new Date();
        if (mission.startedAt) {
          mission.actualDuration = Math.round((mission.completedAt.getTime() - mission.startedAt.getTime()) / 60000);
        }
      }
    }
  }

  private updateMissionStatus(missionId: string, newStatus: MissionStatus, robotId?: string): boolean {
    const mission = this.missions.get(missionId);
    if (!mission) {
      console.error(`Mission ${missionId} not found`);
      return false;
    }

    const oldStatus = mission.status;
    
    // Record state transition
    const transition: MissionStateTransition = {
      missionId,
      fromStatus: oldStatus,
      toStatus: newStatus,
      timestamp: new Date(),
      robotId: robotId || mission.assignedRobotId || undefined
    };
    this.stateHistory.push(transition);

    // Update mission
    mission.status = newStatus;
    
    if (robotId) {
      mission.assignedRobotId = robotId;
      mission.assignedAt = new Date();
    }

    console.log(`Mission ${missionId}: ${oldStatus} -> ${newStatus}${robotId ? ` (Robot: ${robotId})` : ''}`);
    
    // Emit event for real-time updates
    this.emit('missionStatusChanged', { mission, transition });
    
    return true;
  }

  // Public methods
  getAllMissions(): Mission[] {
    return Array.from(this.missions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getMission(missionId: string): Mission | undefined {
    return this.missions.get(missionId);
  }

  getMissionsByStatus(status: MissionStatus): Mission[] {
    return Array.from(this.missions.values())
      .filter(mission => mission.status === status);
  }

  getMissionsByRobot(robotId: string): Mission[] {
    return Array.from(this.missions.values())
      .filter(mission => mission.assignedRobotId === robotId);
  }

  cancelMission(missionId: string): boolean {
    const mission = this.missions.get(missionId);
    if (!mission) {
      console.error(`Mission ${missionId} not found`);
      return false;
    }

    if (mission.status === MissionStatus.COMPLETED || mission.status === MissionStatus.CANCELLED) {
      console.warn(`Cannot cancel mission ${missionId}: Mission is already ${mission.status}`);
      return false;
    }

    // Cancel robot's current mission if assigned
    if (mission.assignedRobotId) {
      this.robotService.cancelMission(mission.assignedRobotId);
    }

    // Update mission status
    this.updateMissionStatus(missionId, MissionStatus.CANCELLED);
    
    console.log(`Mission ${missionId} has been cancelled`);
    return true;
  }

  getStateHistory(): MissionStateTransition[] {
    return [...this.stateHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getStatistics() {
    const stats = {
      total: this.missions.size,
      pending: 0,
      assigned: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      failed: 0,
      averageCompletionTime: 0
    };

    let completedMissions = 0;
    let totalCompletionTime = 0;

    this.missions.forEach(mission => {
      switch (mission.status) {
        case MissionStatus.PENDING:
          stats.pending++;
          break;
        case MissionStatus.ASSIGNED:
          stats.assigned++;
          break;
        case MissionStatus.IN_PROGRESS:
          stats.inProgress++;
          break;
        case MissionStatus.COMPLETED:
          stats.completed++;
          if (mission.actualDuration) {
            completedMissions++;
            totalCompletionTime += mission.actualDuration;
          }
          break;
        case MissionStatus.CANCELLED:
          stats.cancelled++;
          break;
        case MissionStatus.FAILED:
          stats.failed++;
          break;
      }
    });

    if (completedMissions > 0) {
      stats.averageCompletionTime = Math.round(totalCompletionTime / completedMissions);
    }

    return stats;
  }

  // Cleanup method
  destroy(): void {
    if (this.missionCreationInterval) {
      clearInterval(this.missionCreationInterval);
    }
    if (this.missionProcessingInterval) {
      clearInterval(this.missionProcessingInterval);
    }
  }
}
