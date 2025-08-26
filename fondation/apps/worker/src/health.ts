import { createServer, IncomingMessage, ServerResponse } from "http";
import { HealthCheck } from "@fondation/shared";

export class HealthServer {
  private server: ReturnType<typeof createServer> | null = null;
  
  constructor(private worker: any) {}
  
  listen(port: number): void {
    this.server = createServer((req, res) => {
      this.handleRequest(req, res);
    });
    
    this.server.listen(port, () => {
      console.log(`🏥 Health server listening on port ${port}`);
      console.log(`   GET /health - Health check`);
      console.log(`   GET /metrics - Worker metrics`);
    });
  }
  
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log("🏥 Health server stopped");
    }
  }
  
  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url || "/";
    
    // CORS headers for monitoring tools
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    if (url === "/health") {
      this.handleHealth(res);
    } else if (url === "/metrics") {
      this.handleMetrics(res);
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "Not found" }));
    }
  }
  
  private handleHealth(res: ServerResponse): void {
    const memoryUsage = process.memoryUsage();
    const stats = this.worker.workerStats;
    
    const health: HealthCheck = {
      status: this.worker.isHealthy ? "healthy" : "degraded",
      uptime: process.uptime(),
      lastJobTime: stats.lastJobTime,
      activeJobs: stats.activeJobs,
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      },
    };
    
    const statusCode = health.status === "healthy" ? 200 : 503;
    res.statusCode = statusCode;
    res.end(JSON.stringify(health, null, 2));
  }
  
  private handleMetrics(res: ServerResponse): void {
    const stats = this.worker.workerStats;
    
    const metrics = {
      jobsProcessed: stats.total,
      jobsSucceeded: stats.succeeded,
      jobsFailed: stats.failed,
      activeJobs: stats.activeJobs,
      averageJobDuration: stats.averageTime,
      successRate: stats.total > 0 ? stats.succeeded / stats.total : 0,
      uptime: process.uptime(),
      timestamp: Date.now(),
    };
    
    res.statusCode = 200;
    res.end(JSON.stringify(metrics, null, 2));
  }
}