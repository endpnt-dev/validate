// Configuration constants and types

export interface ApiKeyInfo {
  tier: 'free' | 'starter' | 'pro' | 'enterprise'
  name: string
}

export interface RateLimitConfig {
  requests: number
  window: number // in seconds
}

// Rate limit configurations by tier
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: { requests: 100, window: 86400 }, // 100 per day
  starter: { requests: 5000, window: 86400 }, // 5k per day (matches platform starter tier)
  pro: { requests: 10000, window: 86400 }, // 10k per day
  enterprise: { requests: 100000, window: 86400 }, // 100k per day
}

export const DEMO_RATE_LIMIT = {
  requests_per_window: 20,
  window_minutes: 10,
} as const

// API configuration
export const API_CONFIG = {
  MAX_BATCH_SIZE: 50,
  DNS_TIMEOUT_MS: 5000,
  SSL_TIMEOUT_MS: 5000,
  DEFAULT_COUNTRY_CODE: 'US',
} as const

// Parse API keys from environment
export function getApiKeys(): Record<string, ApiKeyInfo> {
  const apiKeysEnv = process.env.API_KEYS
  if (!apiKeysEnv) {
    console.warn('API_KEYS environment variable not set')
    return {}
  }

  try {
    return JSON.parse(apiKeysEnv)
  } catch (error) {
    console.error('Failed to parse API_KEYS:', error)
    return {}
  }
}

// Get Redis configuration
export function getRedisConfig() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  }
}

// Check if Redis is configured
export function isRedisConfigured(): boolean {
  const config = getRedisConfig()
  return !!(config.url && config.token)
}