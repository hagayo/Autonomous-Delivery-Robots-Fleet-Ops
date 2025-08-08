import { Robot, RobotStatus } from '../../types/robot.types.js';

export class RobotTable {
  private container: HTMLElement;
  private table: HTMLTableElement;
  private tbody: HTMLTableSectionElement;
  private robots: Robot[] = [];
  private onCancelMission?: (robotId: string) => void;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    this.initialize();
  }

  private initialize(): void {
    this.container.innerHTML = '';
    
    // Create table structure
    this.table = document.createElement('table');
    this.table.className = 'robot-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Robot ID', 'Status', 'Mission ID', 'Battery', 'Position', 'Last Updated', 'Actions'];
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    this.table.appendChild(thead);
    
    // Create body
    this.tbody = document.createElement('tbody');
    this.table.appendChild(this.tbody);
    
    this.container.appendChild(this.table);
    
    // Add styles
    this.addStyles();
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .robot-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        background: white;
      }

      .robot-table th,
      .robot-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }

      .robot-table th {
        background-color: #f8f9fa;
        font-weight: 600;
        color: #333;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .robot-table tbody tr:hover {
        background-color: #f5f5f5;
      }

      .robot-table tbody tr:nth-child(even) {
        background-color: #fafafa;
      }

      .status-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .status-idle {
        background-color: #e3f2fd;
        color: #1976d2;
      }

      .status-assigned {
        background-color: #fff3e0;
        color: #f57c00;
      }

      .status-en_route {
        background-color: #f3e5f5;
        color: #7b1fa2;
      }

      .status-delivering {
        background-color: #e8f5e8;
        color: #388e3c;
      }

      .status-completed {
        background-color: #e0f2f1;
        color: #00695c;
      }

      .battery-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .battery-bar {
        width: 50px;
        height: 6px;
        background-color: #e0e0e0;
        border-radius: 3px;
        overflow: hidden;
      }

      .battery-fill {
        height: 100%;
        transition: width 0.3s ease;
      }

      .battery-high {
        background-color: #4caf50;
      }

      .battery-medium {
        background-color: #ff9800;
      }

      .battery-low {
        background-color: #f44336;
      }

      .position-info {
        font-size: 12px;
        color: #666;
        font-family: monospace;
      }

      .cancel-button {
        background-color: #f44336;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.2s;
      }

      .cancel-button:hover {
        background-color: #d32f2f;
      }

      .cancel-button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }

      .robot-id {
        font-weight: 600;
        color: #333;
      }

      .mission-id {
        font-family: monospace;
        font-size: 12px;
        color: #666;
      }

      .last-updated {
        font-size: 11px;
        color: #888;
      }

      .table-container {
        max-height: 600px;
        overflow-y: auto;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
    `;
    
    if (!document.getElementById('robot-table-styles')) {
      style.id = 'robot-table-styles';
      document.head.appendChild(style);
    }
  }

  private createStatusBadge(status: RobotStatus): HTMLElement {
    const badge = document.createElement('span');
    badge.className = `status-badge status-${status}`;
    badge.textContent = status.replace('_', ' ');
    return badge;
  }

  private createBatteryIndicator(battery: number = 0): HTMLElement {
    const container = document.createElement('div');
    container.className = 'battery-indicator';
    
    const percentage = document.createElement('span');
    percentage.textContent = `${battery}%`;
    percentage.style.fontSize = '12px';
    percentage.style.minWidth = '35px';
    
    const bar = document.createElement('div');
    bar.className = 'battery-bar';
    
    const fill = document.createElement('div');
    fill.className = 'battery-fill';
    fill.style.width = `${battery}%`;
    
    if (battery > 60) {
      fill.className += ' battery-high';
    } else if (battery > 30) {
      fill.className += ' battery-medium';
    } else {
      fill.className += ' battery-low';
    }
    
    bar.appendChild(fill);
    container.appendChild(percentage);
    container.appendChild(bar);
    
    return container;
  }

  private createPositionInfo(robot: Robot): HTMLElement {
    const container = document.createElement('div');
    container.className = 'position-info';
    
    if (robot.position) {
      container.textContent = `(${Math.round(robot.position.x)}, ${Math.round(robot.position.y)}, F${robot.position.floor})`;
    } else {
      container.textContent = 'Unknown';
    }
    
    return container;
  }

  private createCancelButton(robotId: string, status: RobotStatus): HTMLElement {
    const button = document.createElement('button');
    button.className = 'cancel-button';
    button.textContent = 'Cancel';
    
    const canCancel = status !== RobotStatus.IDLE && status !== RobotStatus.COMPLETED;
    button.disabled = !canCancel;
    
    if (canCancel) {
      button.addEventListener('click', () => {
        if (this.onCancelMission) {
          this.onCancelMission(robotId);
        }
      });
    }
    
    return button;
  }

  private formatLastUpdated(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else {
      return date.toLocaleTimeString();
    }
  }

  private createRow(robot: Robot): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.setAttribute('data-robot-id', robot.id);
    
    // Robot ID
    const idCell = document.createElement('td');
    const idSpan = document.createElement('span');
    idSpan.className = 'robot-id';
    idSpan.textContent = robot.id;
    idCell.appendChild(idSpan);
    
    // Status
    const statusCell = document.createElement('td');
    statusCell.appendChild(this.createStatusBadge(robot.status));
    
    // Mission ID
    const missionCell = document.createElement('td');
    if (robot.currentMissionId) {
      const missionSpan = document.createElement('span');
      missionSpan.className = 'mission-id';
      missionSpan.textContent = robot.currentMissionId;
      missionCell.appendChild(missionSpan);
    } else {
      missionCell.textContent = '-';
    }
    
    // Battery
    const batteryCell = document.createElement('td');
    batteryCell.appendChild(this.createBatteryIndicator(robot.battery));
    
    // Position
    const positionCell = document.createElement('td');
    positionCell.appendChild(this.createPositionInfo(robot));
    
    // Last Updated
    const updatedCell = document.createElement('td');
    const updatedSpan = document.createElement('span');
    updatedSpan.className = 'last-updated';
    updatedSpan.textContent = this.formatLastUpdated(robot.lastUpdated);
    updatedCell.appendChild(updatedSpan);
    
    // Actions
    const actionsCell = document.createElement('td');
    actionsCell.appendChild(this.createCancelButton(robot.id, robot.status));
    
    row.appendChild(idCell);
    row.appendChild(statusCell);
    row.appendChild(missionCell);
    row.appendChild(batteryCell);
    row.appendChild(positionCell);
    row.appendChild(updatedCell);
    row.appendChild(actionsCell);
    
    return row;
  }

  private updateRow(robot: Robot): void {
    const existingRow = this.tbody.querySelector(`tr[data-robot-id="${robot.id}"]`) as HTMLTableRowElement;
    if (!existingRow) return;
    
    const newRow = this.createRow(robot);
    this.tbody.replaceChild(newRow, existingRow);
  }

  public updateRobots(robots: Robot[]): void {
    this.robots = [...robots];
    
    // Clear existing rows
    this.tbody.innerHTML = '';
    
    // Add new rows
    robots.forEach(robot => {
      const row = this.createRow(robot);
      this.tbody.appendChild(row);
    });
  }

  public updateSingleRobot(robot: Robot): void {
    const index = this.robots.findIndex(r => r.id === robot.id);
    if (index !== -1) {
      this.robots[index] = robot;
      this.updateRow(robot);
    }
  }

  public setCancelMissionHandler(handler: (robotId: string) => void): void {
    this.onCancelMission = handler;
  }

  public filterByStatus(status?: RobotStatus): void {
    const rows = this.tbody.querySelectorAll('tr');
    rows.forEach(row => {
      const robotId = row.getAttribute('data-robot-id');
      if (!robotId) return;
      
      const robot = this.robots.find(r => r.id === robotId);
      if (!robot) return;
      
      if (status === undefined || robot.status === status) {
        (row as HTMLElement).style.display = '';
      } else {
        (row as HTMLElement).style.display = 'none';
      }
    });
  }

  public searchRobots(searchTerm: string): void {
    const rows = this.tbody.querySelectorAll('tr');
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    rows.forEach(row => {
      const robotId = row.getAttribute('data-robot-id');
      if (!robotId) return;
      
      const robot = this.robots.find(r => r.id === robotId);
      if (!robot) return;
      
      const matchesId = robot.id.toLowerCase().includes(lowerSearchTerm);
      const matchesMission = robot.currentMissionId?.toLowerCase().includes(lowerSearchTerm) || false;
      const matchesStatus = robot.status.toLowerCase().includes(lowerSearchTerm);
      
      if (searchTerm === '' || matchesId || matchesMission || matchesStatus) {
        (row as HTMLElement).style.display = '';
      } else {
        (row as HTMLElement).style.display = 'none';
      }
    });
  }

  public getRobotCount(): number {
    return this.robots.length;
  }

  public getVisibleRobotCount(): number {
    const visibleRows = this.tbody.querySelectorAll('tr:not([style*="display: none"])');
    return visibleRows.length;
  }
}
