/**
 * Simple crypto utilities for token encryption
 * DEPRECATED: Being replaced with encryption.ts for proper AES-256-GCM encryption
 */

import { encryptToken, decryptToken, isEncrypted, isLegacyObfuscated, maskSensitiveData, safeDecrypt } from './encryption';

/**
 * @deprecated Use encryptToken from encryption.ts instead
 */
export function obfuscateToken(token: string): string {
  if (!token) { return token; }
  
  // Migrate to real encryption
  return encryptToken(token);
}

/**
 * @deprecated Use decryptToken from encryption.ts instead
 */
export function deobfuscateToken(obfuscatedToken: string): string {
  if (!obfuscatedToken) { return obfuscatedToken; }
  
  try {
    return decryptToken(obfuscatedToken);
  } catch (_error) {
    return obfuscatedToken; // Return as-is if decryption fails
  }
}

/**
 * @deprecated Use isEncrypted or isLegacyObfuscated from encryption.ts instead
 */
export function isObfuscated(token: string): boolean {
  return isLegacyObfuscated(token) || isEncrypted(token);
}

/**
 * @deprecated Use encryptToken from encryption.ts instead
 */
export function safeObfuscate(token: string): string {
  if (!token) { return token; }
  
  if (isEncrypted(token) || isLegacyObfuscated(token)) {
    return token; // Already encrypted/obfuscated
  }
  
  return encryptToken(token);
}

/**
 * @deprecated Use safeDecrypt from encryption.ts instead
 */
export function safeDeobfuscate(token: string): string {
  return safeDecrypt(token);
}

/**
 * Get simple crypto functions
 * Returns the safeDeobfuscate function for backward compatibility
 */
export function getSimpleCrypto() {
  return safeDeobfuscate;
}

// Re-export for convenience
export { maskSensitiveData };

// Migration Notice:
// This module is deprecated. All new code should use encryption.ts
// which implements proper AES-256-GCM encryption.