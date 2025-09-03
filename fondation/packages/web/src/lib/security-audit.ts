/**
 * Security Audit and Monitoring Module
 * 
 * Provides comprehensive security event logging, monitoring, and alerting
 * for GitHub OAuth and token usage throughout the application.
 * 
 * @module security-audit
 */

import { maskSensitiveData } from './encryption';

export enum SecurityEventType {
  // Authentication events
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_FAILED = 'AUTH_FAILED',
  AUTH_TOKEN_REFRESH = 'AUTH_TOKEN_REFRESH',
  
  // Token events
  TOKEN_CREATED = 'TOKEN_CREATED',
  TOKEN_ACCESSED = 'TOKEN_ACCESSED',
  TOKEN_ENCRYPTED = 'TOKEN_ENCRYPTED',
  TOKEN_DECRYPTED = 'TOKEN_DECRYPTED',
  TOKEN_VALIDATION_FAILED = 'TOKEN_VALIDATION_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Repository access events
  REPO_CLONED = 'REPO_CLONED',
  REPO_ACCESS_DENIED = 'REPO_ACCESS_DENIED',
  PRIVATE_REPO_ACCESSED = 'PRIVATE_REPO_ACCESSED',
  
  // API events
  API_RATE_LIMIT_WARNING = 'API_RATE_LIMIT_WARNING',
  API_RATE_LIMIT_EXCEEDED = 'API_RATE_LIMIT_EXCEEDED',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  
  // Security violations
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  ENCRYPTION_KEY_MISSING = 'ENCRYPTION_KEY_MISSING',
  LEGACY_TOKEN_DETECTED = 'LEGACY_TOKEN_DETECTED',
}

export enum SecurityEventSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action: string;
  result: 'success' | 'failure';
  metadata?: Record<string, any>;
  error?: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  failedAuthentications: number;
  tokenAccesses: number;
  rateLimitHits: number;
  suspiciousActivities: number;
  lastEventTime?: string;
}

/**
 * Security Audit Logger
 */
export class SecurityAuditLogger {
  private static instance: SecurityAuditLogger;
  private events: SecurityEvent[] = [];
  private metrics: SecurityMetrics = {
    totalEvents: 0,
    failedAuthentications: 0,
    tokenAccesses: 0,
    rateLimitHits: 0,
    suspiciousActivities: 0,
  };
  
  private constructor() {}
  
  static getInstance(): SecurityAuditLogger {
    if (!SecurityAuditLogger.instance) {
      SecurityAuditLogger.instance = new SecurityAuditLogger();
    }
    return SecurityAuditLogger.instance;
  }
  
  /**
   * Log a security event
   */
  logEvent(
    type: SecurityEventType,
    action: string,
    options: {
      userId?: string;
      sessionId?: string;
      severity?: SecurityEventSeverity;
      result?: 'success' | 'failure';
      resource?: string;
      metadata?: Record<string, any>;
      error?: string;
      request?: Request;
    } = {}
  ): void {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type,
      severity: options.severity || this.getSeverityForType(type),
      action,
      result: options.result || 'success',
      userId: options.userId,
      sessionId: options.sessionId,
      resource: options.resource,
      metadata: options.metadata,
      error: options.error ? maskSensitiveData(options.error) : undefined,
    };
    
    // Extract request information if provided
    if (options.request) {
      event.ipAddress = this.getClientIp(options.request);
      event.userAgent = options.request.headers.get('user-agent') || undefined;
    }
    
    // Store event
    this.events.push(event);
    
    // Update metrics
    this.updateMetrics(event);
    
    // Check for suspicious patterns
    this.checkForSuspiciousActivity(event);
    
    // Log to console/external service
    this.outputEvent(event);
    
    // Trigger alerts if necessary
    this.checkAlertConditions(event);
  }
  
  /**
   * Log authentication event
   */
  logAuthentication(
    userId: string,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    this.logEvent(
      success ? SecurityEventType.AUTH_LOGIN : SecurityEventType.AUTH_FAILED,
      success ? 'User authenticated successfully' : 'Authentication failed',
      {
        userId,
        result: success ? 'success' : 'failure',
        severity: success ? SecurityEventSeverity.INFO : SecurityEventSeverity.WARNING,
        metadata,
      }
    );
  }
  
  /**
   * Log token access event
   */
  logTokenAccess(
    userId: string,
    action: string,
    resource?: string
  ): void {
    this.logEvent(
      SecurityEventType.TOKEN_ACCESSED,
      action,
      {
        userId,
        resource,
        severity: SecurityEventSeverity.INFO,
      }
    );
  }
  
  /**
   * Log repository access
   */
  logRepositoryAccess(
    userId: string,
    repository: string,
    isPrivate: boolean,
    success: boolean
  ): void {
    this.logEvent(
      isPrivate ? SecurityEventType.PRIVATE_REPO_ACCESSED : SecurityEventType.REPO_CLONED,
      `Repository ${repository} accessed`,
      {
        userId,
        resource: repository,
        result: success ? 'success' : 'failure',
        severity: isPrivate ? SecurityEventSeverity.WARNING : SecurityEventSeverity.INFO,
        metadata: { isPrivate },
      }
    );
  }
  
  /**
   * Log rate limit event
   */
  logRateLimit(
    userId: string,
    remaining: number,
    limit: number
  ): void {
    const severity = remaining === 0 
      ? SecurityEventSeverity.ERROR 
      : SecurityEventSeverity.WARNING;
    
    this.logEvent(
      remaining === 0 
        ? SecurityEventType.API_RATE_LIMIT_EXCEEDED
        : SecurityEventType.API_RATE_LIMIT_WARNING,
      `Rate limit: ${remaining}/${limit} requests remaining`,
      {
        userId,
        severity,
        metadata: { remaining, limit },
      }
    );
  }
  
  /**
   * Get security metrics
   */
  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Get recent events
   */
  getRecentEvents(count = 100): SecurityEvent[] {
    return this.events.slice(-count);
  }
  
  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEventType): SecurityEvent[] {
    return this.events.filter(e => e.type === type);
  }
  
  /**
   * Get suspicious activities
   */
  getSuspiciousActivities(): SecurityEvent[] {
    return this.events.filter(e => 
      e.type === SecurityEventType.SUSPICIOUS_ACTIVITY ||
      e.severity === SecurityEventSeverity.CRITICAL
    );
  }
  
  // Private methods
  
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getSeverityForType(type: SecurityEventType): SecurityEventSeverity {
    switch (type) {
      case SecurityEventType.UNAUTHORIZED_ACCESS:
      case SecurityEventType.ENCRYPTION_KEY_MISSING:
        return SecurityEventSeverity.CRITICAL;
      
      case SecurityEventType.AUTH_FAILED:
      case SecurityEventType.TOKEN_VALIDATION_FAILED:
      case SecurityEventType.API_RATE_LIMIT_EXCEEDED:
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
      case SecurityEventType.LEGACY_TOKEN_DETECTED:
        return SecurityEventSeverity.WARNING;
      
      case SecurityEventType.API_REQUEST_FAILED:
      case SecurityEventType.REPO_ACCESS_DENIED:
        return SecurityEventSeverity.ERROR;
      
      default:
        return SecurityEventSeverity.INFO;
    }
  }
  
  private updateMetrics(event: SecurityEvent): void {
    this.metrics.totalEvents++;
    this.metrics.lastEventTime = event.timestamp;
    
    if (event.type === SecurityEventType.AUTH_FAILED) {
      this.metrics.failedAuthentications++;
    }
    
    if (event.type === SecurityEventType.TOKEN_ACCESSED) {
      this.metrics.tokenAccesses++;
    }
    
    if (event.type === SecurityEventType.API_RATE_LIMIT_WARNING ||
        event.type === SecurityEventType.API_RATE_LIMIT_EXCEEDED) {
      this.metrics.rateLimitHits++;
    }
    
    if (event.type === SecurityEventType.SUSPICIOUS_ACTIVITY) {
      this.metrics.suspiciousActivities++;
    }
  }
  
  private checkForSuspiciousActivity(event: SecurityEvent): void {
    // Check for rapid failed authentication attempts
    const recentFailures = this.events
      .filter(e => 
        e.type === SecurityEventType.AUTH_FAILED &&
        e.userId === event.userId &&
        Date.now() - new Date(e.timestamp).getTime() < 300000 // 5 minutes
      );
    
    if (recentFailures.length > 5) {
      this.logEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        'Multiple failed authentication attempts detected',
        {
          userId: event.userId,
          severity: SecurityEventSeverity.CRITICAL,
          metadata: { failureCount: recentFailures.length },
        }
      );
    }
    
    // Check for unusual token access patterns
    const recentTokenAccesses = this.events
      .filter(e =>
        e.type === SecurityEventType.TOKEN_ACCESSED &&
        e.userId === event.userId &&
        Date.now() - new Date(e.timestamp).getTime() < 60000 // 1 minute
      );
    
    if (recentTokenAccesses.length > 10) {
      this.logEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        'Unusual token access pattern detected',
        {
          userId: event.userId,
          severity: SecurityEventSeverity.WARNING,
          metadata: { accessCount: recentTokenAccesses.length },
        }
      );
    }
  }
  
  private checkAlertConditions(event: SecurityEvent): void {
    // Alert on critical events
    if (event.severity === SecurityEventSeverity.CRITICAL) {
      this.sendAlert('CRITICAL', event);
    }
    
    // Alert on repeated failures
    if (this.metrics.failedAuthentications > 10) {
      this.sendAlert('AUTH_FAILURES', event);
    }
    
    // Alert on rate limit issues
    if (event.type === SecurityEventType.API_RATE_LIMIT_EXCEEDED) {
      this.sendAlert('RATE_LIMIT', event);
    }
  }
  
  private sendAlert(type: string, event: SecurityEvent): void {
    // In production, this would send to monitoring service
    console.error(`SECURITY ALERT [${type}]:`, {
      eventId: event.id,
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      timestamp: event.timestamp,
    });
  }
  
  private outputEvent(event: SecurityEvent): void {
    const logData = {
      ...event,
      // Remove sensitive data from logs
      metadata: event.metadata ? maskSensitiveData(JSON.stringify(event.metadata)) : undefined,
    };
    
    // In production, send to centralized logging
    if (process.env.NODE_ENV === 'production') {
      // Send to logging service
      console.log(JSON.stringify(logData));
    } else {
      // Development logging
      if (event.severity === SecurityEventSeverity.ERROR ||
          event.severity === SecurityEventSeverity.CRITICAL) {
        console.error('[SECURITY]', logData);
      } else if (event.severity === SecurityEventSeverity.WARNING) {
        console.warn('[SECURITY]', logData);
      } else {
        console.log('[SECURITY]', logData);
      }
    }
  }
  
  private getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0]?.trim() || 'unknown';
    }
    
    return realIp || 'unknown';
  }
}

// Export singleton instance
export const securityAudit = SecurityAuditLogger.getInstance();

// Convenience logging functions
export const logSecurityEvent = securityAudit.logEvent.bind(securityAudit);
export const logAuthentication = securityAudit.logAuthentication.bind(securityAudit);
export const logTokenAccess = securityAudit.logTokenAccess.bind(securityAudit);
export const logRepositoryAccess = securityAudit.logRepositoryAccess.bind(securityAudit);
export const logRateLimit = securityAudit.logRateLimit.bind(securityAudit);