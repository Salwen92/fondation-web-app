import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

// Local type until workspace resolution is fixed
type HealthCheck = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  workerId: string;
  uptime: number;
  lastJobTime: number;
  activeJobs: number;
  maxConcurrentJobs: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    percentUsed: number;
  };
  cpu: {
    loadAverage: number[];
    cores: number;
  };
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    totalMemory: number;
    freeMemory: number;
  };
};

import os from 'node:os';

interface WorkerInterface {
  isHealthy: boolean;
  workerStats: {
    total: number;
    succeeded: number;
    failed: number;
    totalTime: number;
    activeJobs: number;
    lastJobTime: number;
  };
  config: {
    workerId: string;
    maxConcurrentJobs: number;
  };
}

export class HealthServer {
  private server: ReturnType<typeof createServer> | null = null;
  private startTime: number = Date.now();

  constructor(private worker: WorkerInterface) {}

  listen(port: number): void {
    this.server = createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(port, () => {
      // Server started - no additional action needed
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url || '/';

    // CORS headers for monitoring tools
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (url === '/health') {
      this.handleHealth(res);
    } else if (url === '/metrics') {
      this.handleMetrics(res);
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  private handleHealth(res: ServerResponse): void {
    const memoryUsage = process.memoryUsage();
    const stats = this.worker.workerStats;
    const cpuLoad = os.loadavg();

    // Determine health status based on metrics
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const timeSinceLastJob = Date.now() - stats.lastJobTime;

    if (memoryPercent > 90 || cpuLoad[0] > os.cpus().length * 2) {
      status = 'unhealthy';
    } else if (memoryPercent > 75 || timeSinceLastJob > 600000) {
      // 10 minutes
      status = 'degraded';
    }

    const health: HealthCheck = {
      status,
      workerId: this.worker.config.workerId,
      uptime: process.uptime(),
      lastJobTime: stats.lastJobTime,
      activeJobs: stats.activeJobs,
      maxConcurrentJobs: this.worker.config.maxConcurrentJobs,
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        percentUsed: memoryPercent,
      },
      cpu: {
        loadAverage: cpuLoad,
        cores: os.cpus().length,
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
      },
    };

    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 206 : 503;
    res.statusCode = statusCode;
    res.end(JSON.stringify(health, null, 2));
  }

  private handleMetrics(res: ServerResponse): void {
    const stats = this.worker.workerStats;
    const memoryUsage = process.memoryUsage();

    // Calculate average job duration
    const averageJobDuration = stats.total > 0 ? stats.totalTime / stats.total : 0;

    // Calculate metrics for Prometheus/monitoring tools
    const metrics = {
      // Job metrics
      jobs_total: stats.total,
      jobs_succeeded_total: stats.succeeded,
      jobs_failed_total: stats.failed,
      jobs_active: stats.activeJobs,
      jobs_duration_average_ms: Math.round(averageJobDuration),
      jobs_success_rate: stats.total > 0 ? stats.succeeded / stats.total : 1,
      jobs_failure_rate: stats.total > 0 ? stats.failed / stats.total : 0,

      // System metrics
      process_uptime_seconds: Math.round(process.uptime()),
      process_memory_heap_used_bytes: memoryUsage.heapUsed,
      process_memory_heap_total_bytes: memoryUsage.heapTotal,
      process_memory_rss_bytes: memoryUsage.rss,

      // Worker info
      worker_id: this.worker.config.workerId,
      worker_start_time: this.startTime,
      worker_max_concurrent_jobs: this.worker.config.maxConcurrentJobs,

      // Timestamp
      timestamp: Date.now(),
    };

    res.statusCode = 200;
    res.end(JSON.stringify(metrics, null, 2));
  }
}
