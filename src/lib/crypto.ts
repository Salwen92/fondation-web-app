/**
 * Cryptographic utilities for sensitive data protection
 * Uses Web Crypto API for secure encryption/decryption
 */

import { logger } from "./logger";

// Get encryption key from environment or generate a default one for dev
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? "dev-only-key-replace-in-production";

/**
 * Derives a cryptographic key from a password string
 */
async function deriveKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("fondation-salt-v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts sensitive data using AES-GCM
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const key = await deriveKey(ENCRYPTION_KEY);
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate a random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    // Return as base64
    return Buffer.from(combined).toString("base64");
  } catch (error) {
    logger.error("Encryption failed", error as Error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypts data encrypted with encrypt()
 */
export async function decrypt(encryptedBase64: string): Promise<string> {
  try {
    const key = await deriveKey(ENCRYPTION_KEY);
    const combined = Buffer.from(encryptedBase64, "base64");
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    const decryptedData = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedData
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    logger.error("Decryption failed", error as Error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Hashes sensitive data for secure comparison
 */
export async function hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Buffer.from(hashBuffer).toString("hex");
}

/**
 * Generates a secure random token
 */
export function generateSecureToken(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Buffer.from(bytes).toString("base64url");
}

/**
 * Validates that encryption is properly configured
 */
export function validateEncryptionConfig(): boolean {
  if (process.env.NODE_ENV === "production" && ENCRYPTION_KEY === "dev-only-key-replace-in-production") {
    logger.fatal("Production encryption key not configured");
    return false;
  }
  return true;
}