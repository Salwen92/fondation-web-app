/**
 * Input validation and sanitization utilities
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: unknown;
}

/**
 * Common validation patterns
 */
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  githubRepo: /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const;

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(
  html: string,
  options?: Parameters<typeof DOMPurify.sanitize>[1],
): string {
  const result = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    ...options,
  });
  // DOMPurify returns a string or TrustedHTML
  return String(result);
}

/**
 * Sanitize user input for safe display
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Validate GitHub repository format
 */
export function validateGitHubRepo(repo: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeInput(repo);

  if (!sanitized) {
    errors.push('Le nom du dépôt est requis');
  } else if (!patterns.githubRepo.test(sanitized)) {
    errors.push('Format invalide. Utilisez: owner/repository');
  } else if (sanitized.length > 100) {
    errors.push('Le nom du dépôt est trop long');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeInput(email.toLowerCase());

  if (!sanitized) {
    errors.push("L'adresse email est requise");
  } else if (!patterns.email.test(sanitized)) {
    errors.push("Format d'email invalide");
  } else if (sanitized.length > 254) {
    errors.push("L'adresse email est trop longue");
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate URL
 */
export function validateUrl(url: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeInput(url);

  if (!sanitized) {
    errors.push("L'URL est requise");
  } else if (!patterns.url.test(sanitized)) {
    errors.push("Format d'URL invalide");
  } else if (sanitized.length > 2048) {
    errors.push("L'URL est trop longue");
  }

  // Additional security checks
  try {
    const parsed = new URL(sanitized);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      errors.push('Seuls les protocoles HTTP(S) sont autorisés');
    }
  } catch {
    errors.push('URL malformée');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate and sanitize search query
 */
export function validateSearchQuery(query: string, maxLength = 100): ValidationResult {
  const errors: string[] = [];
  let sanitized = sanitizeInput(query);

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    errors.push(`La recherche a été limitée à ${maxLength} caractères`);
  }

  // Remove special regex characters that could cause issues
  sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '');

  return {
    isValid: true, // Search queries are always "valid" after sanitization
    errors,
    sanitized,
  };
}

/**
 * Validate numeric input
 */
export function validateNumber(
  value: string | number,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
  },
): ValidationResult {
  const errors: string[] = [];
  const num = typeof value === 'string' ? Number.parseFloat(value) : value;

  if (Number.isNaN(num)) {
    errors.push('Valeur numérique invalide');
  } else {
    if (options?.integer && !Number.isInteger(num)) {
      errors.push('La valeur doit être un nombre entier');
    }
    if (options?.min !== undefined && num < options.min) {
      errors.push(`La valeur doit être au moins ${options.min}`);
    }
    if (options?.max !== undefined && num > options.max) {
      errors.push(`La valeur ne doit pas dépasser ${options.max}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: num,
  };
}

/**
 * Create a validated form handler
 */
export function createValidatedForm<T extends Record<string, unknown>>(
  validators: {
    [K in keyof T]: (value: unknown) => ValidationResult;
  },
) {
  return {
    validate: (
      data: Partial<T>,
    ): { isValid: boolean; errors: Record<string, string[]>; sanitized: Partial<T> } => {
      const errors: Record<string, string[]> = {};
      const sanitized: Partial<T> = {};
      let isValid = true;

      for (const [key, validator] of Object.entries(validators)) {
        const value = data[key as keyof T];
        const result = (validator as (value: unknown) => ValidationResult)(value);

        if (!result.isValid) {
          errors[key] = result.errors;
          isValid = false;
        }

        if (result.sanitized !== undefined) {
          sanitized[key as keyof T] = result.sanitized as T[keyof T];
        }
      }

      return { isValid, errors, sanitized };
    },
  };
}
