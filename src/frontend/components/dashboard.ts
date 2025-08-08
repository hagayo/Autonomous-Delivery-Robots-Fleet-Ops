import { RobotTable } from './robot-table.js';
import { MissionControls } from './mission-controls.js';
import { Robot, RobotStatus } from '../../types/robot.types.js';
import { Mission } from '../../types/mission.types.js';

export class Dashboard {
  private robotTable: RobotTable;
  private missionControls: MissionControls;
  private wsConnection?: WebSocket;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.createLayout();
    this.initializeComponents();
    this.connectWebSocket();
    this.addStyles();
    this.setupEventListeners();
  }

  private createLayout(): void {
    document.body.innerHTML = `
      <div class="dashboard-container">
        <header class="dashboard-header">
          <div class="header-content">
            <h1 class="dashboard-title">FleetOps Dashboard</h1>
            <div class="connection-status" id="connection-status">
              <span class="status-indicator" id="status-indicator"></span>
              <span class="status-text" id="status-text">Connecting...</span>
            </div>
          </div>
        </header>

        <main class="dashboard-main">
          <div class="dashboard-grid">
            <section class="robots-section">
              <div class="section-header">
                <h2>Robot Fleet Status</h2>
                <div class="robot-controls">
                  <input 
                    type="text" 
                    id="robot-search" 
                    placeholder="Search robots..." 
                    class="search-input"
                  >
                  <select id="status-filter" class="filter-select">
                    <option value="">All Statuses</option>
                    <option value="idle">Idle</option>
                    <option value="assigned">Assigned</option>
                    <option value="en_route">En Route</option>
                    <option value="delivering">Delivering</option>
                    <option value="completed">Completed</option>
                  </select>
                  <div class="robot-stats" id="robot-stats"></div>
                </div>
              </div>
              <div class="table-container">
                <div id="robots-table"></div>
              </div>
            </section>

            <section class="missions-section">
              <div id="mission-controls"></div>
            </section>
          </div>
        </main>
      </div>
    `;
  }

  private initializeComponents(): void {
    // Initialize robot table
    this.robotTable = new RobotTable('robots-table');
    this.robotTable.setCancelMissionHandler((robotId: string) => {
      this.cancelRobotMission(robotId);
    });

    // Initialize mission controls
    this.missionControls = new MissionControls('mission-controls');
    this.missionControls.setCancelMissionHandler((missionId: string) => {
      this.cancelMission(missionId);
    });
  }

  private connectWebSocket(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.wsConnection = new WebSocket(wsUrl);
      
      this.wsConnection.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.updateConnectionStatus('connected', 'Connected');
        
        // Request initial data
        this.sendWebSocketMessage({ type: 'get_robots' });
        this.sendWebSocketMessage({ type: 'get_missions' });
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.wsConnection.onclose = () => {
        console.log('WebSocket disconnected');
        this.updateConnectionStatus('disconnected', 'Disconnected');
        this.attemptReconnection();
      };

      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateConnectionStatus('error', 'Connection Error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.updateConnectionStatus('error', 'Connection Failed');
      this.attemptReconnection();
    }
  }

  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.updateConnectionStatus('error', 'Connection Failed - Max Attempts Reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    this.updateConnectionStatus('reconnecting', `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      console.log(`Reconnection attempt ${this.reconnectAttempts}`);
      this.connectWebSocket();
    }, delay);
  }

  private sendWebSocketMessage(message: any): void {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify(message));
    }
  }

  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'robots_update':
        this.handleRobotsUpdate(data.robots);
        break;
      case 'robot_update':
        this.handleSingleRobotUpdate(data.robot);
        break;
      case 'missions_update':
        this.handleMissionsUpdate(data.missions);
        break;
      case 'mission_update':
        this.handleSingleMissionUpdate(data.mission);
        break;
      case 'error':
        console.error('Server error:', data.message);
        break;
      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  private handleRobotsUpdate(robots: Robot[]): void {
    this.robotTable.updateRobots(robots);
    this.updateRobotStatistics(robots);
  }

  private handleSingleRobotUpdate(robot: Robot): void {
    this.robotTable.updateSingleRobot(robot);
    // Note: For single updates, we'd need to get all robots to update stats
    // In a real implementation, we might send statistics separately
  }

  private handleMissionsUpdate(missions: Mission[]): void {
    this.missionControls.updateMissions(missions);
  }

  private handleSingleMissionUpdate(mission: Mission): void {
    this.missionControls.updateSingleMission(mission);
  }

  private updateRobotStatistics(robots: Robot[]): void {
    const stats = {
      total: robots.length,
      idle: robots.filter(r => r.status === RobotStatus.IDLE).length,
      active: robots.filter(r => r.status !== RobotStatus.IDLE && r.status !== RobotStatus.COMPLETED).length,
      completed: robots.filter(r => r.status === RobotStatus.COMPLETED).length,
      averageBattery: Math.round(robots.reduce((sum, r) => sum + (r.battery || 0), 0) / robots.length)
    };

    const statsContainer = document.getElementById('robot-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">Total:</span>
          <span class="stat-value">${stats.total}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Idle:</span>
          <span class="stat-value">${stats.idle}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Active:</span>
          <span class="stat-value">${stats.active}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Avg Battery:</span>
          <span class="stat-value">${stats.averageBattery}%</span>
        </div>
      `;
    }
  }

  private updateConnectionStatus(status: 'connected' | 'disconnected' | 'reconnecting' | 'error', text: string): void {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    if (indicator && statusText) {
      indicator.className = `status-indicator status-${status}`;
      statusText.textContent = text;
    }
  }

  private setupEventListeners(): void {
    // Robot search
    const searchInput = document.getElementById('robot-search') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.robotTable.searchRobots(target.value);
      });
    }

    // Robot status filter
    const statusFilter = document.getElementById('status-filter') as HTMLSelectElement;
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const status = target.value as RobotStatus | undefined;
        this.robotTable.filterByStatus(status || undefined);
      });
    }

    // Handle window events
    window.addEventListener('beforeunload', () => {
      if (this.wsConnection) {
        this.wsConnection.close();
      }
    });

    // Handle visibility changes to pause/resume updates
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('Page hidden - reducing update frequency');
      } else {
        console.log('Page visible - resuming normal updates');
        // Request fresh data when page becomes visible
        this.sendWebSocketMessage({ type: 'get_robots' });
        this.sendWebSocketMessage({ type: 'get_missions' });
      }
    });
  }

  private cancelRobotMission(robotId: string): void {
    console.log(`Cancelling mission for robot: ${robotId}`);
    this.sendWebSocketMessage({
      type: 'cancel_robot_mission',
      robotId: robotId
    });
  }

  private cancelMission(missionId: string): void {
    console.log(`Cancelling mission: ${missionId}`);
    this.sendWebSocketMessage({
      type: 'cancel_mission',
      missionId: missionId
    });
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f5f5f5;
        color: #333;
        line-height: 1.6;
      }

      .dashboard-container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .dashboard-header {
        background: linear-gradient(135deg, #2196f3, #1976d2);
        color: white;
        padding: 20px 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }

      .header-content {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .dashboard-title {
        font-size: 28px;
        font-weight: 700;
        margin: 0;
      }

      .connection-status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }

      .status-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: inline-block;
      }

      .status-connected {
        background-color: #4caf50;
        animation: pulse 2s infinite;
      }

      .status-disconnected {
        background-color: #f44336;
      }

      .status-reconnecting {
        background-color: #ff9800;
        animation: blink 1s infinite;
      }

      .status-error {
        background-color: #f44336;
        animation: blink 0.5s infinite;
      }

      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }

      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }

      .dashboard-main {
        flex: 1;
        max-width: 1400px;
        margin: 0 auto;
        padding: 20px;
        width: 100%;
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 20px;
        min-height: calc(100vh - 120px);
      }

      .robots-section,
      .missions-section {
        display: flex;
        flex-direction: column;
      }

      .section-header {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin-bottom: 20px;
      }

      .section-header h2 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 20px;
        font-weight: 600;
      }

      .robot-controls {
        display: flex;
        align-items: center;
        gap: 15px;
        flex-wrap: wrap;
      }

      .search-input,
      .filter-select {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        background: white;
      }

      .search-input {
        min-width: 200px;
        flex: 1;
        max-width: 300px;
      }

      .search-input:focus,
      .filter-select:focus {
        outline: none;
        border-color: #2196f3;
        box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
      }

      .robot-stats {
        display: flex;
        gap: 15px;
        margin-left: auto;
        flex-wrap: wrap;
      }

      .stat-item {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        background: #f5f5f5;
        border-radius: 16px;
        font-size: 12px;
      }

      .stat-label {
        color: #666;
      }

      .stat-value {
        font-weight: 600;
        color: #333;
      }

      .table-container {
        flex: 1;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .missions-section {
        max-height: calc(100vh - 140px);
        overflow: hidden;
      }

      /* Responsive design */
      @media (max-width: 1200px) {
        .dashboard-grid {
          grid-template-columns: 1fr;
        }
        
        .missions-section {
          max-height: none;
        }
      }

      @media (max-width: 768px) {
        .header-content {
          flex-direction: column;
          gap: 15px;
          text-align: center;
        }

        .dashboard-main {
          padding: 15px;
        }

        .robot-controls {
          flex-direction: column;
          align-items: stretch;
        }

        .robot-stats {
          margin-left: 0;
          justify-content: center;
        }

        .search-input {
          min-width: auto;
          max-width: none;
        }
      }

      /* Loading and error states */
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #2196f3;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .error-message {
        background: #ffebee;
        color: #c62828;
        padding: 15px;
        border-radius: 4px;
        margin: 15px 0;
        border-left: 4px solid #c62828;
      }
    `;
    
    if (!document.getElementById('dashboard-styles')) {
      style.id = 'dashboard-styles';
      document.head.appendChild(style);
    }
  }

  // Public methods for external control
  public refreshData(): void {
    this.sendWebSocketMessage({ type: 'get_robots' });
    this.sendWebSocketMessage({ type: 'get_missions' });
  }

  public disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
    }
  }

  public getConnectionState(): string {
    if (!this.wsConnection) return 'not_connected';
    
    switch (this.wsConnection.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }
}

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
  });
} else {
  new Dashboard();
}
