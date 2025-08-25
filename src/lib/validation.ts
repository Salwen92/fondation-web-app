/**
 * Runtime validation schemas for API endpoints
 * Uses Zod for type-safe validation
 */

import { z } from "zod";

// ============================================
// Common schemas
// ============================================

export const jobIdSchema = z.string().min(1, "Job ID is required");
export const repositoryUrlSchema = z.string().url("Invalid repository URL");
export const branchSchema = z.string().min(1).optional().default("main");
export const callbackUrlSchema = z.string().url("Invalid callback URL");
export const callbackTokenSchema = z.string().min(1, "Callback token is required");

// ============================================
// API Request Schemas
// ============================================

/**
 * Schema for /api/analyze-proxy request
 */
export const analyzeProxySchema = z.object({
  jobId: jobIdSchema,
  repositoryUrl: repositoryUrlSchema,
  branch: z.string().min(1).optional().default("main"),
  callbackUrl: callbackUrlSchema,
  callbackToken: callbackTokenSchema,
  githubToken: z.string().optional(),
});

export type AnalyzeProxyRequest = z.infer<typeof analyzeProxySchema>;

/**
 * Schema for /api/webhook/job-callback request
 */
export const jobCallbackSchema = z.object({
  jobId: jobIdSchema,
  type: z.enum(["progress", "complete", "error"]).optional(),
  status: z.string().optional(),
  timestamp: z.string().optional(),
  progress: z.string().optional(),
  step: z.number().int().min(0).optional(),
  totalSteps: z.number().int().min(1).optional(),
  error: z.string().optional(),
  files: z.array(z.object({
    path: z.string().optional(),
    type: z.string().optional(),
    content: z.string().optional(),
  })).optional(),
});

export type JobCallbackRequest = z.infer<typeof jobCallbackSchema>;

/**
 * Schema for /api/auth/store-token request
 */
export const storeTokenSchema = z.object({
  accessToken: z.string().min(1, "Access token is required"),
});

export type StoreTokenRequest = z.infer<typeof storeTokenSchema>;

/**
 * Schema for /api/jobs/[id]/cancel request params
 */
export const jobIdParamSchema = z.object({
  id: z.string().min(1, "Job ID parameter is required"),
});

export type JobIdParam = z.infer<typeof jobIdParamSchema>;

/**
 * Schema for /api/clear-stuck-jobs request
 */
export const clearStuckJobsSchema = z.object({
  repositoryFullName: z.string().min(1, "Repository full name is required"),
});

export type ClearStuckJobsRequest = z.infer<typeof clearStuckJobsSchema>;

// ============================================
// Response Schemas (for type safety)
// ============================================

/**
 * Generic error response schema
 */
export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
  code: z.string().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Success response schema
 */
export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.unknown().optional(),
});

export type SuccessResponse = z.infer<typeof successResponseSchema>;

// ============================================
// Validation Helpers
// ============================================

/**
 * Safely parse and validate request data
 * Returns either the validated data or a validation error
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Format Zod validation errors for API responses
 */
export function formatValidationError(error: z.ZodError): string {
  const errors = error.errors.map(err => {
    const path = err.path.join(".");
    return path ? `${path}: ${err.message}` : err.message;
  });
  return errors.join(", ");
}