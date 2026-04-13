import { promises as dns } from 'dns'
import { connect as tlsConnect, ConnectionOptions } from 'tls'

export interface DomainOptions {
  check_ssl?: boolean
  check_dns?: boolean
}

export interface DomainResult {
  domain: string
  valid: boolean
  score: number
  dns: {
    has_a_record: boolean
    a_records: string[]
    has_aaaa_record: boolean
    aaaa_records: string[]
    has_mx: boolean
    mx_records: string[]
    has_txt: boolean
    txt_records: string[]
    has_cname: boolean
    cname_record: string | null
    nameservers: string[]
  }
  ssl: {
    valid: boolean
    issuer: string | null
    expires: string | null
    daysUntilExpiration: number | null
    error: string | null
  }
}

// Normalize domain name
function normalizeDomain(domain: string): string {
  let normalized = domain.toLowerCase().trim()

  // Remove protocol if included
  normalized = normalized.replace(/^https?:\/\//, '')
  normalized = normalized.replace(/^www\./, '')

  // Remove trailing dot (DNS convention)
  normalized = normalized.replace(/\.$/, '')

  // Remove path if included
  normalized = normalized.split('/')[0]

  // Remove port if included
  normalized = normalized.split(':')[0]

  return normalized
}

// Check DNS records for domain
async function checkDns(domain: string) {
  const dnsResult = {
    has_a_record: false,
    a_records: [] as string[],
    has_aaaa_record: false,
    aaaa_records: [] as string[],
    has_mx: false,
    mx_records: [] as string[],
    has_txt: false,
    txt_records: [] as string[],
    has_cname: false,
    cname_record: null as string | null,
    nameservers: [] as string[],
  }

  const timeout = 5000 // 5 second timeout

  try {
    // Use Promise.allSettled to not fail entire check if one lookup fails
    const lookups = await Promise.allSettled([
      // A records
      Promise.race([
        dns.resolve4(domain),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('A record timeout')), timeout)
        )
      ]),
      // AAAA records
      Promise.race([
        dns.resolve6(domain),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AAAA record timeout')), timeout)
        )
      ]),
      // MX records
      Promise.race([
        dns.resolveMx(domain),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('MX record timeout')), timeout)
        )
      ]),
      // TXT records
      Promise.race([
        dns.resolveTxt(domain),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TXT record timeout')), timeout)
        )
      ]),
      // CNAME records
      Promise.race([
        dns.resolveCname(domain),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('CNAME record timeout')), timeout)
        )
      ]),
      // NS records
      Promise.race([
        dns.resolveNs(domain),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('NS record timeout')), timeout)
        )
      ]),
    ])

    // Process A records
    if (lookups[0].status === 'fulfilled') {
      dnsResult.a_records = lookups[0].value as string[]
      dnsResult.has_a_record = dnsResult.a_records.length > 0
    }

    // Process AAAA records
    if (lookups[1].status === 'fulfilled') {
      dnsResult.aaaa_records = lookups[1].value as string[]
      dnsResult.has_aaaa_record = dnsResult.aaaa_records.length > 0
    }

    // Process MX records
    if (lookups[2].status === 'fulfilled') {
      const mxRecords = lookups[2].value as Array<{ exchange: string; priority: number }>
      dnsResult.mx_records = mxRecords
        .sort((a, b) => a.priority - b.priority)
        .map(mx => mx.exchange)
      dnsResult.has_mx = dnsResult.mx_records.length > 0
    }

    // Process TXT records
    if (lookups[3].status === 'fulfilled') {
      const txtRecords = lookups[3].value as string[][]
      dnsResult.txt_records = txtRecords.flat()
      dnsResult.has_txt = dnsResult.txt_records.length > 0
    }

    // Process CNAME records
    if (lookups[4].status === 'fulfilled') {
      const cnameRecords = lookups[4].value as string[]
      if (cnameRecords.length > 0) {
        dnsResult.has_cname = true
        dnsResult.cname_record = cnameRecords[0]
      }
    }

    // Process NS records
    if (lookups[5].status === 'fulfilled') {
      dnsResult.nameservers = lookups[5].value as string[]
    }

  } catch (error) {
    // Individual record lookup failures are handled by Promise.allSettled
    console.error('DNS lookup error:', error)
  }

  return dnsResult
}

// Check SSL certificate
async function checkSsl(domain: string) {
  const sslResult = {
    valid: false,
    issuer: null as string | null,
    expires: null as string | null,
    daysUntilExpiration: null as number | null,
    error: null as string | null,
  }

  try {
    const certificate = await new Promise<any>((resolve, reject) => {
      const options: ConnectionOptions = {
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: false, // We want to get certificate even if invalid
        timeout: 5000,
      }

      const socket = tlsConnect(options, () => {
        const cert = socket.getPeerCertificate()
        socket.end()
        resolve(cert)
      })

      socket.on('error', (error) => {
        socket.destroy()
        reject(error)
      })

      socket.on('timeout', () => {
        socket.destroy()
        reject(new Error('SSL connection timeout'))
      })
    })

    if (certificate && certificate.subject) {
      sslResult.valid = true

      // Extract issuer information
      if (certificate.issuer && certificate.issuer.O) {
        sslResult.issuer = certificate.issuer.O
      } else if (certificate.issuer && certificate.issuer.CN) {
        sslResult.issuer = certificate.issuer.CN
      }

      // Extract expiration date
      if (certificate.valid_to) {
        const expiryDate = new Date(certificate.valid_to)
        sslResult.expires = expiryDate.toISOString().split('T')[0] // YYYY-MM-DD format

        // Calculate days until expiration
        const now = new Date()
        const timeDiff = expiryDate.getTime() - now.getTime()
        sslResult.daysUntilExpiration = Math.ceil(timeDiff / (1000 * 3600 * 24))
      }

      // Check if certificate is currently valid
      const now = new Date()
      const validFrom = certificate.valid_from ? new Date(certificate.valid_from) : null
      const validTo = certificate.valid_to ? new Date(certificate.valid_to) : null

      if (validFrom && validTo) {
        if (now < validFrom || now > validTo) {
          sslResult.valid = false
          sslResult.error = 'Certificate is expired or not yet valid'
        }
      }

    } else {
      sslResult.valid = false
      sslResult.error = 'No certificate found'
    }

  } catch (error: any) {
    sslResult.valid = false
    sslResult.error = error.message || 'SSL check failed'
  }

  return sslResult
}

// Calculate domain score
function calculateDomainScore(dns: DomainResult['dns'], ssl: DomainResult['ssl']): number {
  let score = 0

  // Must have either A record or AAAA record to be functional
  if (!dns.has_a_record && !dns.has_aaaa_record) {
    return 0.0 // No web presence
  }

  // Base score for having A record
  if (dns.has_a_record) {
    score += 0.4
  }

  // Additional score for IPv6 support
  if (dns.has_aaaa_record) {
    score += 0.1
  }

  // MX records indicate email capability
  if (dns.has_mx) {
    score += 0.2
  }

  // TXT records often indicate proper DNS management (SPF, DMARC, etc.)
  if (dns.has_txt) {
    score += 0.1
  }

  // Valid SSL certificate
  if (ssl.valid) {
    score += 0.15
  }

  // Bonus for having nameservers (proper DNS setup)
  if (dns.nameservers.length > 0) {
    score += 0.05
  }

  return Math.min(1.0, score)
}

// Main domain validation function
export async function validateDomain(
  domain: string,
  options: DomainOptions = {}
): Promise<DomainResult> {
  const { check_ssl = true, check_dns = true } = options

  // Normalize domain
  const normalizedDomain = normalizeDomain(domain)

  // Basic domain format validation
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
  if (!domainRegex.test(normalizedDomain)) {
    return {
      domain: normalizedDomain,
      valid: false,
      score: 0,
      dns: {
        has_a_record: false,
        a_records: [],
        has_aaaa_record: false,
        aaaa_records: [],
        has_mx: false,
        mx_records: [],
        has_txt: false,
        txt_records: [],
        has_cname: false,
        cname_record: null,
        nameservers: [],
      },
      ssl: {
        valid: false,
        issuer: null,
        expires: null,
        daysUntilExpiration: null,
        error: 'Invalid domain format',
      },
    }
  }

  // Initialize result
  const result: DomainResult = {
    domain: normalizedDomain,
    valid: false,
    score: 0,
    dns: {
      has_a_record: false,
      a_records: [],
      has_aaaa_record: false,
      aaaa_records: [],
      has_mx: false,
      mx_records: [],
      has_txt: false,
      txt_records: [],
      has_cname: false,
      cname_record: null,
      nameservers: [],
    },
    ssl: {
      valid: false,
      issuer: null,
      expires: null,
      daysUntilExpiration: null,
      error: null,
    },
  }

  // Run checks in parallel
  const checks: Promise<any>[] = []

  if (check_dns) {
    checks.push(checkDns(normalizedDomain))
  }

  if (check_ssl) {
    checks.push(checkSsl(normalizedDomain))
  }

  const results = await Promise.allSettled(checks)

  // Process DNS results
  if (check_dns && results[0] && results[0].status === 'fulfilled') {
    result.dns = results[0].value
  }

  // Process SSL results
  const sslIndex = check_ssl ? (check_dns ? 1 : 0) : -1
  if (check_ssl && sslIndex >= 0 && results[sslIndex] && results[sslIndex].status === 'fulfilled') {
    result.ssl = results[sslIndex].value
  }

  // Calculate score and validity
  result.score = calculateDomainScore(result.dns, result.ssl)
  result.valid = result.score > 0

  return result
}