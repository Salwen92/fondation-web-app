/**
 * Simple crypto utilities for token encryption
 * DEPRECATED: This module is being replaced with lib/encryption.ts
 * Kept for backward compatibility during migration
 */

import { logger } from "./logger";
import { encryptToken, decryptToken, isEncrypted, isLegacyObfuscated, maskSensitiveData } from "./encryption";

/**
 * @deprecated Use encryptToken from lib/encryption.ts instead
 */
export function obfuscateToken(token: string): string {
  if (!token) { return token; }
  
  // Migrate to real encryption
  return encryptToken(token);
}

/**
 * @deprecated Use decryptToken from lib/encryption.ts instead
 */
export function deobfuscateToken(obfuscatedToken: string): string {
  if (!obfuscatedToken) { return obfuscatedToken; }
  
  try {
    return decryptToken(obfuscatedToken);
  } catch (error) {
    logger.error('Failed to decrypt token', error instanceof Error ? error : new Error(String(error)));
    return obfuscatedToken; // Return as-is if decryption fails
  }
}

/**
 * @deprecated Use isEncrypted or isLegacyObfuscated from lib/encryption.ts instead
 */
export function isObfuscated(token: string): boolean {
  return isLegacyObfuscated(token) || isEncrypted(token);
}

/**
 * @deprecated Use safeEncrypt from lib/encryption.ts instead
 */
export function safeObfuscate(token: string): string {
  if (!token) { return token; }
  
  if (isEncrypted(token) || isLegacyObfuscated(token)) {
    return token; // Already encrypted/obfuscated
  }
  
  return encryptToken(token);
}

/**
 * @deprecated Use safeDecrypt from lib/encryption.ts instead
 */
export function safeDeobfuscate(token: string): string {
  if (!token) { return token; }
  
  try {
    return decryptToken(token);
  } catch {
    // Not encrypted, return as-is
    return token;
  }
}

// Migration Notice:
// This module is deprecated. All new code should use lib/encryption.ts
// which implements proper AES-256-GCM encryption.
// This file is kept for backward compatibility during the migration period.

// Re-export new encryption functions for convenience
export { maskSensitiveData } from './encryption';