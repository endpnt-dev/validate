import { NextRequest, NextResponse } from 'next/server'
import { getApiKeys, type ApiKeyInfo } from './config'
import { authRequired, invalidApiKey } from './response'

export interface AuthResult {
  success: true
  apiKey: string
  keyInfo: ApiKeyInfo
}

export interface AuthError {
  success: false
  error: NextResponse
}

export type AuthenticationResult = AuthResult | AuthError

// Extract API key from request headers
function extractApiKey(request: NextRequest): string | null {
  // Try x-api-key header (primary)
  const headerKey = request.headers.get('x-api-key')
  if (headerKey) {
    return headerKey
  }

  // Try Authorization header as backup (Bearer token format)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Try query parameter as last resort (for testing)
  const url = new URL(request.url)
  const queryKey = url.searchParams.get('api_key')
  if (queryKey) {
    return queryKey
  }

  return null
}

// Validate API key against configured keys
function validateApiKey(apiKey: string): ApiKeyInfo | null {
  const apiKeys = getApiKeys()
  const keyInfo = apiKeys[apiKey]

  if (!keyInfo) {
    return null
  }

  // Validate tier is valid
  if (!['free', 'pro', 'enterprise'].includes(keyInfo.tier)) {
    console.error(`Invalid tier for API key: ${keyInfo.tier}`)
    return null
  }

  return keyInfo
}

// Main authentication function
export function authenticateRequest(request: NextRequest): AuthenticationResult {
  // Extract API key from request
  const apiKey = extractApiKey(request)
  if (!apiKey) {
    return {
      success: false,
      error: authRequired(),
    }
  }

  // Validate API key
  const keyInfo = validateApiKey(apiKey)
  if (!keyInfo) {
    return {
      success: false,
      error: invalidApiKey(),
    }
  }

  return {
    success: true,
    apiKey,
    keyInfo,
  }
}

// Utility to get API key ID for rate limiting
export function getApiKeyId(apiKey: string): string {
  // Use a hash of the API key for rate limiting
  // In production, you might want to use the actual key ID
  return apiKey.substring(0, 16) // First 16 chars as identifier
}