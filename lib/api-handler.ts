import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, getApiKeyId, type AuthResult } from './auth'
import { checkRateLimit } from './rate-limit'
import { rateLimitExceeded, internalError } from './response'

// Handler function type
export type ApiHandler = (
  request: NextRequest,
  auth: AuthResult
) => Promise<NextResponse>

// API handler wrapper options
export interface ApiHandlerOptions {
  skipAuth?: boolean
  skipRateLimit?: boolean
}

// Main API handler wrapper
export function createApiHandler(
  handler: ApiHandler,
  options: ApiHandlerOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Authentication
      if (!options.skipAuth) {
        const authResult = authenticateRequest(request)
        if (!authResult.success) {
          return authResult.error
        }

        // Rate limiting
        if (!options.skipRateLimit) {
          const apiKeyId = getApiKeyId(authResult.apiKey)
          const rateLimitResult = await checkRateLimit(
            apiKeyId,
            authResult.keyInfo.tier
          )

          if (!rateLimitResult.success) {
            return rateLimitExceeded(rateLimitResult.reset)
          }

          // Add rate limit headers to successful responses
          const response = await handler(request, authResult)

          // Add rate limit headers
          response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
          response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
          response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString())

          return response
        }

        return await handler(request, authResult)
      }

      // No auth required - create a mock auth result
      const mockAuth: AuthResult = {
        success: true,
        apiKey: 'none',
        keyInfo: { tier: 'free', name: 'No Auth' },
      }

      return await handler(request, mockAuth)
    } catch (error) {
      console.error('API handler error:', error)

      // Return appropriate error response
      if (error instanceof Error) {
        return internalError(error.message)
      }

      return internalError('Unknown error occurred')
    }
  }
}

// Utility to parse JSON body with validation
export async function parseJsonBody<T = any>(
  request: NextRequest
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    return { success: true, data: body }
  } catch (error) {
    return {
      success: false,
      error: 'Invalid JSON in request body',
    }
  }
}

// Utility to validate required fields
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): { isValid: true } | { isValid: false; missingFields: string[] } {
  const missingFields = requiredFields.filter(
    field => data[field] === undefined || data[field] === null || data[field] === ''
  )

  if (missingFields.length > 0) {
    return { isValid: false, missingFields }
  }

  return { isValid: true }
}

// CORS headers for preflight requests
export function handleCors(): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}