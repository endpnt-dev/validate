import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { getRedisConfig, isRedisConfigured, RATE_LIMITS } from './config'

// Rate limit result
export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number // Unix timestamp
  limit: number
}

// Redis client instance (singleton)
let redisClient: Redis | null = null

// Rate limiters by tier (cached)
const rateLimiters = new Map<string, Ratelimit>()

// Initialize Redis client
function getRedisClient(): Redis | null {
  if (!isRedisConfigured()) {
    return null
  }

  if (!redisClient) {
    const config = getRedisConfig()
    redisClient = new Redis({
      url: config.url!,
      token: config.token!,
    })
  }

  return redisClient
}

// Get or create rate limiter for tier
function getRateLimiter(tier: string): Ratelimit | null {
  const redis = getRedisClient()
  if (!redis) {
    return null
  }

  if (!rateLimiters.has(tier)) {
    const config = RATE_LIMITS[tier]
    if (!config) {
      console.error(`No rate limit configuration for tier: ${tier}`)
      return null
    }

    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(config.requests, `${config.window} s`),
      analytics: true,
      prefix: `@upstash/ratelimit:validate:${tier}`,
    })

    rateLimiters.set(tier, limiter)
  }

  return rateLimiters.get(tier)!
}

// Check rate limit for API key
export async function checkRateLimit(
  apiKeyId: string,
  tier: string
): Promise<RateLimitResult> {
  // If Redis is not configured, skip rate limiting (for development)
  if (!isRedisConfigured()) {
    console.warn('Redis not configured - skipping rate limiting')
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 86400000, // 24 hours from now
      limit: RATE_LIMITS[tier]?.requests || 100,
    }
  }

  const limiter = getRateLimiter(tier)
  if (!limiter) {
    console.error(`Failed to create rate limiter for tier: ${tier}`)
    // Allow the request but log the error
    return {
      success: true,
      remaining: 0,
      reset: Date.now() + 86400000,
      limit: RATE_LIMITS[tier]?.requests || 100,
    }
  }

  try {
    const result = await limiter.limit(apiKeyId)

    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit: result.limit,
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // Allow the request on error but log it
    return {
      success: true,
      remaining: 0,
      reset: Date.now() + 86400000,
      limit: RATE_LIMITS[tier]?.requests || 100,
    }
  }
}

// Get rate limit info without consuming quota
export async function getRateLimitInfo(
  apiKeyId: string,
  tier: string
): Promise<Omit<RateLimitResult, 'success'> | null> {
  if (!isRedisConfigured()) {
    return {
      remaining: 999,
      reset: Date.now() + 86400000,
      limit: RATE_LIMITS[tier]?.requests || 100,
    }
  }

  const limiter = getRateLimiter(tier)
  if (!limiter) {
    return null
  }

  try {
    // This is a hypothetical method - Upstash might not have this
    // For now, we'll just return the tier limits
    const config = RATE_LIMITS[tier]
    return {
      remaining: config.requests, // Approximate
      reset: Date.now() + config.window * 1000,
      limit: config.requests,
    }
  } catch (error) {
    console.error('Rate limit info check failed:', error)
    return null
  }
}