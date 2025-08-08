import { Mission, MissionStatus, MissionType } from '../../types/mission.types.js';

export class MissionControls {
  private container: HTMLElement;
  private missions: Mission[] = [];
  private onCancelMission?: (missionId: string) => void;
  private statusFilter: MissionStatus | 'all' = 'all';
  private typeFilter: MissionType | 'all' = 'all';

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
    this.createControls();
    this.createMissionsList();
    this.addStyles();
  }

  private createControls(): void {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'mission-controls-header';

    // Title
    const title = document.createElement('h3');
    title.textContent = 'Mission Control Center';
    title.className = 'mission-controls-title';

    // Filters container
    const filtersContainer = document.createElement('div');
    filtersContainer.className = 'mission-filters';

    // Status filter
    const statusFilterContainer = document.createElement('div');
    statusFilterContainer.className = 'filter-group';
    
    const statusLabel = document.createElement('label');
    statusLabel.textContent = 'Status:';
    statusLabel.className = 'filter-label';
    
    const statusSelect = document.createElement('select');
    statusSelect.className = 'filter-select';
    statusSelect.id = 'status-filter';
    
    const allStatusOption = document.createElement('option');
    allStatusOption.value = 'all';
    allStatusOption.textContent = 'All Statuses';
    statusSelect.appendChild(allStatusOption);
    
    Object.values(MissionStatus).forEach(status => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status.replace('_', ' ').toUpperCase();
      statusSelect.appendChild(option);
    });

    statusSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.statusFilter = target.value as MissionStatus | 'all';
      this.renderMissions();
    });

    statusFilterContainer.appendChild(statusLabel);
    statusFilterContainer.appendChild(statusSelect);

    // Type filter
    const typeFilterContainer = document.createElement('div');
    typeFilterContainer.className = 'filter-group';
    
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Type:';
    typeLabel.className = 'filter-label';
    
    const typeSelect = document.createElement('select');
    typeSelect.className = 'filter-select';
    typeSelect.id = 'type-filter';
    
    const allTypeOption = document.createElement('option');
    allTypeOption.value = 'all';
    allTypeOption.textContent = 'All Types';
    typeSelect.appendChild(allTypeOption);
    
    Object.values(MissionType).forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type.toUpperCase();
      typeSelect.appendChild(option);
    });

    typeSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.typeFilter = target.value as MissionType | 'all';
      this.renderMissions();
    });

    typeFilterContainer.appendChild(typeLabel);
    typeFilterContainer.appendChild(typeSelect);

    // Statistics display
    const statsContainer = document.createElement('div');
    statsContainer.className = 'mission-stats';
    statsContainer.id = 'mission-stats';

    filtersContainer.appendChild(statusFilterContainer);
    filtersContainer.appendChild(typeFilterContainer);
    filtersContainer.appendChild(statsContainer);

    controlsContainer.appendChild(title);
    controlsContainer.appendChild(filtersContainer);

    this.container.appendChild(controlsContainer);
  }

  private createMissionsList(): void {
    const listContainer = document.createElement('div');
    listContainer.className = 'missions-list-container';
    listContainer.id = 'missions-list';

    this.container.appendChild(listContainer);
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .mission-controls-header {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin-bottom: 20px;
      }

      .mission-controls-title {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 20px;
        font-weight: 600;
      }

      .mission-filters {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
      }

      .filter-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .filter-label {
        font-weight: 500;
        color: #555;
        font-size: 14px;
      }

      .filter-select {
        padding: 6px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        background: white;
        cursor: pointer;
      }

      .filter-select:focus {
        outline: none;
        border-color: #2196f3;
        box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
      }

      .mission-stats {
        display: flex;
        gap: 15px;
        margin-left: auto;
        font-size: 12px;
        color: #666;
      }

      .stat-item {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: #f5f5f5;
        border-radius: 12px;
      }

      .stat-value {
        font-weight: 600;
        color: #333;
      }

      .missions-list-container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        max-height: 500px;
        overflow-y: auto;
      }

      .mission-item {
        display: flex;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid #eee;
        transition: background-color 0.2s;
      }

      .mission-item:hover {
        background-color: #f9f9f9;
      }

      .mission-item:last-child {
        border-bottom: none;
      }

      .mission-info {
        flex: 1;
        display: grid;
        grid-template-columns: 150px 120px 1fr 200px 150px;
        gap: 15px;
        align-items: center;
      }

      .mission-id {
        font-family: monospace;
        font-weight: 600;
        color: #333;
        font-size: 13px;
      }

      .mission-type {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
        text-align: center;
        color: white;
      }

      .type-delivery {
        background-color: #2196f3;
      }

      .type-pickup {
        background-color: #ff9800;
      }

      .type-maintenance {
        background-color: #9c27b0;
      }

      .type-patrol {
        background-color: #4caf50;
      }

      .mission-route {
        font-size: 12px;
        color: #666;
      }

      .route-arrow {
        margin: 0 8px;
        color: #999;
      }

      .mission-robot {
        font-family: monospace;
        font-size: 12px;
        color: #666;
      }

      .mission-timing {
        font-size: 11px;
        color: #888;
        text-align: right;
      }

      .mission-actions {
        margin-left: 15px;
      }

      .mission-cancel-btn {
        background-color: #f44336;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.2s;
      }

      .mission-cancel-btn:hover:not(:disabled) {
        background-color: #d32f2f;
      }

      .mission-cancel-btn:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }

      .mission-status-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        text-align: center;
        min-width: 80px;
      }

      .status-pending {
        background-color: #fff3e0;
        color: #f57c00;
      }

      .status-assigned {
        background-color: #e3f2fd;
        color: #1976d2;
      }

      .status-in_progress {
        background-color: #f3e5f5;
        color: #7b1fa2;
      }

      .status-completed {
        background-color: #e8f5e8;
        color: #388e3c;
      }

      .status-cancelled {
        background-color: #ffebee;
        color: #d32f2f;
      }

      .status-failed {
        background-color: #fce4ec;
        color: #c2185b;
      }

      .empty-message {
        text-align: center;
        padding: 40px 20px;
        color: #666;
        font-style: italic;
      }

      @media (max-width: 768px) {
        .mission-info {
          grid-template-columns: 1fr;
          gap: 8px;
        }
        
        .mission-filters {
          flex-direction: column;
          align-items: stretch;
        }
        
        .mission-stats {
          margin-left: 0;
          flex-wrap: wrap;
        }
      }
    `;
    
    if (!document.getElementById('mission-controls-styles')) {
      style.id = 'mission-controls-styles';
      document.head.appendChild(style);
    }
  }

  private createMissionStatusBadge(status: MissionStatus): HTMLElement {
    const badge = document.createElement('span');
    badge.className = `mission-status-badge status-${status}`;
    badge.textContent = status.replace('_', ' ');
    return badge;
  }

  private createMissionTypeBadge(type: MissionType): HTMLElement {
    const badge = document.createElement('span');
    badge.className = `mission-type type-${type}`;
    badge.textContent = type;
    return badge;
  }

  private formatMissionTiming(mission: Mission): string {
    const now = new Date();
    
    if (mission.completedAt) {
      const duration = mission.actualDuration || 0;
      return `Completed in ${duration}m`;
    }
    
    if (mission.startedAt) {
      const elapsed = Math.floor((now.getTime() - mission.startedAt.getTime()) / 60000);
      return `Running for ${elapsed}m`;
    }
    
    if (mission.assignedAt) {
      const waiting = Math.floor((now.getTime() - mission.assignedAt.getTime()) / 60000);
      return `Assigned ${waiting}m ago`;
    }
    
    const age = Math.floor((now.getTime() - mission.createdAt.getTime()) / 60000);
    return `Created ${age}m ago`;
  }

  private createMissionItem(mission: Mission): HTMLElement {
    const item = document.createElement('div');
    item.className = 'mission-item';
    item.setAttribute('data-mission-id', mission.id);

    const info = document.createElement('div');
    info.className = 'mission-info';

    // Mission ID
    const idDiv = document.createElement('div');
    const idSpan = document.createElement('span');
    idSpan.className = 'mission-id';
    idSpan.textContent = mission.id;
    idDiv.appendChild(idSpan);

    // Status
    const statusDiv = document.createElement('div');
    statusDiv.appendChild(this.createMissionStatusBadge(mission.status));

    // Route information
    const routeDiv = document.createElement('div');
    routeDiv.className = 'mission-route';
    routeDiv.innerHTML = `
      ${mission.origin.name}
      <span class="route-arrow">→</span>
      ${mission.destination.name}
    `;

    // Robot assignment
    const robotDiv = document.createElement('div');
    robotDiv.className = 'mission-robot';
    robotDiv.textContent = mission.assignedRobotId || 'Unassigned';

    // Timing
    const timingDiv = document.createElement('div');
    timingDiv.className = 'mission-timing';
    timingDiv.textContent = this.formatMissionTiming(mission);

    info.appendChild(idDiv);
    info.appendChild(statusDiv);
    info.appendChild(routeDiv);
    info.appendChild(robotDiv);
    info.appendChild(timingDiv);

    // Actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'mission-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'mission-cancel-btn';
    cancelBtn.textContent = 'Cancel';

    const canCancel = mission.status !== MissionStatus.COMPLETED && 
                     mission.status !== MissionStatus.CANCELLED &&
                     mission.status !== MissionStatus.FAILED;
    
    cancelBtn.disabled = !canCancel;

    if (canCancel) {
      cancelBtn.addEventListener('click', () => {
        if (this.onCancelMission) {
          this.onCancelMission(mission.id);
        }
      });
    }

    actionsDiv.appendChild(cancelBtn);

    item.appendChild(info);
    item.appendChild(actionsDiv);

    return item;
  }

  private updateStatistics(): void {
    const statsContainer = document.getElementById('mission-stats');
    if (!statsContainer) return;

    const filteredMissions = this.getFilteredMissions();
    
    const stats = {
      total: filteredMissions.length,
      pending: filteredMissions.filter(m => m.status === MissionStatus.PENDING).length,
      active: filteredMissions.filter(m => 
        m.status === MissionStatus.ASSIGNED || 
        m.status === MissionStatus.IN_PROGRESS
      ).length,
      completed: filteredMissions.filter(m => m.status === MissionStatus.COMPLETED).length,
      cancelled: filteredMissions.filter(m => m.status === MissionStatus.CANCELLED).length
    };

    statsContainer.innerHTML = `
      <div class="stat-item">
        <span>Total:</span>
        <span class="stat-value">${stats.total}</span>
      </div>
      <div class="stat-item">
        <span>Pending:</span>
        <span class="stat-value">${stats.pending}</span>
      </div>
      <div class="stat-item">
        <span>Active:</span>
        <span class="stat-value">${stats.active}</span>
      </div>
      <div class="stat-item">
        <span>Completed:</span>
        <span class="stat-value">${stats.completed}</span>
      </div>
      <div class="stat-item">
        <span>Cancelled:</span>
        <span class="stat-value">${stats.cancelled}</span>
      </div>
    `;
  }

  private getFilteredMissions(): Mission[] {
    return this.missions.filter(mission => {
      const statusMatch = this.statusFilter === 'all' || mission.status === this.statusFilter;
      const typeMatch = this.typeFilter === 'all' || mission.type === this.typeFilter;
      return statusMatch && typeMatch;
    });
  }

  private renderMissions(): void {
    const listContainer = document.getElementById('missions-list');
    if (!listContainer) return;

    const filteredMissions = this.getFilteredMissions();

    if (filteredMissions.length === 0) {
      listContainer.innerHTML = '<div class="empty-message">No missions found matching the current filters.</div>';
    } else {
      listContainer.innerHTML = '';
      filteredMissions.forEach(mission => {
        const item = this.createMissionItem(mission);
        listContainer.appendChild(item);
      });
    }

    this.updateStatistics();
  }

  public updateMissions(missions: Mission[]): void {
    this.missions = [...missions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    this.renderMissions();
  }

  public updateSingleMission(mission: Mission): void {
    const index = this.missions.findIndex(m => m.id === mission.id);
    if (index !== -1) {
      this.missions[index] = mission;
    } else {
      this.missions.unshift(mission);
    }
    this.renderMissions();
  }

  public setCancelMissionHandler(handler: (missionId: string) => void): void {
    this.onCancelMission = handler;
  }

  public getMissionCount(): number {
    return this.missions.length;
  }

  public getFilteredMissionCount(): number {
    return this.getFilteredMissions().length;
  }
}
