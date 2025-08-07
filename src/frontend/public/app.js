export const appJs = `
class FleetOpsDashboard {
    constructor() {
        this.apiBaseUrl = '/api';
        this.refreshInterval = 5000; // 5 seconds
        this.refreshTimer = null;
        this.currentFilter = '';
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.showLoading();
        
        try {
            await this.loadDashboardData();
            this.hideLoading();
            this.setConnectionStatus(true);
            this.startAutoRefresh();
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.showError('Failed to load dashboard data. Please refresh the page.');
            this.hideLoading();
            this.setConnectionStatus(false);
        }
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        // Status filter
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.filterRobots();
        });

        // Handle page visibility change to pause/resume updates
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAutoRefresh();
            } else {
                this.startAutoRefresh();
            }
        });
    }

    async loadDashboardData() {
        try {
            const response = await fetch(\`\${this.apiBaseUrl}/dashboard\`);
            
            if (!response.ok) {
                throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error');
            }

            this.updateDashboard(result.data);
            this.setConnectionStatus(true);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.setConnectionStatus(false);
            throw error;
        }
    }

    updateDashboard(data) {
        // Update statistics
        this.updateFleetStats(data.fleetStats);
        
        // Update robot table
        this.updateRobotTable(data.robots);
        
        // Update last updated time
        const lastUpdated = new Date(data.lastUpdated).toLocaleTimeString();
        document.getElementById('statusText').textContent = \`Last updated: \${lastUpdated}\`;
    }

    updateFleetStats(stats) {
        document.getElementById('totalRobots').textContent = stats.total;
        document.getElementById('idleRobots').textContent = stats.idle;
        document.getElementById('assignedRobots').textContent = stats.assigned;
        document.getElementById('enRouteRobots').textContent = stats.en_route;
        document.getElementById('deliveringRobots').textContent = stats.delivering;
        document.getElementById('completedRobots').textContent = stats.completed;
    }

    updateRobotTable(robots) {
        const tbody = document.getElementById('robotTableBody');
        tbody.innerHTML = '';

        robots.forEach(robot => {
            const row = this.createRobotRow(robot);
            tbody.appendChild(row);
        });

        // Apply current filter
        this.filterRobots();
    }

    createRobotRow(robot) {
        const row = document.createElement('tr');
        row.dataset.status = robot.status;
        
        const lastUpdated = new Date(robot.lastUpdated).toLocaleString();
        
        row.innerHTML = \`
            <td>\${robot.id}</td>
            <td>
                <span class="status-badge status-\${robot.status}">
                    \${robot.status.replace('_', ' ')}
                </span>
            </td>
            <td>\${robot.currentMissionId || '-'}</td>
            <td>\${lastUpdated}</td>
            <td>
                <button 
                    class="btn btn-danger" 
                    onclick="dashboard.cancelRobotMission('\${robot.id}')"
                    \${robot.status === 'idle' ? 'disabled' : ''}
                >
                    Cancel
                </button>
            </td>
        \`;

        return row;
    }

    filterRobots() {
        const rows = document.querySelectorAll('#robotTableBody tr');
        
        rows.forEach(row => {
            const status = row.dataset.status;
            
            if (!this.currentFilter || status === this.currentFilter) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    async cancelRobotMission(robotId) {
        try {
            const response = await fetch(\`\${this.apiBaseUrl}/robots/\${robotId}/cancel\`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(\`Mission cancelled for robot \${robotId}\`);
                // Refresh data immediately
                await this.loadDashboardData();
            } else {
                throw new Error(result.error || 'Failed to cancel mission');
            }
        } catch (error) {
            console.error('Error cancelling robot mission:', error);
            this.showError(\`Failed to cancel mission for robot \${robotId}: \${error.message}\`);
        }
    }

    async refreshData() {
        const refreshBtn = document.getElementById('refreshBtn');
        const originalText = refreshBtn.textContent;
        
        refreshBtn.disabled = true;
        refreshBtn.textContent = '🔄 Refreshing...';
        
        try {
            await this.loadDashboardData();
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showError('Failed to refresh data. Please try again.');
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.textContent = originalText;
        }
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        
        this.refreshTimer = setInterval(async () => {
            try {
                await this.loadDashboardData();
            } catch (error) {
                console.error('Auto-refresh failed:', error);
                this.setConnectionStatus(false);
            }
        }, this.refreshInterval);
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    setConnectionStatus(connected) {
        const statusDot = document.getElementById('connectionStatus');
        const statusText = document.getElementById('statusText');
        
        if (connected) {
            statusDot.classList.add('connected');
            if (!statusText.textContent.includes('Last updated:')) {
                statusText.textContent = 'Connected';
            }
        } else {
            statusDot.classList.remove('connected');
            statusText.textContent = 'Connection lost';
        }
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.error-message, .success-message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
        messageDiv.textContent = message;

        // Insert after header
        const header = document.querySelector('.dashboard-header');
        header.insertAdjacentElement('afterend', messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new FleetOpsDashboard();
});
`;