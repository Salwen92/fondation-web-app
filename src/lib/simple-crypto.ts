/**
 * Simple crypto utilities for token encryption
 * This is a basic implementation for development and testing
 * Production should use more robust encryption methods
 */

import { logger } from "./logger";

/**
 * Simple token obfuscation (not real encryption)
 * This is a placeholder implementation for development
 * Production should implement proper AES-256 encryption
 */
export function obfuscateToken(token: string): string {
  if (!token) return token;
  
  // Simple base64 encoding with a prefix to indicate it's obfuscated
  const obfuscated = Buffer.from(token, 'utf-8').toString('base64');
  return `obf_${obfuscated}`;
}

/**
 * Simple token de-obfuscation
 * Reverse of the obfuscation process
 */
export function deobfuscateToken(obfuscatedToken: string): string {
  if (!obfuscatedToken) return obfuscatedToken;
  
  if (obfuscatedToken.startsWith('obf_')) {
    try {
      const base64Part = obfuscatedToken.slice(4); // Remove 'obf_' prefix
      return Buffer.from(base64Part, 'base64').toString('utf-8');
    } catch (error) {
      logger.error('Failed to deobfuscate token', error instanceof Error ? error : new Error(String(error)));
      return obfuscatedToken; // Return as-is if deobfuscation fails
    }
  }
  
  // Not obfuscated, return as-is
  return obfuscatedToken;
}

/**
 * Check if a token is obfuscated
 */
export function isObfuscated(token: string): boolean {
  return token?.startsWith('obf_') ?? false;
}

/**
 * Safe obfuscation - only obfuscate if not already obfuscated
 */
export function safeObfuscate(token: string): string {
  if (!token) return token;
  
  if (isObfuscated(token)) {
    return token; // Already obfuscated
  }
  
  return obfuscateToken(token);
}

/**
 * Safe deobfuscation - handles both obfuscated and plain tokens
 */
export function safeDeobfuscate(token: string): string {
  if (!token) return token;
  
  if (isObfuscated(token)) {
    return deobfuscateToken(token);
  }
  
  // Not obfuscated, return as-is
  return token;
}

// TODO: Production implementation plan
/*
Production Security Implementation Plan:
1. Replace simple obfuscation with AES-256-GCM encryption
2. Use proper key derivation function (PBKDF2 or scrypt)
3. Store encryption keys in secure key management service
4. Implement key rotation mechanism
5. Add audit logging for token access
6. Use proper random IV for each encryption
7. Add authentication tag validation
8. Implement secure key storage (AWS KMS, Azure Key Vault, etc.)
*/