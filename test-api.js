#!/usr/bin/env node

/**
 * Smoke tests for the endpnt Validation API
 * Run with: node test-api.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
// NOTE: API key rotated 2026-04-24 per C-008. Retrieve from Vercel env.
const API_KEY = process.env.API_KEY
if (!API_KEY) {
  console.error('API_KEY env var not set. Run: API_KEY=<your-key> node test-api.js')
  process.exit(1)
}

// Test cases from the spec
const tests = [
  {
    id: 1,
    name: 'Health check',
    method: 'GET',
    url: '/api/v1/health',
    auth: false,
    expected: { status: 200, hasData: true }
  },
  {
    id: 2,
    name: 'Valid email',
    method: 'POST',
    url: '/api/v1/validate/email',
    auth: true,
    body: { email: 'test@gmail.com' },
    expected: { status: 200, valid: true, scoreMin: 0.8 }
  },
  {
    id: 3,
    name: 'Invalid email format',
    method: 'POST',
    url: '/api/v1/validate/email',
    auth: true,
    body: { email: 'not-an-email' },
    expected: { status: 200, valid: false, score: 0.0 }
  },
  {
    id: 4,
    name: 'Disposable email',
    method: 'POST',
    url: '/api/v1/validate/email',
    auth: true,
    body: { email: 'test@tempmail.com' },
    expected: { status: 200, checkDisposable: true }
  },
  {
    id: 5,
    name: 'Role-based email',
    method: 'POST',
    url: '/api/v1/validate/email',
    auth: true,
    body: { email: 'info@company.com' },
    expected: { status: 200, checkRole: true }
  },
  {
    id: 7,
    name: 'Valid US phone',
    method: 'POST',
    url: '/api/v1/validate/phone',
    auth: true,
    body: { phone: '+14155551234' },
    expected: { status: 200, valid: true, type: 'mobile' }
  },
  {
    id: 8,
    name: 'Invalid phone',
    method: 'POST',
    url: '/api/v1/validate/phone',
    auth: true,
    body: { phone: '123' },
    expected: { status: 200, valid: false }
  },
  {
    id: 9,
    name: 'Phone without country code',
    method: 'POST',
    url: '/api/v1/validate/phone',
    auth: true,
    body: { phone: '4155551234', country: 'US' },
    expected: { status: 200, valid: true }
  },
  {
    id: 10,
    name: 'Valid domain',
    method: 'POST',
    url: '/api/v1/validate/domain',
    auth: true,
    body: { domain: 'google.com' },
    expected: { status: 200, valid: true }
  },
  {
    id: 11,
    name: 'Invalid domain',
    method: 'POST',
    url: '/api/v1/validate/domain',
    auth: true,
    body: { domain: 'thisdoesnotexist12345.com' },
    expected: { status: 200, valid: false }
  },
  {
    id: 12,
    name: 'Batch validation',
    method: 'POST',
    url: '/api/v1/validate/batch',
    auth: true,
    body: {
      items: [
        { type: 'email', value: 'test@example.com' },
        { type: 'phone', value: '+14155551234' },
        { type: 'domain', value: 'example.com' }
      ]
    },
    expected: { status: 200, batchCount: 3 }
  },
  {
    id: 13,
    name: 'Batch too large',
    method: 'POST',
    url: '/api/v1/validate/batch',
    auth: true,
    body: {
      items: Array(51).fill({ type: 'email', value: 'test@example.com' })
    },
    expected: { status: 400 }
  },
  {
    id: 14,
    name: 'Missing API key',
    method: 'POST',
    url: '/api/v1/validate/email',
    auth: false,
    body: { email: 'test@example.com' },
    expected: { status: 401 }
  },
  {
    id: 16,
    name: 'Typo suggestion',
    method: 'POST',
    url: '/api/v1/validate/email',
    auth: true,
    body: { email: 'user@gmial.com' },
    expected: { status: 200, hasSuggestion: true }
  }
]

async function makeRequest(test) {
  const url = `${BASE_URL}${test.url}`

  const options = {
    method: test.method,
    headers: {
      'Content-Type': 'application/json',
    }
  }

  if (test.auth) {
    options.headers['x-api-key'] = API_KEY
  }

  if (test.body) {
    options.body = JSON.stringify(test.body)
  }

  try {
    const response = await fetch(url, options)
    const data = await response.json()

    return {
      status: response.status,
      data: data,
      success: true
    }
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      success: false
    }
  }
}

function validateResult(test, result) {
  const issues = []

  // Check status code
  if (result.status !== test.expected.status) {
    issues.push(`Expected status ${test.expected.status}, got ${result.status}`)
  }

  if (!result.success) {
    issues.push(`Request failed: ${result.error}`)
    return issues
  }

  const data = result.data

  // Common checks
  if (test.expected.hasData && !data.data) {
    issues.push('Expected data field to be present')
  }

  if (test.expected.valid !== undefined) {
    if (data.data?.valid !== test.expected.valid) {
      issues.push(`Expected valid=${test.expected.valid}, got ${data.data?.valid}`)
    }
  }

  if (test.expected.score !== undefined) {
    if (data.data?.score !== test.expected.score) {
      issues.push(`Expected score=${test.expected.score}, got ${data.data?.score}`)
    }
  }

  if (test.expected.scoreMin !== undefined) {
    if (!data.data?.score || data.data.score < test.expected.scoreMin) {
      issues.push(`Expected score >= ${test.expected.scoreMin}, got ${data.data?.score}`)
    }
  }

  if (test.expected.checkDisposable && !data.data?.domain?.is_disposable) {
    issues.push('Expected disposable domain to be detected')
  }

  if (test.expected.checkRole && !data.data?.checks?.role_based?.pass === false) {
    issues.push('Expected role-based address to be detected')
  }

  if (test.expected.batchCount && data.data?.results?.length !== test.expected.batchCount) {
    issues.push(`Expected ${test.expected.batchCount} batch results, got ${data.data?.results?.length}`)
  }

  if (test.expected.hasSuggestion && !data.data?.suggestion) {
    issues.push('Expected typo suggestion to be provided')
  }

  return issues
}

async function runTests() {
  console.log('🚀 Starting endpnt Validation API Smoke Tests')
  console.log(`📍 Testing against: ${BASE_URL}`)
  console.log(`🔑 Using API key: ${API_KEY.slice(0, 8)}...`)
  console.log('─'.repeat(60))

  let passed = 0
  let failed = 0

  for (const test of tests) {
    process.stdout.write(`Test ${test.id}: ${test.name}... `)

    try {
      const result = await makeRequest(test)
      const issues = validateResult(test, result)

      if (issues.length === 0) {
        console.log('✅ PASS')
        passed++
      } else {
        console.log('❌ FAIL')
        issues.forEach(issue => {
          console.log(`   └─ ${issue}`)
        })
        if (result.data) {
          console.log(`   └─ Response: ${JSON.stringify(result.data, null, 2).substring(0, 200)}...`)
        }
        failed++
      }
    } catch (error) {
      console.log('❌ ERROR')
      console.log(`   └─ ${error.message}`)
      failed++
    }
  }

  console.log('─'.repeat(60))
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    console.log('❌ Some tests failed. Check the API implementation.')
    process.exit(1)
  } else {
    console.log('✅ All tests passed!')
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/health`)
    if (response.ok) {
      console.log('✅ Server is running')
      return true
    }
  } catch (error) {
    console.log('❌ Server is not running or not accessible')
    console.log('   Start the dev server with: npm run dev')
    return false
  }
}

// Main execution
async function main() {
  console.log('Checking if server is running...')
  const serverRunning = await checkServer()

  if (!serverRunning) {
    console.log('\n💡 To run these tests:')
    console.log('1. Start the development server: npm run dev')
    console.log('2. Run this test script: node test-api.js')
    process.exit(1)
  }

  console.log('')
  await runTests()
}

if (require.main === module) {
  main().catch(console.error)
}