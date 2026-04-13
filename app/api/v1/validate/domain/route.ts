import { NextRequest } from 'next/server'
import { createApiHandler, parseJsonBody, validateRequiredFields, handleCors } from '@/lib/api-handler'
import { validateDomain, type DomainOptions } from '@/lib/validators/domain'
import { successResponse, validationError } from '@/lib/response'

// Force Node.js runtime for DNS and TLS operations
export const runtime = 'nodejs'

const domainHandler = createApiHandler(async (request: NextRequest, auth) => {
  // Parse request body
  const bodyResult = await parseJsonBody(request)
  if (!bodyResult.success) {
    return validationError(bodyResult.error)
  }

  const body = bodyResult.data

  // Validate required fields
  const validation = validateRequiredFields(body, ['domain'])
  if (!validation.isValid) {
    return validationError(`Missing required fields: ${validation.missingFields.join(', ')}`)
  }

  // Extract and validate parameters
  const { domain, check_ssl, check_dns } = body

  if (typeof domain !== 'string') {
    return validationError('Domain must be a string')
  }

  if (domain.trim().length === 0) {
    return validationError('Domain cannot be empty')
  }

  // Build options object
  const options: DomainOptions = {}

  if (check_ssl !== undefined) {
    if (typeof check_ssl !== 'boolean') {
      return validationError('check_ssl must be a boolean')
    }
    options.check_ssl = check_ssl
  }

  if (check_dns !== undefined) {
    if (typeof check_dns !== 'boolean') {
      return validationError('check_dns must be a boolean')
    }
    options.check_dns = check_dns
  }

  try {
    // Validate domain
    const result = await validateDomain(domain, options)

    return successResponse(result)
  } catch (error: any) {
    console.error('Domain validation error:', error)
    return validationError(`Validation failed: ${error.message}`)
  }
})

export async function POST(request: NextRequest) {
  return domainHandler(request)
}

export async function OPTIONS() {
  return handleCors()
}