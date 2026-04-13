import { promises as dns } from 'dns'
import disposableDomains from '@/data/disposable-domains.json'
import freeProviders from '@/data/free-providers.json'
import roleAddresses from '@/data/role-addresses.json'

// Load data into Sets for O(1) lookups
const disposableSet = new Set(disposableDomains.map(d => d.toLowerCase()))
const freeProviderSet = new Set(freeProviders.map(d => d.toLowerCase()))
const roleAddressSet = new Set(roleAddresses.map(r => r.toLowerCase()))

// Common email provider domains for typo suggestions
const COMMON_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'aol.com', 'icloud.com', 'protonmail.com'
]

export interface EmailOptions {
  check_mx?: boolean
  check_disposable?: boolean
  check_role?: boolean
  check_free?: boolean
}

export interface CheckResult {
  pass: boolean | null
  detail: string
}

export interface EmailResult {
  email: string
  valid: boolean
  score: number
  checks: {
    format: CheckResult
    mx_record: CheckResult
    disposable: CheckResult
    role_based: CheckResult
    free_provider: CheckResult
  }
  domain: {
    name: string
    has_mx: boolean
    mx_records: string[]
    is_disposable: boolean
    is_free_provider: boolean
  }
  suggestion: string | null
}

// RFC 5322 compliant email regex (practical version)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

// Check email format
function checkFormat(email: string): CheckResult {
  if (!email || typeof email !== 'string') {
    return { pass: false, detail: 'Email is required and must be a string' }
  }

  if (email.length > 254) {
    return { pass: false, detail: 'Email exceeds maximum length (254 characters)' }
  }

  if (!EMAIL_REGEX.test(email)) {
    return { pass: false, detail: 'Invalid email format' }
  }

  // Check for consecutive dots
  if (email.includes('..')) {
    return { pass: false, detail: 'Email cannot contain consecutive dots' }
  }

  // Check local part length (before @)
  const localPart = email.split('@')[0]
  if (localPart.length > 64) {
    return { pass: false, detail: 'Local part exceeds maximum length (64 characters)' }
  }

  return { pass: true, detail: 'Valid email format' }
}

// Check MX records for domain
async function checkMx(domain: string): Promise<CheckResult> {
  try {
    // Set timeout for DNS lookup
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DNS lookup timeout')), 5000)
    )

    const mxRecords = await Promise.race([
      dns.resolveMx(domain.toLowerCase()),
      timeoutPromise
    ])

    if (mxRecords && mxRecords.length > 0) {
      const primaryMx = mxRecords.sort((a, b) => a.priority - b.priority)[0]
      return {
        pass: true,
        detail: `MX record found: ${primaryMx.exchange}`
      }
    }

    return {
      pass: false,
      detail: 'No MX records found'
    }
  } catch (error: any) {
    if (error.message === 'DNS lookup timeout') {
      return {
        pass: null,
        detail: 'MX lookup timed out - unable to verify'
      }
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      return {
        pass: false,
        detail: 'Domain does not exist or has no MX records'
      }
    }

    return {
      pass: null,
      detail: `MX lookup failed: ${error.message}`
    }
  }
}

// Check if domain is disposable
function checkDisposable(domain: string): CheckResult {
  const isDisposable = disposableSet.has(domain.toLowerCase())

  return {
    pass: !isDisposable,
    detail: isDisposable
      ? 'Disposable email domain detected'
      : 'Not a disposable domain'
  }
}

// Check if email is role-based
function checkRoleBased(email: string): CheckResult {
  const localPart = email.split('@')[0].toLowerCase()

  // Remove common suffixes and separators
  const cleanLocal = localPart.replace(/[._+-]/g, '')

  const isRole = roleAddressSet.has(localPart) || roleAddressSet.has(cleanLocal)

  return {
    pass: !isRole,
    detail: isRole
      ? 'Role-based email address detected'
      : 'Not a role-based address'
  }
}

// Check if domain is a free provider
function checkFreeProvider(domain: string): CheckResult {
  const isFree = freeProviderSet.has(domain.toLowerCase())

  return {
    pass: !isFree,
    detail: isFree
      ? 'Free email provider detected'
      : 'Not a free provider'
  }
}

// Suggest correction for typos in domain
function suggestTypo(domain: string): string | null {
  const domainLower = domain.toLowerCase()

  for (const provider of COMMON_PROVIDERS) {
    if (levenshteinDistance(domainLower, provider) <= 2 && domainLower !== provider) {
      return provider
    }
  }

  return null
}

// Simple Levenshtein distance implementation
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null))

  for (let i = 0; i <= a.length; i += 1) {
    matrix[0][i] = i
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[j][0] = j
  }

  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      )
    }
  }

  return matrix[b.length][a.length]
}

// Calculate overall email score
function calculateScore(checks: EmailResult['checks']): number {
  // Start at 1.0
  let score = 1.0

  // Format invalid = instant fail
  if (checks.format.pass === false) {
    return 0.0
  }

  // No MX record = subtract 0.4
  if (checks.mx_record.pass === false) {
    score -= 0.4
  }

  // Disposable domain = subtract 0.3
  if (checks.disposable.pass === false) {
    score -= 0.3
  }

  // Role-based = subtract 0.1
  if (checks.role_based.pass === false) {
    score -= 0.1
  }

  // Free provider = subtract 0.05 (not inherently bad)
  if (checks.free_provider.pass === false) {
    score -= 0.05
  }

  return Math.max(0, Math.min(1, score))
}

// Main email validation function
export async function validateEmail(
  email: string,
  options: EmailOptions = {}
): Promise<EmailResult> {
  const {
    check_mx = true,
    check_disposable = true,
    check_role = true,
    check_free = true,
  } = options

  // Extract domain from email
  const domain = email.includes('@') ? email.split('@')[1] : ''

  // Initialize result
  const result: EmailResult = {
    email,
    valid: false,
    score: 0,
    checks: {
      format: { pass: false, detail: '' },
      mx_record: { pass: true, detail: 'Check skipped' },
      disposable: { pass: true, detail: 'Check skipped' },
      role_based: { pass: true, detail: 'Check skipped' },
      free_provider: { pass: true, detail: 'Check skipped' },
    },
    domain: {
      name: domain,
      has_mx: false,
      mx_records: [],
      is_disposable: false,
      is_free_provider: false,
    },
    suggestion: null,
  }

  // Check format first
  result.checks.format = checkFormat(email)
  if (!result.checks.format.pass) {
    result.valid = false
    result.score = 0
    return result
  }

  // Perform optional checks
  if (check_mx && domain) {
    result.checks.mx_record = await checkMx(domain)
    result.domain.has_mx = result.checks.mx_record.pass === true

    // Extract MX records if successful
    if (result.checks.mx_record.pass) {
      try {
        const mxRecords = await dns.resolveMx(domain)
        result.domain.mx_records = mxRecords
          .sort((a, b) => a.priority - b.priority)
          .map(mx => mx.exchange)
      } catch (error) {
        // Ignore errors in extracting MX records for display
      }
    }
  }

  if (check_disposable && domain) {
    result.checks.disposable = checkDisposable(domain)
    result.domain.is_disposable = result.checks.disposable.pass === false
  }

  if (check_role) {
    result.checks.role_based = checkRoleBased(email)
  }

  if (check_free && domain) {
    result.checks.free_provider = checkFreeProvider(domain)
    result.domain.is_free_provider = result.checks.free_provider.pass === false
  }

  // Calculate score
  result.score = calculateScore(result.checks)
  result.valid = result.score > 0

  // Check for typo suggestions
  if (domain && !result.domain.is_free_provider && !result.domain.is_disposable) {
    const suggestion = suggestTypo(domain)
    if (suggestion) {
      result.suggestion = email.replace(domain, suggestion)
    }
  }

  return result
}