import { NextResponse } from 'next/server'

// Standard error codes
export const ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_PARAMS: 'INVALID_PARAMS',
  BATCH_TOO_LARGE: 'BATCH_TOO_LARGE',
  DNS_LOOKUP_FAILED: 'DNS_LOOKUP_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION',
  ORIGIN_NOT_ALLOWED: 'ORIGIN_NOT_ALLOWED',
  DEMO_UNAVAILABLE: 'DEMO_UNAVAILABLE',
} as const

// Error code to HTTP status mapping
const ERROR_STATUS_MAP: Record<string, number> = {
  [ERROR_CODES.AUTH_REQUIRED]: 401,
  [ERROR_CODES.INVALID_API_KEY]: 401,
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
  [ERROR_CODES.INVALID_PARAMS]: 400,
  [ERROR_CODES.BATCH_TOO_LARGE]: 400,
  [ERROR_CODES.DNS_LOOKUP_FAILED]: 500,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
  [ERROR_CODES.UNSUPPORTED_OPERATION]: 405,
  [ERROR_CODES.ORIGIN_NOT_ALLOWED]: 403,
  [ERROR_CODES.DEMO_UNAVAILABLE]: 503,
}

// Success response wrapper
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

// Error response wrapper
export function errorResponse(
  code: string,
  message: string,
  status?: number,
  meta?: {
    request_id?: string
    processing_ms?: number
    remaining_credits?: number
  }
): NextResponse {
  const httpStatus = status || ERROR_STATUS_MAP[code] || 500

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
      ...(meta ? { meta } : {}),
    },
    { status: httpStatus }
  )
}

// Validation error response (400)
export function validationError(message: string): NextResponse {
  return errorResponse(ERROR_CODES.INVALID_PARAMS, message, 400)
}

// Auth error responses
export function authRequired(): NextResponse {
  return errorResponse(
    ERROR_CODES.AUTH_REQUIRED,
    'API key required. Include x-api-key header.'
  )
}

export function invalidApiKey(): NextResponse {
  return errorResponse(
    ERROR_CODES.INVALID_API_KEY,
    'Invalid API key provided.'
  )
}

// Rate limit error
export function rateLimitExceeded(resetTime?: number): NextResponse {
  const message = resetTime
    ? `Rate limit exceeded. Resets at ${new Date(resetTime).toISOString()}`
    : 'Rate limit exceeded. Try again later.'

  return errorResponse(ERROR_CODES.RATE_LIMIT_EXCEEDED, message)
}

// Internal error with optional error details (for development)
export function internalError(details?: string): NextResponse {
  const message = process.env.NODE_ENV === 'development' && details
    ? `Internal server error: ${details}`
    : 'Internal server error'

  return errorResponse(ERROR_CODES.INTERNAL_ERROR, message)
}

export function generateRequestId(): string {
  return `req_${Math.random().toString(36).slice(2, 10)}`
}