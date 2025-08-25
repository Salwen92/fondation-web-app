/**
 * Validation middleware for API routes
 * Provides request validation and error handling
 */

import { type NextRequest, NextResponse } from "next/server";
import { type z } from "zod";
import { validateRequest, formatValidationError } from "@/lib/validation";
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
      const validation = validateRequest(schema, body);
      
      if (!validation.success) {
        const errorMessage = formatValidationError(validation.error);
        logger.warn("Request validation failed", {
          errors: validation.error.errors,
          path: req.url,
        });
        
        return NextResponse.json(
          { 
            error: "Validation failed",
            details: errorMessage,
            errors: validation.error.errors
          },
          { status: 400 }
        );
      }

      // Call the handler with validated data
      return await handler(req, validation.data);
      
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
      const validation = validateRequest(schema, context.params);
      
      if (!validation.success) {
        const errorMessage = formatValidationError(validation.error);
        logger.warn("Parameter validation failed", {
          errors: validation.error.errors,
          path: req.url,
        });
        
        return NextResponse.json(
          { 
            error: "Invalid parameters",
            details: errorMessage,
            errors: validation.error.errors
          },
          { status: 400 }
        );
      }

      // Call the handler with validated params
      return await handler(req, validation.data);
      
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

      const bodyValidation = validateRequest(bodySchema, body);
      if (!bodyValidation.success) {
        const errorMessage = formatValidationError(bodyValidation.error);
        logger.warn("Body validation failed", {
          errors: bodyValidation.error.errors,
          path: req.url,
        });
        
        return NextResponse.json(
          { 
            error: "Body validation failed",
            details: errorMessage,
            errors: bodyValidation.error.errors
          },
          { status: 400 }
        );
      }

      // Validate params
      const paramsValidation = validateRequest(paramsSchema, context.params);
      if (!paramsValidation.success) {
        const errorMessage = formatValidationError(paramsValidation.error);
        logger.warn("Parameter validation failed", {
          errors: paramsValidation.error.errors,
          path: req.url,
        });
        
        return NextResponse.json(
          { 
            error: "Parameter validation failed",
            details: errorMessage,
            errors: paramsValidation.error.errors
          },
          { status: 400 }
        );
      }

      // Call the handler with validated data
      return await handler(req, bodyValidation.data, paramsValidation.data);
      
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