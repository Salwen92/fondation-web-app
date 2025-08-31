/**
 * Validation middleware for API routes
 * Provides request validation and error handling
 */

import { type NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { formatValidationError } from "@/lib/api-validation";
import { logger } from "@/lib/logger";

/**
 * Higher-order function to create validated API route handlers
 * Automatically validates request body against provided schema
 */
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (req: NextRequest, validatedData: T) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Parse request body
      let body: unknown;
      try {
        body = await req.json();
      } catch (error) {
        logger.error("Failed to parse request body", error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
          { error: "Invalid JSON in request body" },
          { status: 400 }
        );
      }

      // Validate against schema
      const result = schema.safeParse(body);
      
      if (!result.success) {
        const errorMessage = formatValidationError(result.error);
        logger.warn("Request validation failed", {
          errors: result.error.errors,
          path: req.url,
        });
        
        return NextResponse.json(
          { 
            error: "Validation failed",
            details: errorMessage,
            errors: result.error.errors
          },
          { status: 400 }
        );
      }

      // Call the handler with validated data
      return await handler(req, result.data);
      
    } catch (error) {
      logger.error("Unexpected error in validated route", error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { 
          error: "Internal server error",
          details: process.env.NODE_ENV === "development" 
            ? (error instanceof Error ? error.message : String(error))
            : undefined
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware to validate URL parameters
 */
export function withParamValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (req: NextRequest, params: T) => Promise<NextResponse>
) {
  return async (
    req: NextRequest,
    context: { params: unknown }
  ): Promise<NextResponse> => {
    try {
      // Validate params
      const result = schema.safeParse(context.params);
      
      if (!result.success) {
        const errorMessage = formatValidationError(result.error);
        logger.warn("Parameter validation failed", {
          errors: result.error.errors,
          path: req.url,
        });
        
        return NextResponse.json(
          { 
            error: "Invalid parameters",
            details: errorMessage,
            errors: result.error.errors
          },
          { status: 400 }
        );
      }

      // Call the handler with validated params
      return await handler(req, result.data);
      
    } catch (error) {
      logger.error("Unexpected error in param validation", error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { 
          error: "Internal server error",
          details: process.env.NODE_ENV === "development" 
            ? (error instanceof Error ? error.message : String(error))
            : undefined
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Combined validation for both body and params
 */
export function withFullValidation<TBody, TParams>(
  bodySchema: z.ZodSchema<TBody>,
  paramsSchema: z.ZodSchema<TParams>,
  handler: (req: NextRequest, body: TBody, params: TParams) => Promise<NextResponse>
) {
  return async (
    req: NextRequest,
    context: { params: unknown }
  ): Promise<NextResponse> => {
    try {
      // Parse and validate body
      let body: unknown;
      try {
        body = await req.json();
      } catch (error) {
        logger.error("Failed to parse request body", error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
          { error: "Invalid JSON in request body" },
          { status: 400 }
        );
      }

      const bodyResult = bodySchema.safeParse(body);
      if (!bodyResult.success) {
        const errorMessage = formatValidationError(bodyResult.error);
        logger.warn("Body validation failed", {
          errors: bodyResult.error.errors,
          path: req.url,
        });
        
        return NextResponse.json(
          { 
            error: "Body validation failed",
            details: errorMessage,
            errors: bodyResult.error.errors
          },
          { status: 400 }
        );
      }

      // Validate params
      const paramsResult = paramsSchema.safeParse(context.params);
      if (!paramsResult.success) {
        const errorMessage = formatValidationError(paramsResult.error);
        logger.warn("Parameter validation failed", {
          errors: paramsResult.error.errors,
          path: req.url,
        });
        
        return NextResponse.json(
          { 
            error: "Parameter validation failed",
            details: errorMessage,
            errors: paramsResult.error.errors
          },
          { status: 400 }
        );
      }

      // Call the handler with validated data
      return await handler(req, bodyResult.data, paramsResult.data);
      
    } catch (error) {
      logger.error("Unexpected error in full validation", error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { 
          error: "Internal server error",
          details: process.env.NODE_ENV === "development" 
            ? (error instanceof Error ? error.message : String(error))
            : undefined
        },
        { status: 500 }
      );
    }
  };
}