'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [demoEmail, setDemoEmail] = useState('')
  const [demoResult, setDemoResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleDemoValidation = async () => {
    if (!demoEmail.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/validate/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ek_live_74qlNSbK5jTwq28Y',
        },
        body: JSON.stringify({
          email: demoEmail,
          check_mx: true,
          check_disposable: true,
          check_role: true,
          check_free: true,
        }),
      })

      const result = await response.json()
      setDemoResult(result)
    } catch (error) {
      setDemoResult({
        success: false,
        error: { message: 'Demo request failed' },
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
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-400">endpnt</h1>
              <span className="ml-2 text-sm text-gray-400">/validate</span>
            </div>
            <nav className="flex space-x-8">
              <Link href="/docs" className="text-gray-300 hover:text-white transition-colors">
                Docs
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

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Validate emails, phones,
            <br />
            <span className="text-blue-400">and domains instantly</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Catch fake signups, reduce bounce rates, and verify leads with our lightning-fast
            validation API. No external dependencies, pure Node.js performance.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/docs" className="btn-primary">
              Get Started
            </Link>
            <Link href="/docs#examples" className="btn-secondary">
              View Examples
            </Link>
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Try it live</h2>
            <p className="text-gray-400">Enter an email address to see our validation in action</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label htmlFor="demo-email" className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="flex space-x-2">
                <input
                  id="demo-email"
                  type="email"
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && handleDemoValidation()}
                />
                <button
                  onClick={handleDemoValidation}
                  disabled={isLoading || !demoEmail.trim()}
                  className="btn-primary min-w-[100px]"
                >
                  {isLoading ? 'Checking...' : 'Validate'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Result</label>
              <div className="code-block h-64 overflow-y-auto">
                {demoResult ? (
                  <pre className="text-sm">
                    {JSON.stringify(demoResult, null, 2)}
                  </pre>
                ) : (
                  <div className="text-gray-500 italic">
                    Enter an email address and click Validate to see the results
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Three validation types, one API</h2>
            <p className="text-gray-400 text-lg">
              Everything you need to validate user input and improve data quality
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Email Validation */}
            <div className="card p-6">
              <div className="text-blue-400 text-2xl mb-4">📧</div>
              <h3 className="text-xl font-semibold mb-3">Email Validation</h3>
              <ul className="text-gray-400 space-y-2 mb-6">
                <li>• Format verification</li>
                <li>• MX record lookup</li>
                <li>• Disposable domain detection</li>
                <li>• Role-based address flagging</li>
                <li>• Free provider identification</li>
                <li>• Typo suggestions</li>
              </ul>
              <div className="code-block text-xs">
                POST /api/v1/validate/email
              </div>
            </div>

            {/* Phone Validation */}
            <div className="card p-6">
              <div className="text-green-400 text-2xl mb-4">📱</div>
              <h3 className="text-xl font-semibold mb-3">Phone Validation</h3>
              <ul className="text-gray-400 space-y-2 mb-6">
                <li>• International format parsing</li>
                <li>• Country code detection</li>
                <li>• Phone type identification</li>
                <li>• Multiple format outputs</li>
                <li>• Vanity number conversion</li>
                <li>• Extension handling</li>
              </ul>
              <div className="code-block text-xs">
                POST /api/v1/validate/phone
              </div>
            </div>

            {/* Domain Validation */}
            <div className="card p-6">
              <div className="text-purple-400 text-2xl mb-4">🌐</div>
              <h3 className="text-xl font-semibold mb-3">Domain Validation</h3>
              <ul className="text-gray-400 space-y-2 mb-6">
                <li>• DNS record verification</li>
                <li>• SSL certificate check</li>
                <li>• A, AAAA, MX record lookup</li>
                <li>• Nameserver identification</li>
                <li>• TXT record analysis</li>
                <li>• Certificate expiry dates</li>
              </ul>
              <div className="code-block text-xs">
                POST /api/v1/validate/domain
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple to integrate</h2>
            <p className="text-gray-400">Get started in seconds with our straightforward API</p>
          </div>

          <div className="code-block">
            <pre className="text-sm">
              {`curl -X POST https://validate.endpnt.dev/api/v1/validate/email \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "email": "user@example.com",
    "check_mx": true,
    "check_disposable": true
  }'`}
            </pre>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div>
              <h3 className="font-semibold mb-3">Features</h3>
              <ul className="text-gray-400 space-y-1">
                <li>• Sub-100ms response times</li>
                <li>• Batch validation (up to 50 items)</li>
                <li>• Detailed scoring system</li>
                <li>• Comprehensive error handling</li>
                <li>• Rate limiting included</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Reliability</h3>
              <ul className="text-gray-400 space-y-1">
                <li>• 99.9% uptime SLA</li>
                <li>• No external API dependencies</li>
                <li>• Global CDN deployment</li>
                <li>• Automatic DNS timeout handling</li>
                <li>• Built-in retry logic</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-700 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <p className="text-gray-400">
              Built by{' '}
              <a
                href="https://endpnt.dev"
                className="text-blue-400 hover:text-blue-300 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                endpnt.dev
              </a>
            </p>
          </div>
          <div className="flex space-x-6">
            <Link href="/docs" className="text-gray-400 hover:text-white transition-colors">
              Documentation
            </Link>
            <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <a
              href="https://endpnt.dev/support"
              className="text-gray-400 hover:text-white transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}