/**
 * Runtime API validation schemas using Zod
 */

import { z } from "zod";
import { logger } from "./logger";

// Job creation schema
export const createJobSchema = z.object({
  repositoryUrl: z.string().url().refine(
    (url) => url.includes("github.com"),
    "Must be a GitHub repository URL"
  ),
  branch: z.string().min(1).default("main"),
  userId: z.string().min(1),
});

// Job callback schema
export const jobCallbackSchema = z.object({
  jobId: z.string().min(1),
  type: z.enum(["progress", "complete", "error"]),
  status: z.enum([
    "pending",
    "cloning",
    "analyzing", 
    "gathering",
    "running",
    "completed",
    "failed",
    "canceled",
    "success",
  ]),
  message: z.string().optional(),
  progress: z.string().optional(),
  step: z.number().optional(),
  totalSteps: z.number().optional(),
  duration: z.number().optional(),
  filesCount: z.number().optional(),
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
    type: z.enum(["yaml", "markdown"]),
    size: z.number(),
  })).optional(),
  error: z.string().optional(),
  timestamp: z.string().datetime(),
});

// Analyze proxy schema
export const analyzeProxySchema = z.object({
  jobId: z.string().min(1),
  repositoryUrl: z.string().url(),
  branch: z.string().min(1).default("main"),
  callbackUrl: z.string().url(),
  callbackToken: z.string().min(1),
});

// Cancel job schema
export const cancelJobSchema = z.object({
  jobId: z.string().min(1),
});

// GitHub webhook schema
export const githubWebhookSchema = z.object({
  action: z.string(),
  repository: z.object({
    full_name: z.string(),
    default_branch: z.string(),
    html_url: z.string().url(),
  }).optional(),
  sender: z.object({
    login: z.string(),
    id: z.number(),
  }).optional(),
});

/**
 * Validate request body against schema
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json() as unknown;
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
      logger.warn("API validation failed", {
        url: request.url,
        method: request.method,
        extra: { errors },
      });
      return { success: false, error: errors };
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    logger.error("Failed to parse request body", error as Error, {
      url: request.url,
      method: request.method,
    });
    return { success: false, error: "Invalid JSON in request body" };
  }
}

/**
 * Validate query parameters against schema
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
    return { success: false, error: errors };
  }
  
  return { success: true, data: result.data };
}

/**
 * Create a validated API route handler
 */
export function createValidatedHandler<T>(
  schema: z.ZodSchema<T>,
  handler: (data: T, request: Request) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    const validation = await validateRequestBody(request, schema);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    try {
      return await handler(validation.data, request);
    } catch (error) {
      logger.error("API handler error", error as Error, {
        url: request.url,
        method: request.method,
      });
      
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };
}