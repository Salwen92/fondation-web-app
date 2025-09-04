/**
 * Secure Token Encryption Module for Worker
 *
 * Implements AES-256-GCM encryption for GitHub access tokens and other sensitive data.
 * This is the worker package's version of the encryption module.
 *
 * @module encryption
 */

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const _TAG_LENGTH = 16;
const ENCRYPTED_PREFIX = 'enc_v1_';

/**
 * Get or generate the encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ENCRYPTION_KEY environment variable is required in production. ' +
          'Generate one with: openssl rand -hex 32',
      );
    }
    return crypto.scryptSync('dev-key-do-not-use-in-production', 'salt', 32);
  }

  // Validate key format
  if (!/^[a-f0-9]{64}$/i.test(keyHex)) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate with: openssl rand -hex 32',
    );
  }

  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a token using AES-256-GCM
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: prefix_iv:tag:encrypted
    const result = `${ENCRYPTED_PREFIX + iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

    return result;
  } catch (_error) {
    // Don't leak sensitive information in error messages
    throw new Error('Token encryption failed');
  }
}

/**
 * Decrypt a token encrypted with encryptToken
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty string');
  }

  // Handle legacy base64 "obfuscation" for migration period
  if (encryptedData.startsWith('obf_')) {
    try {
      const base64Part = encryptedData.slice(4);
      return Buffer.from(base64Part, 'base64').toString('utf-8');
    } catch {
      throw new Error('Failed to decode legacy token');
    }
  }

  // Check for encrypted format
  if (!encryptedData.startsWith(ENCRYPTED_PREFIX)) {
    throw new Error('Invalid encrypted data format');
  }

  try {
    const key = getEncryptionKey();
    const parts = encryptedData.slice(ENCRYPTED_PREFIX.length).split(':');

    if (parts.length !== 3) {
      throw new Error('Malformed encrypted data');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (_error) {
    // Don't leak information about why decryption failed
    throw new Error('Token decryption failed');
  }
}

/**
 * Check if a string is encrypted with our encryption format
 */
export function isEncrypted(data: string): boolean {
  return data?.startsWith(ENCRYPTED_PREFIX) || false;
}

/**
 * Check if a string is using legacy obfuscation
 */
export function isLegacyObfuscated(data: string): boolean {
  return data?.startsWith('obf_') || false;
}

/**
 * Safely decrypt a token, handling various formats
 */
export function safeDecrypt(token: string): string {
  if (!token) {
    return token;
  }

  if (isEncrypted(token)) {
    return decryptToken(token);
  }

  if (isLegacyObfuscated(token)) {
    return Buffer.from(token.slice(4), 'base64').toString('utf-8');
  }

  // Assume it's already plaintext
  return token;
}

/**
 * Mask sensitive tokens in strings (for logging)
 */
export function maskSensitiveData(text: string): string {
  if (!text) {
    return text;
  }

  return (
    text
      // GitHub personal access tokens (classic)
      .replace(/ghp_[a-zA-Z0-9]{36}/g, 'ghp_***')
      // GitHub personal access tokens (fine-grained) - flexible length
      .replace(/github_pat_[a-zA-Z0-9_]{22,}/g, 'github_pat_***')
      // GitHub OAuth tokens
      .replace(/gho_[a-zA-Z0-9]{36}/g, 'gho_***')
      // GitHub server-to-server tokens
      .replace(/ghs_[a-zA-Z0-9]{36}/g, 'ghs_***')
      // GitHub refresh tokens
      .replace(/ghr_[a-zA-Z0-9]{36}/g, 'ghr_***')
      // Generic bearer tokens
      .replace(/Bearer [a-zA-Z0-9\-._~+/]+=*/g, 'Bearer ***')
      // Tokens in URLs
      .replace(/https:\/\/[a-zA-Z0-9_-]+@github\.com/g, 'https://***@github.com')
  );
}
