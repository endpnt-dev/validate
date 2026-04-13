import React from 'react'
import Link from 'next/link'

export default function PricingPage() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      description: 'Perfect for testing and small projects',
      features: [
        '100 validations per day',
        'All validation types',
        'Basic support',
        'Standard rate limits',
        'No credit card required',
      ],
      limitations: [
        'No batch validation',
        'Community support only',
      ],
      cta: 'Get Started Free',
      popular: false,
    },
    {
      name: 'Pro',
      price: '$19',
      period: '/month',
      description: 'For growing businesses and applications',
      features: [
        '10,000 validations per day',
        'Batch validation (up to 50)',
        'Priority support',
        'Higher rate limits',
        'Email & chat support',
        'SLA guarantee',
      ],
      limitations: [],
      cta: 'Start Pro Trial',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For high-volume applications and teams',
      features: [
        'Unlimited validations',
        'Custom batch sizes',
        'Dedicated support',
        'Custom rate limits',
        'Phone & email support',
        '99.9% SLA guarantee',
        'Custom integrations',
        'On-premise deployment',
      ],
      limitations: [],
      cta: 'Contact Sales',
      popular: false,
    },
  ]

  const faqs = [
    {
      question: 'How is usage calculated?',
      answer: 'Each validation request (email, phone, or domain) counts as one validation. Batch requests count each item in the batch as one validation.',
    },
    {
      question: 'What happens if I exceed my limit?',
      answer: 'Free accounts will receive rate limit errors. Pro accounts have overage protection with additional validations billed at $0.002 each.',
    },
    {
      question: 'Do you offer refunds?',
      answer: 'We offer a 30-day money-back guarantee for all paid plans. Contact support for assistance.',
    },
    {
      question: 'Can I change plans anytime?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.',
    },
    {
      question: 'What validation types are included?',
      answer: 'All plans include email, phone, and domain validation with the same feature set. Higher plans offer more volume and better support.',
    },
    {
      question: 'Is there an API rate limit?',
      answer: 'Yes, to ensure service quality. Free: 10 req/min, Pro: 100 req/min, Enterprise: Custom limits based on your needs.',
    },
  ]

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
              <Link href="/docs" className="text-gray-300 hover:text-white transition-colors">
                Docs
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Simple, predictable pricing
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Start free, scale as you grow. No hidden fees, no surprises.
            All plans include access to email, phone, and domain validation.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`card p-8 relative ${
                plan.popular ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-400">{plan.period}</span>
                </div>
                <p className="text-gray-400">{plan.description}</p>
              </div>

              <div className="space-y-4 mb-8">
                <h4 className="font-semibold text-green-400">Included:</h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm">
                      <span className="text-green-400 mr-3">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.limitations.length > 0 && (
                  <>
                    <h4 className="font-semibold text-red-400 mt-6">Not included:</h4>
                    <ul className="space-y-2">
                      {plan.limitations.map((limitation, limitIndex) => (
                        <li key={limitIndex} className="flex items-center text-sm text-gray-400">
                          <span className="text-red-400 mr-3">×</span>
                          {limitation}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <a
                href={plan.name === 'Enterprise' ? 'mailto:sales@endpnt.dev' : 'https://endpnt.dev/signup'}
                className={`block w-full text-center py-3 rounded-lg font-medium transition-colors ${
                  plan.popular
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Feature Comparison</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-4">Feature</th>
                  <th className="text-center p-4">Free</th>
                  <th className="text-center p-4 bg-blue-500/10">Pro</th>
                  <th className="text-center p-4">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  ['Daily validations', '100', '10,000', 'Unlimited'],
                  ['Batch validation', '×', '✓', '✓'],
                  ['Rate limit (req/min)', '10', '100', 'Custom'],
                  ['Support level', 'Community', 'Priority', 'Dedicated'],
                  ['SLA guarantee', '×', '99% uptime', '99.9% uptime'],
                  ['Custom integrations', '×', '×', '✓'],
                  ['On-premise deployment', '×', '×', '✓'],
                ].map((row, index) => (
                  <tr key={index} className="border-b border-gray-800">
                    <td className="p-4 font-medium">{row[0]}</td>
                    <td className="p-4 text-center text-gray-400">{row[1]}</td>
                    <td className="p-4 text-center bg-blue-500/5">{row[2]}</td>
                    <td className="p-4 text-center text-gray-400">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {faqs.map((faq, index) => (
                <div key={index} className="card p-6">
                  <h3 className="font-semibold mb-3">{faq.question}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who trust endpnt for their validation needs.
            Start with our free plan and upgrade when you're ready.
          </p>
          <div className="flex justify-center space-x-4">
            <a
              href="https://endpnt.dev/signup"
              className="btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Your API Key
            </a>
            <Link href="/docs" className="btn-secondary">
              View Documentation
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-700 py-8 px-4 sm:px-6 lg:px-8 mt-20">
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
            <a
              href="mailto:support@endpnt.dev"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Support
            </a>
            <a
              href="https://endpnt.dev/terms"
              className="text-gray-400 hover:text-white transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms
            </a>
            <a
              href="https://endpnt.dev/privacy"
              className="text-gray-400 hover:text-white transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}