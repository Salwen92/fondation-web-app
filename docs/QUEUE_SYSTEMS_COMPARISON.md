# Queue Systems Comparison - E2E Flow Analysis

## Overview

This document compares different queue system architectures for the Fondation course generation platform, detailing the end-to-end flow from UI trigger to course completion.

---

## 1. Current: Convex as Queue (Database Polling)

### Flow
1. User clicks "Generate Course" in UI
2. UI creates a job record in Convex with `status="pending"`
3. Worker polls Convex every 5 seconds checking for pending jobs
4. Worker finds the job, updates `status="running"`
5. Worker clones repo, runs Fondation CLI
6. Worker updates job with results, `status="completed"`
7. UI polls/subscribes to job status changes, shows results

### Characteristics
- ✅ Simple implementation, no additional infrastructure
- ❌ Inefficient (constant database polling)
- ⚠️ 0-5 second delay before processing starts
- ❌ No automatic retries or complex queue features
- ❌ Database load from polling

### Best For
- MVP/Prototype stage
- < 100 jobs per day
- Simple requirements

---

## 2. BullMQ + Redis

### Flow
1. User clicks "Generate Course" in UI
2. UI calls API endpoint that adds job to BullMQ queue
3. BullMQ immediately notifies available worker (event-driven)
4. Worker picks up job instantly, updates Convex `status="running"`
5. Worker processes with automatic progress updates
6. If fails, BullMQ auto-retries with exponential backoff
7. On success, worker updates Convex with results
8. UI shows real-time updates via Convex subscriptions

### Characteristics
- ✅ Instant processing (no polling delay)
- ✅ Built-in retry logic, dead letter queue, priority handling
- ✅ Professional job dashboard (Bull Board)
- ✅ Job progress tracking
- ⚠️ Redis required as additional infrastructure
- ✅ Battle-tested in production

### Best For
- Production applications
- 100-10,000 jobs per day
- Need for reliability and monitoring

---

## 3. AWS SQS / Google Cloud Tasks

### Flow
1. User clicks "Generate Course" in UI
2. UI sends message to SQS queue via API
3. Worker (Lambda/Container) triggered by queue message
4. Worker updates Convex status and begins processing
5. If fails, SQS handles retry with visibility timeout
6. Successfully processed messages auto-deleted from queue
7. Results saved to Convex, UI updates

### Characteristics
- ✅ Fully managed, no queue infrastructure needed
- ✅ Pay-per-message pricing model
- ✅ Built-in retry and dead letter queue
- ✅ Can trigger Lambda for true serverless
- ✅ Automatic scaling
- ⚠️ Vendor lock-in
- ⚠️ Cloud provider dependency

### Best For
- Cloud-native applications
- Variable workload (pay per use)
- Teams without DevOps resources

---

## 4. RabbitMQ

### Flow
1. User clicks "Generate Course" in UI
2. UI publishes message to RabbitMQ exchange
3. Message routed to appropriate queue based on routing rules
4. Worker consumes message immediately
5. Worker acknowledges message only after successful processing
6. Failed messages can be routed to retry or dead letter exchanges
7. Complex routing possible (priority, topic-based)

### Characteristics
- ✅ Enterprise-grade with complex routing capabilities
- ✅ Guaranteed message delivery options
- ✅ Complex workflow support
- ✅ Multiple consumer patterns
- ❌ Requires RabbitMQ server management
- ❌ Steeper learning curve
- ❌ Overkill for simple use cases

### Best For
- Enterprise applications
- Complex multi-step workflows
- Need for advanced routing

---

## 5. Convex Scheduled Functions

### Flow
1. User clicks "Generate Course" in UI
2. UI creates job in Convex, triggers scheduled function
3. Scheduled function runs every minute, processes pending jobs
4. Function updates job status and spawns async action
5. Action runs CLI in background
6. Results stream back to Convex
7. UI subscribes to real-time updates

### Characteristics
- ✅ No external dependencies, all within Convex
- ✅ Serverless, no infrastructure
- ✅ Integrated with existing database
- ⚠️ Up to 1-minute delay for processing
- ❌ Limited by Convex action timeout limits
- ❌ Less flexible than dedicated queue

### Best For
- Convex-first applications
- Simple queue requirements
- Teams wanting minimal infrastructure

---

## 6. Scaleway Containers with Webhooks

### Flow
1. User clicks "Generate Course" in UI
2. UI creates job in Convex
3. Convex mutation triggers HTTP webhook to Scaleway Container
4. Container (always warm) immediately processes request
5. Container runs CLI and posts progress updates back to Convex
6. On completion, final webhook updates Convex
7. UI shows real-time progress

### Characteristics
- ✅ No polling needed (webhook-driven)
- ✅ Minimal latency with warm containers
- ✅ Auto-scales based on load
- ✅ Good middle ground solution
- ⚠️ Webhook reliability handling needed
- ⚠️ Scaleway vendor dependency

### Best For
- Scaleway-based infrastructure
- Need for auto-scaling
- Webhook-based architectures

---

## 7. Direct Worker (No Queue)

### Flow
1. User clicks "Generate Course" in UI
2. UI makes direct HTTP request to worker service
3. Worker immediately starts processing
4. Worker sends Server-Sent Events (SSE) for progress
5. UI displays real-time progress via SSE stream
6. Final results saved to Convex
7. If worker crashes, job is lost (no persistence)

### Characteristics
- ✅ Simplest architecture
- ✅ Immediate processing
- ✅ Real-time updates via SSE
- ❌ No job persistence
- ❌ No retry mechanism
- ❌ Risk of losing jobs on failure
- ❌ No load balancing

### Best For
- Demo applications
- Real-time requirements
- Very low volume

---

## Comparison Matrix

| Feature | Convex Polling | BullMQ | AWS SQS | RabbitMQ | Convex Scheduled | Scaleway Webhook | Direct |
|---------|---------------|---------|----------|-----------|------------------|------------------|---------|
| **Latency** | 0-5s | Instant | Instant | Instant | 0-60s | Instant | Instant |
| **Reliability** | Medium | High | High | High | Medium | Medium | Low |
| **Scalability** | Low | High | Very High | High | Medium | High | Low |
| **Complexity** | Low | Medium | Medium | High | Low | Medium | Very Low |
| **Infrastructure** | None | Redis | None | RabbitMQ | None | Scaleway | None |
| **Cost** | DB queries | Redis hosting | Per message | Server hosting | Convex usage | Container hosting | Minimal |
| **Retries** | Manual | Automatic | Automatic | Automatic | Manual | Manual | None |
| **Monitoring** | Basic | Bull Board | CloudWatch | Management UI | Convex logs | Scaleway metrics | None |
| **Dead Letter Queue** | No | Yes | Yes | Yes | No | No | No |
| **Priority Queue** | No | Yes | Limited | Yes | No | No | No |

---

## Recommendations by Scale

### < 100 jobs/day
- **Recommended**: Convex polling (current solution)
- **Alternative**: Convex scheduled functions
- **Rationale**: Simplicity outweighs efficiency at this scale

### 100-1,000 jobs/day
- **Recommended**: BullMQ + Redis
- **Alternative**: Convex scheduled functions with optimizations
- **Rationale**: Need for reliability and monitoring becomes important

### 1,000-10,000 jobs/day
- **Recommended**: AWS SQS or Google Cloud Tasks
- **Alternative**: BullMQ with Redis cluster
- **Rationale**: Managed services reduce operational overhead

### 10,000+ jobs/day
- **Recommended**: AWS SQS with Lambda/ECS
- **Alternative**: RabbitMQ cluster
- **Rationale**: Need for auto-scaling and high availability

### Enterprise/Complex Workflows
- **Recommended**: RabbitMQ
- **Alternative**: AWS Step Functions + SQS
- **Rationale**: Advanced routing and workflow orchestration

### Budget-Conscious
- **Recommended**: Convex scheduled functions
- **Alternative**: Self-hosted BullMQ
- **Rationale**: Minimize external service costs

### Scaleway-Specific
- **Recommended**: Scaleway Containers with webhooks
- **Alternative**: Scaleway Instances with BullMQ
- **Rationale**: Leverage existing Scaleway infrastructure

---

## Migration Path

### Phase 1: Current State
- Continue with Convex polling
- Monitor performance and bottlenecks

### Phase 2: Quick Win (If needed)
- Implement Convex scheduled functions
- Reduce polling interval impact

### Phase 3: Production Scale
- Migrate to BullMQ + Redis
- Add monitoring and dashboards

### Phase 4: Cloud Scale (If needed)
- Move to AWS SQS/Lambda
- Implement auto-scaling

---

## Decision Criteria

When choosing a queue system, consider:

1. **Current Scale**: Number of jobs per day
2. **Growth Projections**: Expected scale in 6-12 months
3. **Team Expertise**: Familiarity with technologies
4. **Infrastructure Preferences**: Cloud vs self-hosted
5. **Budget Constraints**: Operational costs
6. **Reliability Requirements**: Acceptable failure rate
7. **Latency Requirements**: How quickly jobs must start
8. **Monitoring Needs**: Visibility into queue health
9. **Complexity Tolerance**: Team's ability to manage infrastructure

---

## Conclusion

For the Fondation project's current stage, the existing Convex polling solution is adequate. As the platform grows, migrating to BullMQ + Redis would provide the best balance of features, reliability, and cost. For enterprise deployments or complex requirements, consider RabbitMQ or cloud-native solutions like AWS SQS.

The key is to choose a solution that matches your current needs while providing a clear migration path for future growth.