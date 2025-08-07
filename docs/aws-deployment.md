## Architecture Overview

### Core Components:
1. **Robot**: Individual robot entity with state management
2. **Mission**: Mission lifecycle management with state transitions  
3. **FleetManager**: Centralized fleet coordination and robot assignment
4. **SimulationEngine**: Time-based event processing and state transitions
5. **DashboardService**: Real-time data aggregation for frontend

### State Machine Design:
- **Robot States**: `idle` → `assigned` → `en_route` → `delivering` → `completed` → `idle`
- **Mission States**: `created` → `assigned` → `in_progress` → `completed`/`cancelled`

### Key Features:
- Event-driven architecture for real-time updates
- Memory-efficient state management for 100+ robots
- Comprehensive error handling and logging
- RESTful API with WebSocket support for live updates
- Clean separation of concerns with dependency injection

### Technology Stack:
- **Backend**: Node.js + Express + TypeScript
- **Frontend**: Vanilla TypeScript with modern DOM APIs
- **Testing**: Jest with comprehensive unit/integration/e2e tests
- **Architecture**: Event-driven with clean architecture principles
