import { NextRequest } from 'next/server'
import { createApiHandler, parseJsonBody, validateRequiredFields, handleCors } from '@/lib/api-handler'
import { validatePhone } from '@/lib/validators/phone'
import { successResponse, validationError } from '@/lib/response'
import { API_CONFIG } from '@/lib/config'

// Keep Node.js runtime for consistency
export const runtime = 'nodejs'

const phoneHandler = createApiHandler(async (request: NextRequest, auth) => {
  // Parse request body
  const bodyResult = await parseJsonBody(request)
  if (!bodyResult.success) {
    return validationError(bodyResult.error)
  }

  const body = bodyResult.data

  // Validate required fields
  const validation = validateRequiredFields(body, ['phone'])
  if (!validation.isValid) {
    return validationError(`Missing required fields: ${validation.missingFields.join(', ')}`)
  }

  // Extract and validate parameters
  const { phone, country } = body

  if (typeof phone !== 'string') {
    return validationError('Phone must be a string')
  }

  if (phone.trim().length === 0) {
    return validationError('Phone cannot be empty')
  }

  let countryCode = API_CONFIG.DEFAULT_COUNTRY_CODE

  if (country !== undefined) {
    if (typeof country !== 'string') {
      return validationError('Country must be a string')
    }

    if (country.length !== 2) {
      return validationError('Country must be a 2-letter ISO country code (e.g., "US", "GB")')
    }

    countryCode = country.toUpperCase()
  }

  try {
    // Validate phone number
    const result = validatePhone(phone, countryCode)

    return successResponse(result)
  } catch (error: any) {
    console.error('Phone validation error:', error)
    return validationError(`Validation failed: ${error.message}`)
  }
})

export async function POST(request: NextRequest) {
  return phoneHandler(request)
}

export async function OPTIONS() {
  return handleCors()
}