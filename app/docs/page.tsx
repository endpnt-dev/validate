'use client'

import React, { useState } from 'react'
import Link from 'next/link'

type TabType = 'email' | 'phone' | 'domain' | 'batch'

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('email')
  const [testResults, setTestResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Test form states
  const [emailTest, setEmailTest] = useState({
    email: 'test@example.com',
    check_mx: true,
    check_disposable: true,
    check_role: true,
    check_free: true,
  })

  const [phoneTest, setPhoneTest] = useState({
    phone: '+1 (555) 123-4567',
    country: 'US',
  })

  const [domainTest, setDomainTest] = useState({
    domain: 'example.com',
    check_dns: true,
    check_ssl: true,
  })

  const runTest = async (endpoint: string, payload: any) => {
    setIsLoading(true)
    setTestResults(null)

    try {
      const response = await fetch(`/api/v1/validate/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': '',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      setTestResults(result)
    } catch (error) {
      setTestResults({
        success: false,
        error: { message: 'Test request failed' },
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <h1 className="text-xl font-bold text-blue-400">endpnt</h1>
              <span className="ml-2 text-sm text-gray-400">/validate</span>
            </Link>
            <nav className="flex space-x-8">
              <Link href="/" className="text-gray-300 hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/pricing" className="text-gray-300 hover:text-white transition-colors">
                Pricing
              </Link>
              <a
                href="https://endpnt.dev"
                className="btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get API Key
              </a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
          <p className="text-gray-400 text-lg">
            Complete reference for the endpnt Validation API
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'email', label: 'Email Validation', icon: '📧' },
              { id: 'phone', label: 'Phone Validation', icon: '📱' },
              { id: 'domain', label: 'Domain Validation', icon: '🌐' },
              { id: 'batch', label: 'Batch Validation', icon: '📦' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Documentation Content */}
          <div className="space-y-6">
            {activeTab === 'email' && (
              <>
                <div>
                  <h2 className="text-2xl font-bold mb-4">Email Validation</h2>
                  <p className="text-gray-400 mb-4">
                    Validate email addresses with comprehensive checks including format verification,
                    MX record lookup, and detection of disposable domains.
                  </p>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-3">Endpoint</h3>
                  <div className="code-block">
                    POST https://validate.endpnt.dev/api/v1/validate/email
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-3">Parameters</h3>
                  <div className="space-y-3">
                    <div>
                      <code className="text-blue-400">email</code>
                      <span className="text-red-400 ml-1">*</span>
                      <span className="text-gray-400 ml-2">string</span>
                      <p className="text-sm text-gray-500 mt-1">Email address to validate</p>
                    </div>
                    <div>
                      <code className="text-blue-400">check_mx</code>
                      <span className="text-gray-400 ml-2">boolean (default: true)</span>
                      <p className="text-sm text-gray-500 mt-1">Check if domain has valid MX records</p>
                    </div>
                    <div>
                      <code className="text-blue-400">check_disposable</code>
                      <span className="text-gray-400 ml-2">boolean (default: true)</span>
                      <p className="text-sm text-gray-500 mt-1">Check against disposable email domain list</p>
                    </div>
                    <div>
                      <code className="text-blue-400">check_role</code>
                      <span className="text-gray-400 ml-2">boolean (default: true)</span>
                      <p className="text-sm text-gray-500 mt-1">Flag role-based addresses (admin@, info@, etc.)</p>
                    </div>
                    <div>
                      <code className="text-blue-400">check_free</code>
                      <span className="text-gray-400 ml-2">boolean (default: true)</span>
                      <p className="text-sm text-gray-500 mt-1">Flag free email providers (gmail, yahoo, etc.)</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-3">Score Calculation</h3>
                  <ul className="text-gray-400 space-y-2">
                    <li>• Starts at 1.0 (perfect score)</li>
                    <li>• Invalid format: 0.0 (instant fail)</li>
                    <li>• No MX record: -0.4</li>
                    <li>• Disposable domain: -0.3</li>
                    <li>• Role-based address: -0.1</li>
                    <li>• Free provider: -0.05</li>
                  </ul>
                </div>
              </>
            )}

            {activeTab === 'phone' && (
              <>
                <div>
                  <h2 className="text-2xl font-bold mb-4">Phone Validation</h2>
                  <p className="text-gray-400 mb-4">
                    Validate and format phone numbers using Google's libphonenumber library.
                    Supports international formats and automatic country detection.
                  </p>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-3">Endpoint</h3>
                  <div className="code-block">
                    POST https://validate.endpnt.dev/api/v1/validate/phone
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-3">Parameters</h3>
                  <div className="space-y-3">
                    <div>
                      <code className="text-blue-400">phone</code>
                      <span className="text-red-400 ml-1">*</span>
                      <span className="text-gray-400 ml-2">string</span>
                      <p className="text-sm text-gray-500 mt-1">Phone number (with or without country code)</p>
                    </div>
                    <div>
                      <code className="text-blue-400">country</code>
                      <span className="text-gray-400 ml-2">string (default: "US")</span>
                      <p className="text-sm text-gray-500 mt-1">Default country code if not included in number</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-3">Phone Types</h3>
                  <ul className="text-gray-400 space-y-1">
                    <li>• <strong>Mobile:</strong> 0.95 score - highest confidence</li>
                    <li>• <strong>Landline:</strong> 0.85 score - high confidence</li>
                    <li>• <strong>VoIP:</strong> 0.75 score - good confidence</li>
                    <li>• <strong>Toll-free:</strong> 0.70 score - medium confidence</li>
                    <li>• <strong>Premium:</strong> 0.60 score - lower confidence</li>
                  </ul>
                </div>
              </>
            )}

            {activeTab === 'domain' && (
              <>
                <div>
                  <h2 className="text-2xl font-bold mb-4">Domain Validation</h2>
                  <p className="text-gray-400 mb-4">
                    Validate domains with DNS record checks and SSL certificate verification.
                    Perfect for ensuring domains are properly configured.
                  </p>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-3">Endpoint</h3>
                  <div className="code-block">
                    POST https://validate.endpnt.dev/api/v1/validate/domain
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-3">Parameters</h3>
                  <div className="space-y-3">
                    <div>
                      <code className="text-blue-400">domain</code>
                      <span className="text-red-400 ml-1">*</span>
                      <span className="text-gray-400 ml-2">string</span>
                      <p className="text-sm text-gray-500 mt-1">Domain to validate</p>
                    </div>
                    <div>
                      <code className="text-blue-400">check_dns</code>
                      <span className="text-gray-400 ml-2">boolean (default: true)</span>
                      <p className="text-sm text-gray-500 mt-1">Check DNS resolution</p>
                    </div>
                    <div>
                      <code className="text-blue-400">check_ssl</code>
                      <span className="text-gray-400 ml-2">boolean (default: true)</span>
                      <p className="text-sm text-gray-500 mt-1">Check SSL certificate</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-3">DNS Records Checked</h3>
                  <ul className="text-gray-400 space-y-1">
                    <li>• <strong>A records:</strong> IPv4 addresses</li>
                    <li>• <strong>AAAA records:</strong> IPv6 addresses</li>
                    <li>• <strong>MX records:</strong> Email servers</li>
                    <li>• <strong>TXT records:</strong> Text records (SPF, DMARC)</li>
                    <li>• <strong>NS records:</strong> Name servers</li>
                    <li>• <strong>CNAME records:</strong> Canonical names</li>
                  </ul>
                </div>
              </>
            )}

            {activeTab === 'batch' && (
              <>
                <div>
                  <h2 className="text-2xl font-bold mb-4">Batch Validation</h2>
                  <p className="text-gray-400 mb-4">
                    Validate up to 50 items in a single request. Mix and match email, phone, and domain validations.
                    Results are returned in the same order as the input.
                  </p>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-3">Endpoint</h3>
                  <div className="code-block">
                    POST https://validate.endpnt.dev/api/v1/validate/batch
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-3">Example Request</h3>
                  <div className="code-block">
                    <pre className="text-sm">
{`{
  "items": [
    {
      "type": "email",
      "value": "test@example.com",
      "check_mx": true
    },
    {
      "type": "phone",
      "value": "+1-555-123-4567",
      "country": "US"
    },
    {
      "type": "domain",
      "value": "example.com",
      "check_ssl": true
    }
  ]
}`}
                    </pre>
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-3">Concurrency & Performance</h3>
                  <ul className="text-gray-400 space-y-1">
                    <li>• Maximum 50 items per request</li>
                    <li>• 10 concurrent validations</li>
                    <li>• Results maintain input order</li>
                    <li>• Individual failures don't affect other items</li>
                    <li>• Automatic timeout handling</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* Interactive Tester */}
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Interactive Tester</h3>

              {activeTab === 'email' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email Address</label>
                    <input
                      type="email"
                      value={emailTest.email}
                      onChange={(e) => setEmailTest({ ...emailTest, email: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={emailTest.check_mx}
                        onChange={(e) => setEmailTest({ ...emailTest, check_mx: e.target.checked })}
                        className="mr-2"
                      />
                      Check MX
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={emailTest.check_disposable}
                        onChange={(e) => setEmailTest({ ...emailTest, check_disposable: e.target.checked })}
                        className="mr-2"
                      />
                      Check Disposable
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={emailTest.check_role}
                        onChange={(e) => setEmailTest({ ...emailTest, check_role: e.target.checked })}
                        className="mr-2"
                      />
                      Check Role
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={emailTest.check_free}
                        onChange={(e) => setEmailTest({ ...emailTest, check_free: e.target.checked })}
                        className="mr-2"
                      />
                      Check Free
                    </label>
                  </div>

                  <button
                    onClick={() => runTest('email', emailTest)}
                    disabled={isLoading}
                    className="btn-primary w-full"
                  >
                    {isLoading ? 'Validating...' : 'Test Email Validation'}
                  </button>
                </div>
              )}

              {activeTab === 'phone' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={phoneTest.phone}
                      onChange={(e) => setPhoneTest({ ...phoneTest, phone: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Default Country</label>
                    <select
                      value={phoneTest.country}
                      onChange={(e) => setPhoneTest({ ...phoneTest, country: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="US">United States (US)</option>
                      <option value="GB">United Kingdom (GB)</option>
                      <option value="CA">Canada (CA)</option>
                      <option value="AU">Australia (AU)</option>
                      <option value="DE">Germany (DE)</option>
                      <option value="FR">France (FR)</option>
                    </select>
                  </div>

                  <button
                    onClick={() => runTest('phone', phoneTest)}
                    disabled={isLoading}
                    className="btn-primary w-full"
                  >
                    {isLoading ? 'Validating...' : 'Test Phone Validation'}
                  </button>
                </div>
              )}

              {activeTab === 'domain' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Domain</label>
                    <input
                      type="text"
                      value={domainTest.domain}
                      onChange={(e) => setDomainTest({ ...domainTest, domain: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={domainTest.check_dns}
                        onChange={(e) => setDomainTest({ ...domainTest, check_dns: e.target.checked })}
                        className="mr-2"
                      />
                      Check DNS
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={domainTest.check_ssl}
                        onChange={(e) => setDomainTest({ ...domainTest, check_ssl: e.target.checked })}
                        className="mr-2"
                      />
                      Check SSL
                    </label>
                  </div>

                  <button
                    onClick={() => runTest('domain', domainTest)}
                    disabled={isLoading}
                    className="btn-primary w-full"
                  >
                    {isLoading ? 'Validating...' : 'Test Domain Validation'}
                  </button>
                </div>
              )}

              {activeTab === 'batch' && (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">
                    Batch testing available in the full API. Use individual testers above to see validation results.
                  </p>

                  <div className="code-block">
                    <pre className="text-xs">
{`curl -X POST https://validate.endpnt.dev/api/v1/validate/batch \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "items": [
      {"type": "email", "value": "test@example.com"},
      {"type": "phone", "value": "+15551234567"}
    ]
  }'`}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {testResults && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Test Results</h3>
                <div className="code-block h-64 overflow-y-auto">
                  <pre className="text-sm">
                    {JSON.stringify(testResults, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}