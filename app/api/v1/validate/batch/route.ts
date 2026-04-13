import { NextRequest } from 'next/server'
import { createApiHandler, parseJsonBody, validateRequiredFields, handleCors } from '@/lib/api-handler'
import { validateEmail, type EmailOptions } from '@/lib/validators/email'
import { validatePhone } from '@/lib/validators/phone'
import { validateDomain, type DomainOptions } from '@/lib/validators/domain'
import { successResponse, validationError, errorResponse, ERROR_CODES } from '@/lib/response'
import { API_CONFIG } from '@/lib/config'

// Force Node.js runtime for DNS and TLS operations
export const runtime = 'nodejs'

interface BatchItem {
  type: 'email' | 'phone' | 'domain'
  value: string
  // Optional parameters for each type
  check_mx?: boolean
  check_disposable?: boolean
  check_role?: boolean
  check_free?: boolean
  country?: string
  check_ssl?: boolean
  check_dns?: boolean
}

interface BatchResult {
  index: number
  type: string
  success: boolean
  data?: any
  error?: {
    code: string
    message: string
  }
}

// Validate individual batch item
function validateBatchItem(item: any, index: number): { valid: true; item: BatchItem } | { valid: false; error: string } {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: `Item ${index}: must be an object` }
  }

  const { type, value } = item

  if (!type || !['email', 'phone', 'domain'].includes(type)) {
    return { valid: false, error: `Item ${index}: type must be 'email', 'phone', or 'domain'` }
  }

  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return { valid: false, error: `Item ${index}: value must be a non-empty string` }
  }

  // Validate type-specific options
  if (type === 'email') {
    const { check_mx, check_disposable, check_role, check_free } = item

    if (check_mx !== undefined && typeof check_mx !== 'boolean') {
      return { valid: false, error: `Item ${index}: check_mx must be a boolean` }
    }
    if (check_disposable !== undefined && typeof check_disposable !== 'boolean') {
      return { valid: false, error: `Item ${index}: check_disposable must be a boolean` }
    }
    if (check_role !== undefined && typeof check_role !== 'boolean') {
      return { valid: false, error: `Item ${index}: check_role must be a boolean` }
    }
    if (check_free !== undefined && typeof check_free !== 'boolean') {
      return { valid: false, error: `Item ${index}: check_free must be a boolean` }
    }
  }

  if (type === 'phone') {
    const { country } = item

    if (country !== undefined) {
      if (typeof country !== 'string' || country.length !== 2) {
        return { valid: false, error: `Item ${index}: country must be a 2-letter ISO country code` }
      }
    }
  }

  if (type === 'domain') {
    const { check_ssl, check_dns } = item

    if (check_ssl !== undefined && typeof check_ssl !== 'boolean') {
      return { valid: false, error: `Item ${index}: check_ssl must be a boolean` }
    }
    if (check_dns !== undefined && typeof check_dns !== 'boolean') {
      return { valid: false, error: `Item ${index}: check_dns must be a boolean` }
    }
  }

  return { valid: true, item: item as BatchItem }
}

// Process individual validation
async function processValidation(item: BatchItem, index: number): Promise<BatchResult> {
  try {
    switch (item.type) {
      case 'email': {
        const options: EmailOptions = {
          check_mx: item.check_mx,
          check_disposable: item.check_disposable,
          check_role: item.check_role,
          check_free: item.check_free,
        }
        const result = await validateEmail(item.value, options)
        return {
          index,
          type: item.type,
          success: true,
          data: result,
        }
      }

      case 'phone': {
        const country = item.country || API_CONFIG.DEFAULT_COUNTRY_CODE
        const result = validatePhone(item.value, country)
        return {
          index,
          type: item.type,
          success: true,
          data: result,
        }
      }

      case 'domain': {
        const options: DomainOptions = {
          check_ssl: item.check_ssl,
          check_dns: item.check_dns,
        }
        const result = await validateDomain(item.value, options)
        return {
          index,
          type: item.type,
          success: true,
          data: result,
        }
      }

      default:
        return {
          index,
          type: item.type,
          success: false,
          error: {
            code: ERROR_CODES.INVALID_PARAMS,
            message: `Unsupported validation type: ${item.type}`,
          },
        }
    }
  } catch (error: any) {
    return {
      index,
      type: item.type,
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: `Validation failed: ${error.message}`,
      },
    }
  }
}

// Concurrency limiter to avoid overwhelming DNS/SSL services
async function processBatchWithConcurrency<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number = 10
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let index = 0

  // Process items in batches
  while (index < items.length) {
    const batch = items.slice(index, index + concurrency)
    const batchPromises = batch.map((item, batchIndex) =>
      processor(item, index + batchIndex)
    )

    const batchResults = await Promise.allSettled(batchPromises)

    batchResults.forEach((result, batchIndex) => {
      const resultIndex = index + batchIndex
      if (result.status === 'fulfilled') {
        results[resultIndex] = result.value
      } else {
        // Handle rejected promise
        results[resultIndex] = {
          index: resultIndex,
          type: 'unknown',
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: `Processing failed: ${result.reason?.message || 'Unknown error'}`,
          },
        } as R
      }
    })

    index += concurrency
  }

  return results
}

const batchHandler = createApiHandler(async (request: NextRequest, auth) => {
  // Parse request body
  const bodyResult = await parseJsonBody(request)
  if (!bodyResult.success) {
    return validationError(bodyResult.error)
  }

  const body = bodyResult.data

  // Validate required fields
  const validation = validateRequiredFields(body, ['items'])
  if (!validation.isValid) {
    return validationError(`Missing required fields: ${validation.missingFields.join(', ')}`)
  }

  const { items } = body

  // Validate items is an array
  if (!Array.isArray(items)) {
    return validationError('Items must be an array')
  }

  // Check batch size limit
  if (items.length === 0) {
    return validationError('Items array cannot be empty')
  }

  if (items.length > API_CONFIG.MAX_BATCH_SIZE) {
    return errorResponse(
      ERROR_CODES.BATCH_TOO_LARGE,
      `Batch size exceeds maximum of ${API_CONFIG.MAX_BATCH_SIZE} items`
    )
  }

  // Validate each item
  const validatedItems: BatchItem[] = []
  for (let i = 0; i < items.length; i++) {
    const itemValidation = validateBatchItem(items[i], i)
    if (!itemValidation.valid) {
      return validationError(itemValidation.error)
    }
    validatedItems.push(itemValidation.item)
  }

  try {
    // Process all validations with concurrency limiting
    const results = await processBatchWithConcurrency(
      validatedItems,
      processValidation,
      10 // Process 10 items concurrently
    )

    return successResponse({
      total: items.length,
      results,
    })
  } catch (error: any) {
    console.error('Batch validation error:', error)
    return validationError(`Batch validation failed: ${error.message}`)
  }
})

export async function POST(request: NextRequest) {
  return batchHandler(request)
}

export async function OPTIONS() {
  return handleCors()
}