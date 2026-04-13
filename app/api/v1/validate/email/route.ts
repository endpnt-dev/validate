import { NextRequest } from 'next/server'
import { createApiHandler, parseJsonBody, validateRequiredFields, handleCors } from '@/lib/api-handler'
import { validateEmail, type EmailOptions } from '@/lib/validators/email'
import { successResponse, validationError } from '@/lib/response'

// Force Node.js runtime for DNS lookups
export const runtime = 'nodejs'

const emailHandler = createApiHandler(async (request: NextRequest, auth) => {
  // Parse request body
  const bodyResult = await parseJsonBody(request)
  if (!bodyResult.success) {
    return validationError(bodyResult.error)
  }

  const body = bodyResult.data

  // Validate required fields
  const validation = validateRequiredFields(body, ['email'])
  if (!validation.isValid) {
    return validationError(`Missing required fields: ${validation.missingFields.join(', ')}`)
  }

  // Extract and validate parameters
  const { email, check_mx, check_disposable, check_role, check_free } = body

  if (typeof email !== 'string') {
    return validationError('Email must be a string')
  }

  // Build options object
  const options: EmailOptions = {}

  if (check_mx !== undefined) {
    if (typeof check_mx !== 'boolean') {
      return validationError('check_mx must be a boolean')
    }
    options.check_mx = check_mx
  }

  if (check_disposable !== undefined) {
    if (typeof check_disposable !== 'boolean') {
      return validationError('check_disposable must be a boolean')
    }
    options.check_disposable = check_disposable
  }

  if (check_role !== undefined) {
    if (typeof check_role !== 'boolean') {
      return validationError('check_role must be a boolean')
    }
    options.check_role = check_role
  }

  if (check_free !== undefined) {
    if (typeof check_free !== 'boolean') {
      return validationError('check_free must be a boolean')
    }
    options.check_free = check_free
  }

  try {
    // Validate email
    const result = await validateEmail(email, options)

    return successResponse(result)
  } catch (error: any) {
    console.error('Email validation error:', error)
    return validationError(`Validation failed: ${error.message}`)
  }
})

export async function POST(request: NextRequest) {
  return emailHandler(request)
}

export async function OPTIONS() {
  return handleCors()
}