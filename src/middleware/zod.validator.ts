import { Context } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

interface ValidationError {
  success: boolean
  error: string
  details: Record<string, string[]>
}

/**
 * Handles validation errors from Zod schema validation
 */
const handleValidationError = (
  result: { success: true; data: any } | { success: false; error: z.ZodError }, 
  c: Context
): Response | undefined => {
  if (!result.success) {
    const errorResponse: ValidationError = {
      success: false,
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors as Record<string, string[]>
    }
    return c.json(errorResponse, 400)
  }
  // Return undefined when validation succeeds
  return undefined
}

/**
 * Creates a Zod validator middleware with proper type checking
 */
export const zodValidator = <T>(
  type: 'json' | 'form' | 'query' | 'param' | 'header' | 'cookie',
  schema: z.ZodSchema<T>
) => {
  return zValidator(type, schema, handleValidationError)
}