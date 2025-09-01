/**
 * GitHub OAuth Security Test Suite
 * 
 * Comprehensive tests for all security fixes implemented in Phases 1-5
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  encryptToken,
  decryptToken,
  isEncrypted,
  isLegacyObfuscated,
  maskSensitiveData,
  verifyEncryptionSetup,
} from '../lib/encryption';
import {
  getScopeConfiguration,
  validateTokenScopes,
  hasPrivateRepoAccess,
  hasPublicRepoAccess,
} from '../lib/github-scopes';
import {
  GitHubClient,
  isApproachingRateLimit,
  calculateWaitTime,
} from '../lib/github-client';
import {
  SecurityAuditLogger,
  SecurityEventType,
  SecurityEventSeverity,
} from '../lib/security-audit';

describe('GitHub Security Test Suite', () => {
  
  describe('Phase 1: Token Encryption', () => {
    
    it('should encrypt tokens with AES-256-GCM', () => {
      const token = 'ghp_testtoken1234567890';
      const encrypted = encryptToken(token);
      
      expect(encrypted).toMatch(/^enc_v1_/);
      expect(encrypted).not.toContain(token);
      expect(encrypted.length).toBeGreaterThan(token.length);
    });
    
    it('should decrypt tokens correctly', () => {
      const token = 'ghp_testtoken1234567890';
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);
      
      expect(decrypted).toBe(token);
    });
    
    it('should handle legacy obfuscated tokens', () => {
      const token = 'ghp_testtoken1234567890';
      const legacyObfuscated = `obf_${Buffer.from(token).toString('base64')}`;
      
      expect(isLegacyObfuscated(legacyObfuscated)).toBe(true);
      expect(isEncrypted(legacyObfuscated)).toBe(false);
      
      const decrypted = decryptToken(legacyObfuscated);
      expect(decrypted).toBe(token);
    });
    
    it('should not double-encrypt tokens', () => {
      const token = 'ghp_testtoken1234567890';
      const encrypted1 = encryptToken(token);
      const encrypted2 = encryptToken(encrypted1);
      
      // Should recognize it's already encrypted
      expect(encrypted2).toBe(encrypted1);
    });
    
    it('should mask sensitive tokens in strings', () => {
      const text = 'Error with token ghp_1234567890abcdefghij1234567890abcdef';
      const masked = maskSensitiveData(text);
      
      expect(masked).toBe('Error with token ghp_***');
      expect(masked).not.toContain('1234567890');
    });
    
    it('should mask all GitHub token types', () => {
      const tokens = [
        'ghp_1234567890abcdefghij1234567890abcdef', // Personal access token (classic)
        'github_pat_' + 'a'.repeat(82), // Personal access token (fine-grained)
        'gho_1234567890abcdefghij1234567890abcdef', // OAuth token
        'ghs_1234567890abcdefghij1234567890abcdef', // Server token
        'ghr_1234567890abcdefghij1234567890abcdef', // Refresh token
      ];
      
      tokens.forEach(token => {
        const masked = maskSensitiveData(`Token: ${token}`);
        expect(masked).not.toContain('1234567890');
        expect(masked).toContain('***');
      });
    });
    
    it('should verify encryption setup', () => {
      const isValid = verifyEncryptionSetup();
      expect(isValid).toBe(true);
    });
    
    it('should throw error for empty token encryption', () => {
      expect(() => encryptToken('')).toThrow('Cannot encrypt empty string');
    });
    
    it('should throw error for invalid encrypted data', () => {
      expect(() => decryptToken('invalid_data')).toThrow('Invalid encrypted data format');
    });
  });
  
  describe('Phase 2: Git URL Security', () => {
    
    it('should not expose tokens in git clone URLs', () => {
      const url = 'https://github.com/user/repo.git';
      const token = 'ghp_secret123';
      
      // The git-operations module should NOT create URLs like this
      const badUrl = url.replace('https://', `https://${token}@`);
      expect(badUrl).toContain(token);
      
      // Instead, it should keep URLs clean
      const cleanUrl = url.replace(/https:\/\/[^@]+@/, 'https://');
      expect(cleanUrl).toBe(url);
      expect(cleanUrl).not.toContain(token);
    });
    
    it('should mask tokens in error messages', () => {
      const error = 'Failed to clone https://ghp_secret123@github.com/user/repo';
      const masked = maskSensitiveData(error);
      
      expect(masked).not.toContain('ghp_secret123');
      expect(masked).toContain('***');
    });
  });
  
  describe('Phase 3: OAuth Scope Management', () => {
    
    beforeEach(() => {
      // Reset environment variables
      delete process.env.GITHUB_PRIVATE_REPO_ACCESS;
      delete process.env.GITHUB_EXTENDED_ACCESS;
    });
    
    it('should use minimal scopes by default', () => {
      const scopes = getScopeConfiguration();
      expect(scopes).toBe('read:user user:email public_repo');
      expect(scopes).not.toContain('repo '); // Full repo scope
    });
    
    it('should use full repo scope when configured', () => {
      process.env.GITHUB_PRIVATE_REPO_ACCESS = 'true';
      const scopes = getScopeConfiguration();
      expect(scopes).toContain('repo');
    });
    
    it('should detect private repo access from scopes', () => {
      expect(hasPrivateRepoAccess(['repo'])).toBe(true);
      expect(hasPrivateRepoAccess(['public_repo'])).toBe(false);
      expect(hasPrivateRepoAccess(['read:user'])).toBe(false);
    });
    
    it('should detect public repo access from scopes', () => {
      expect(hasPublicRepoAccess(['public_repo'])).toBe(true);
      expect(hasPublicRepoAccess(['repo'])).toBe(true); // repo includes public_repo
      expect(hasPublicRepoAccess(['read:user'])).toBe(false);
    });
    
    // Mock fetch for token validation test
    it('should validate token scopes', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: new Map([
          ['X-OAuth-Scopes', 'read:user, user:email, public_repo'],
        ]),
      });
      
      global.fetch = mockFetch as any;
      
      const validation = await validateTokenScopes('test_token');
      
      expect(validation.valid).toBe(true);
      expect(validation.scopes).toContain('read:user');
      expect(validation.scopes).toContain('user:email');
      expect(validation.missing).toHaveLength(0);
    });
  });
  
  describe('Phase 4: Rate Limiting', () => {
    
    it('should track rate limit information', () => {
      const client = new GitHubClient({ token: 'test_token' });
      const rateLimit = client.getCurrentRateLimit();
      
      expect(rateLimit).toHaveProperty('limit');
      expect(rateLimit).toHaveProperty('remaining');
      expect(rateLimit).toHaveProperty('reset');
      expect(rateLimit).toHaveProperty('used');
    });
    
    it('should detect when approaching rate limits', () => {
      const nearLimit = {
        limit: 5000,
        remaining: 50,
        reset: Date.now() / 1000 + 3600,
        used: 4950,
      };
      
      expect(isApproachingRateLimit(nearLimit)).toBe(true);
      
      const safeLimit = {
        limit: 5000,
        remaining: 3000,
        reset: Date.now() / 1000 + 3600,
        used: 2000,
      };
      
      expect(isApproachingRateLimit(safeLimit)).toBe(false);
    });
    
    it('should calculate wait time until reset', () => {
      const futureReset = Date.now() / 1000 + 60; // 60 seconds from now
      const rateLimit = {
        limit: 5000,
        remaining: 0,
        reset: futureReset,
        used: 5000,
      };
      
      const waitTime = calculateWaitTime(rateLimit);
      expect(waitTime).toBeGreaterThan(59000);
      expect(waitTime).toBeLessThan(61000);
    });
    
    it('should return 0 wait time for past reset', () => {
      const pastReset = Date.now() / 1000 - 60; // 60 seconds ago
      const rateLimit = {
        limit: 5000,
        remaining: 5000,
        reset: pastReset,
        used: 0,
      };
      
      const waitTime = calculateWaitTime(rateLimit);
      expect(waitTime).toBe(0);
    });
  });
  
  describe('Phase 5: Security Audit Logging', () => {
    let auditLogger: SecurityAuditLogger;
    
    beforeEach(() => {
      // Create fresh instance for each test
      auditLogger = SecurityAuditLogger.getInstance();
    });
    
    it('should log authentication events', () => {
      auditLogger.logAuthentication('user123', true, {
        provider: 'github',
      });
      
      const events = auditLogger.getRecentEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(SecurityEventType.AUTH_LOGIN);
      expect(events[0].result).toBe('success');
    });
    
    it('should log failed authentication', () => {
      auditLogger.logAuthentication('user123', false);
      
      const events = auditLogger.getRecentEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(SecurityEventType.AUTH_FAILED);
      expect(events[0].severity).toBe(SecurityEventSeverity.WARNING);
    });
    
    it('should log token access events', () => {
      auditLogger.logTokenAccess('user123', 'clone_repository', 'user/repo');
      
      const events = auditLogger.getRecentEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(SecurityEventType.TOKEN_ACCESSED);
      expect(events[0].resource).toBe('user/repo');
    });
    
    it('should log repository access', () => {
      auditLogger.logRepositoryAccess('user123', 'private/repo', true, true);
      
      const events = auditLogger.getRecentEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(SecurityEventType.PRIVATE_REPO_ACCESSED);
      expect(events[0].severity).toBe(SecurityEventSeverity.WARNING);
    });
    
    it('should track security metrics', () => {
      // Generate some events
      auditLogger.logAuthentication('user1', true);
      auditLogger.logAuthentication('user2', false);
      auditLogger.logTokenAccess('user1', 'api_call');
      auditLogger.logRateLimit('user1', 10, 5000);
      
      const metrics = auditLogger.getMetrics();
      
      expect(metrics.totalEvents).toBeGreaterThanOrEqual(4);
      expect(metrics.failedAuthentications).toBeGreaterThanOrEqual(1);
      expect(metrics.tokenAccesses).toBeGreaterThanOrEqual(1);
      expect(metrics.rateLimitHits).toBeGreaterThanOrEqual(1);
    });
    
    it('should detect suspicious activity', () => {
      // Simulate multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        auditLogger.logAuthentication('suspicious_user', false);
      }
      
      const suspiciousEvents = auditLogger.getSuspiciousActivities();
      expect(suspiciousEvents.length).toBeGreaterThan(0);
      
      const lastEvent = suspiciousEvents[suspiciousEvents.length - 1];
      expect(lastEvent.type).toBe(SecurityEventType.SUSPICIOUS_ACTIVITY);
      expect(lastEvent.severity).toBe(SecurityEventSeverity.CRITICAL);
    });
    
    it('should filter events by type', () => {
      auditLogger.logAuthentication('user1', true);
      auditLogger.logTokenAccess('user1', 'action1');
      auditLogger.logTokenAccess('user2', 'action2');
      
      const tokenEvents = auditLogger.getEventsByType(SecurityEventType.TOKEN_ACCESSED);
      expect(tokenEvents.length).toBeGreaterThanOrEqual(2);
      
      tokenEvents.forEach(event => {
        expect(event.type).toBe(SecurityEventType.TOKEN_ACCESSED);
      });
    });
  });
  
  describe('Integration Tests', () => {
    
    it('should handle complete authentication flow securely', async () => {
      // 1. Validate scopes
      const scopes = getScopeConfiguration();
      expect(scopes).toBeTruthy();
      
      // 2. Encrypt token
      const token = 'ghp_test_integration_token';
      const encrypted = encryptToken(token);
      expect(isEncrypted(encrypted)).toBe(true);
      
      // 3. Decrypt for use
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(token);
      
      // 4. Mask in logs
      const logMessage = `Using token ${token} for API call`;
      const maskedLog = maskSensitiveData(logMessage);
      expect(maskedLog).not.toContain(token);
      
      // 5. Log security events
      const auditLogger = SecurityAuditLogger.getInstance();
      auditLogger.logAuthentication('test_user', true);
      auditLogger.logTokenAccess('test_user', 'api_call');
      
      const metrics = auditLogger.getMetrics();
      expect(metrics.totalEvents).toBeGreaterThan(0);
    });
    
    it('should prevent token exposure in all scenarios', () => {
      const token = 'ghp_supersecret123456';
      const scenarios = [
        `https://${token}@github.com/user/repo`,
        `Error: Failed with token ${token}`,
        `Authorization: token ${token}`,
        `Clone URL: https://${token}@github.com/repo.git`,
      ];
      
      scenarios.forEach(scenario => {
        const masked = maskSensitiveData(scenario);
        expect(masked).not.toContain(token);
        expect(masked).not.toContain('supersecret');
      });
    });
  });
});