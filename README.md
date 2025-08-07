# FleetOps Dashboard

A real-time monitoring dashboard for autonomous delivery robot fleets, built with TypeScript and designed for hospital and large facility operations.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation & Setup

1. **Clone and install dependencies:**
   \`\`\`bash
   git clone <repository-url>
   cd fleetops-dashboard
   npm install
   \`\`\`

2. **Development mode:**
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Production build:**
   \`\`\`bash
   npm run build
   npm start
   \`\`\`

4. **Open dashboard:**
   Navigate to \`http://localhost:3000\`

## 🎯 Features

### Core Functionality
- **Real-time robot monitoring** with 100+ robot support
- **Live mission tracking** with automatic state transitions
- **Mission cancellation** capability per robot
- **Fleet statistics** dashboard with visual indicators
- **Responsive web interface** that works on desktop and mobile

### Technical Highlights
- **Memory-only operation** - no database required
- **Event-driven architecture** for real-time updates
- **Comprehensive test coverage** (unit, integration, e2e)
- **TypeScript** throughout for type safety
- **Clean architecture** with separation of concerns

## 🤖 Robot & Mission State Machine

### Robot States
The system implements a comprehensive state machine for robot lifecycle:

\`\`\`
idle → assigned → en_route → delivering → completed → idle
  ↑                                                   ↓
  ←←←←←←← cancelled (from any active state) ←←←←←←←←←←
\`\`\`

### State Transitions & Timing

| Transition | Duration | Description |
|------------|----------|-------------|
| **idle → assigned** | Immediate | Robot receives mission assignment |
| **assigned → en_route** | 30-60 seconds | Robot begins journey to pickup location |
| **en_route → delivering** | 1-2 minutes | Robot reaches pickup and starts delivery |
| **delivering → completed** | 2-5 minutes | Robot completes delivery task |
| **completed → idle** | 10-30 seconds | Robot returns to available pool |

### Mission Lifecycle
- **Creation**: 2 new missions generated every minute
- **Assignment**: Automatically assigned to available robots
- **Duration**: Random 3-8 minute total mission time
- **Cancellation**: Missions can be cancelled at any stage via dashboard

### Design Rationale

**Why these timings?**
- **Realistic hospital operations**: Based on typical delivery distances in large facilities
- **Observable simulation**: Fast enough to see changes, slow enough to track individual robots
- **System stress testing**: Ensures the system can handle continuous state changes

**State machine benefits:**
- **Predictable behavior**: Clear rules for all transitions
- **Error handling**: Invalid state transitions are prevented
- **Scalability**: Efficiently handles 100+ robots simultaneously

## 🏗️ Architecture

### System Components

\`\`\`
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │◄──►│   API Server     │◄──►│  Simulation     │
│   Dashboard     │    │   (Express)      │    │   Engine        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Core Services   │
                        │                  │
                        │ • FleetManager   │
                        │ • MissionManager │
                        │ • DashboardSvc   │
                        └──────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │   Domain Models  │
                        │                  │
                        │ • Robot          │
                        │ • Mission        │
                        │ • EventEmitter   │
                        └──────────────────┘
\`\`\`

### Key Design Patterns
- **Event-Driven Architecture**: Real-time updates via event emission
- **Clean Architecture**: Dependencies point inward, business logic isolated
- **Repository Pattern**: In-memory data management with consistent interfaces
- **Observer Pattern**: Dashboard updates automatically on state changes

## 📊 API Endpoints

### Robot Management
- \`GET /api/robots\` - List all robots with current status
- \`GET /api/robots/:id\` - Get specific robot details
- \`POST /api/robots/:id/cancel\` - Cancel robot's current mission

### Mission Tracking  
- \`GET /api/missions\` - List all missions (with optional status filter)
- \`GET /api/missions/active\` - Get currently active missions
- \`GET /api/missions/:id\` - Get specific mission details

### Dashboard Data
- \`GET /api/dashboard\` - Complete dashboard dataset
- \`GET /api/dashboard/stats\` - Fleet statistics only
- \`GET /health\` - Health check endpoint

## 🧪 Testing

### Test Coverage
- **Unit Tests**: Core business logic (Robot, Mission, FleetManager)
- **Integration Tests**: API endpoints and service interactions  
- **E2E Tests**: Complete simulation workflows
- **Performance Tests**: 100+ robot load testing

### Running Tests
\`\`\`bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
\`\`\`

### Test Philosophy
- **Test-Driven Development**: Tests written before implementation
- **Real-world scenarios**: Tests simulate actual operational conditions
- **Performance validation**: Ensures system handles specified load (100+ robots)

## 🏛️ AWS Production Architecture

For a production deployment in AWS, the system would be architected as follows:

### Core Infrastructure
\`\`\`
Internet → CloudFront → ALB → ECS Fargate Cluster
                         ↓
                    ┌─────────────┐
                    │   Frontend  │
                    │   (S3)      │
                    └─────────────┘
                         ↓
                    ┌─────────────┐
                    │  API Server │
                    │ (ECS Tasks) │
                    └─────────────┘
                         ↓
              ┌─────────────────────────┐
              │    Data & Messaging     │
              │                         │
              │ • ElastiCache (Redis)   │
              │ • SQS (Mission Queue)   │
              │ • EventBridge           │
              └─────────────────────────┘
\`\`\`

### AWS Services Selection

#### Compute & Hosting
- **Amazon ECS with Fargate**: Container orchestration for API servers
- **Application Load Balancer**: Traffic distribution and health checks
- **Amazon S3 + CloudFront**: Static frontend hosting with global CDN

#### Data & State Management
- **Amazon ElastiCache (Redis)**: In-memory robot state and session management
- **Amazon SQS**: Mission queue and event processing
- **Amazon EventBridge**: Event-driven communication between services

#### Monitoring & Operations
- **Amazon CloudWatch**: Metrics, logs, and alerting
- **AWS X-Ray**: Distributed tracing for performance monitoring
- **Amazon SNS**: Operational alerts and notifications

#### Security & Networking
- **Amazon VPC**: Network isolation with public/private subnets
- **AWS WAF**: Web application firewall protection
- **AWS Secrets Manager**: Secure configuration management

### Scalability Strategy

#### Horizontal Scaling
- **ECS Auto Scaling**: Scale API servers based on CPU/memory usage
- **ElastiCache Cluster Mode**: Distributed caching across multiple nodes
- **Multi-AZ deployment**: High availability across availability zones

#### Performance Optimizations
- **Redis clustering**: Distribute robot state across cache nodes
- **SQS FIFO queues**: Ensure ordered mission processing
- **CloudFront caching**: Reduce API load for static dashboard data

### Infrastructure as Code

Example AWS CDK stack structure:
\`\`\`typescript
// infrastructure/lib/fleetops-stack.ts
export class FleetOpsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // VPC with public/private subnets
    const vpc = new ec2.Vpc(this, 'FleetOpsVPC', {
      maxAzs: 3,
      natGateways: 1
    });

    // ElastiCache Redis cluster
    const cacheSubnetGroup = new elasticache.CfnSubnetGroup(this, 'CacheSubnetGroup', {
      description: 'Subnet group for ElastiCache',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId)
    });

    const redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      engine: 'redis',
      cacheNodeType: 'cache.t3.micro',
      numCacheNodes: 1,
      cacheSubnetGroupName: cacheSubnetGroup.ref
    });

    // ECS Cluster for API services
    const cluster = new ecs.Cluster(this, 'FleetOpsCluster', {
      vpc: vpc,
      containerInsights: true
    });

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'FleetOpsALB', {
      vpc: vpc,
      internetFacing: true
    });

    // ECS Service with Fargate
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'FleetOpsTask', {
      memoryLimitMiB: 1024,
      cpu: 512
    });

    // Add container to task definition
    taskDefinition.addContainer('fleetops-api', {
      image: ecs.ContainerImage.fromRegistry('fleetops-dashboard:latest'),
      portMappings: [{ containerPort: 3000 }],
      environment: {
        REDIS_HOST: redisCluster.attrRedisEndpointAddress,
        NODE_ENV: 'production'
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'fleetops-api'
      })
    });

    // Create ECS Service
    const service = new ecs.FargateService(this, 'FleetOpsService', {
      cluster: cluster,
      taskDefinition: taskDefinition,
      desiredCount: 2,
      assignPublicIp: false
    });

    // Configure auto scaling
    const scaling = service.autoScaleTaskCount({
      maxCapacity: 10,
      minCapacity: 2
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.minutes(3),
      scaleOutCooldown: cdk.Duration.minutes(1)
    });
  }
}
\`\`\`

### Deployment Pipeline
1. **GitHub Actions** or **AWS CodePipeline** for CI/CD
2. **Docker containers** built and pushed to Amazon ECR
3. **Blue/green deployments** for zero-downtime updates
4. **Automated testing** in staging environment before production

### Cost Optimization
- **Spot instances** for non-critical workloads
- **Reserved capacity** for predictable baseline load
- **S3 lifecycle policies** for log archival
- **CloudWatch log retention** policies to manage storage costs

### Security Considerations
- **VPC endpoints** for private AWS service communication
- **IAM roles** with least privilege access
- **Secrets Manager** for database credentials and API keys
- **CloudTrail** for audit logging
- **GuardDuty** for threat detection

This architecture supports:
- **100+ robots** with sub-second response times
- **High availability** across multiple AZs
- **Auto-scaling** based on demand
- **Monitoring & alerting** for operational visibility
- **Security best practices** with defense in depth

## 🔧 Development

### Code Style & Standards
- **TypeScript strict mode** with comprehensive type checking
- **ESLint + Prettier** for consistent code formatting  
- **Conventional commits** for clear change history
- **Clean architecture** with dependency injection

### Performance Considerations
- **Memory optimization** for 100+ robot fleet management
- **Event batching** to reduce unnecessary updates
- **Efficient data structures** (Map/Set) for O(1) lookups
- **Lazy loading** of non-critical dashboard components

### Assumptions & Trade-offs

#### Key Assumptions
1. **Hospital environment**: Controlled indoor space with predictable robot paths
2. **Reliable network**: Consistent connectivity for real-time updates  
3. **Mission simplicity**: Delivery missions follow standard pickup/deliver pattern
4. **Memory sufficiency**: Server has adequate RAM for 100+ robot state management

#### Design Trade-offs
1. **Memory vs. Persistence**: Chose in-memory storage for simplicity over data durability
2. **Real-time vs. Efficiency**: Prioritized real-time updates over network efficiency
3. **Simulation vs. Reality**: Used time-based transitions vs. actual robot sensor data
4. **Simplicity vs. Features**: Focused on core requirements over advanced fleet management

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: \`git checkout -b feature/amazing-feature\`
3. Write tests for new functionality
4. Implement the feature
5. Ensure all tests pass: \`npm test\`
6. Submit a pull request

### Code Review Standards
- All changes require test coverage
- TypeScript strict mode compliance
- Performance impact assessment for 100+ robot operations
- Documentation updates for API changes

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

For questions or issues:
- Create a GitHub issue for bugs or feature requests
- Contact: meir@deliverz.ai
- WhatsApp: +972-523594950

---

**Built with ❤️ for autonomous delivery operations**
