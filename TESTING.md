> **⚠️ Security note (2026-04-24):** This file previously contained a live API key literal (C-008). The key has been revoked and is no longer active. Curl examples use `YOUR_API_KEY` — substitute a key retrieved from Vercel env.

# Testing Guide

## Overview

The endpnt Validation API includes comprehensive testing capabilities with 16 smoke tests covering all major functionality.

## Test Environment Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Set Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```
   API_KEYS={"YOUR_API_KEY":{"tier":"free","name":"Demo Key"}}
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

## Running Tests

### Automated Smoke Tests

Run the comprehensive test suite:

```bash
node test-api.js
```

This runs 16 smoke tests covering:

| Test | Scenario | Endpoint | Expected Result |
|------|----------|----------|-----------------|
| 1 | Health check | GET /api/v1/health | Returns { status: "ok" } |
| 2 | Valid email | POST /api/v1/validate/email | valid: true, score > 0.8 |
| 3 | Invalid email format | POST /api/v1/validate/email | valid: false, score: 0.0 |
| 4 | Disposable email | POST /api/v1/validate/email | disposable domain detected |
| 5 | Role-based email | POST /api/v1/validate/email | role-based address flagged |
| 7 | Valid US phone | POST /api/v1/validate/phone | valid: true, type: mobile |
| 8 | Invalid phone | POST /api/v1/validate/phone | valid: false |
| 9 | Phone without country code | POST /api/v1/validate/phone | parses correctly as US number |
| 10 | Valid domain | POST /api/v1/validate/domain | valid: true, has A records |
| 11 | Invalid domain | POST /api/v1/validate/domain | valid: false, no DNS records |
| 12 | Batch validation | POST /api/v1/validate/batch | returns array of 3 results |
| 13 | Batch too large | POST /api/v1/validate/batch | returns 400 BATCH_TOO_LARGE |
| 14 | Missing API key | POST without x-api-key | returns 401 |
| 16 | Typo suggestion | POST with typo domain | suggestion provided |

### Manual Testing

#### Email Validation
```bash
curl -X POST http://localhost:3000/api/v1/validate/email \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "email": "test@example.com",
    "check_mx": true,
    "check_disposable": true,
    "check_role": true,
    "check_free": true
  }'
```

#### Phone Validation
```bash
curl -X POST http://localhost:3000/api/v1/validate/phone \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "phone": "+1-555-123-4567",
    "country": "US"
  }'
```

#### Domain Validation
```bash
curl -X POST http://localhost:3000/api/v1/validate/domain \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "domain": "example.com",
    "check_dns": true,
    "check_ssl": true
  }'
```

#### Batch Validation
```bash
curl -X POST http://localhost:3000/api/v1/validate/batch \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "items": [
      {"type": "email", "value": "test@example.com"},
      {"type": "phone", "value": "+15551234567"},
      {"type": "domain", "value": "example.com"}
    ]
  }'
```

## Test Data

### Disposable Email Domains
- The API includes 3000+ known disposable email domains
- Test with: `test@tempmail.com`, `user@mailinator.com`

### Role-based Email Addresses
- Detected prefixes: admin, info, support, sales, etc.
- Test with: `admin@company.com`, `info@example.org`

### Free Email Providers
- Includes: gmail.com, yahoo.com, outlook.com, etc.
- Test with: `user@gmail.com`, `test@yahoo.com`

### Phone Number Formats
- International: `+1-555-123-4567`
- National: `(555) 123-4567`
- Vanity: `1-800-FLOWERS`
- With extension: `555-1234 x123`

### Domain Types
- Valid: `google.com`, `github.com`
- Invalid: `nonexistentdomain12345.com`
- No SSL: use domains without HTTPS setup

## Error Handling Tests

### Authentication Errors
- Missing API key: 401 AUTH_REQUIRED
- Invalid API key: 401 INVALID_API_KEY

### Validation Errors
- Invalid email format: 400 INVALID_PARAMS
- Empty phone number: 400 INVALID_PARAMS
- Batch too large: 400 BATCH_TOO_LARGE

### Rate Limiting
- Exceeds daily limit: 429 RATE_LIMIT_EXCEEDED
- Headers include: X-RateLimit-Limit, X-RateLimit-Remaining

### DNS/Network Errors
- DNS lookup timeout: graceful degradation
- SSL connection timeout: returns error details

## Performance Testing

### Response Time Targets
- Health check: < 10ms
- Email validation: < 100ms
- Phone validation: < 50ms (no network calls)
- Domain validation: < 200ms (DNS + SSL)
- Batch validation: < 500ms (10 items)

### Concurrency Testing
- Batch endpoint handles 10 concurrent validations
- Rate limiting prevents abuse
- DNS timeouts prevent hanging requests

## Frontend Testing

### Landing Page (/)
- Hero section renders correctly
- Live email demo works
- Feature cards display properly
- Links to docs and pricing work

### Documentation (/docs)
- All tabs (email, phone, domain, batch) work
- Interactive testers function correctly
- Code examples are accurate
- Parameter descriptions are complete

### Pricing (/pricing)
- Pricing tiers display correctly
- Feature comparison table works
- FAQ section is comprehensive
- CTA links function properly

## Edge Cases

### Email Validation
- Plus addressing: `user+tag@gmail.com`
- Unicode domains: `test@münchen.de`
- Long domains: up to 253 characters
- Consecutive dots: `user..name@domain.com` (invalid)

### Phone Validation
- International formats: country code detection
- Vanity numbers: letter-to-digit conversion
- Extensions: automatic removal
- Invalid formats: graceful error handling

### Domain Validation
- Trailing dots: `example.com.` normalization
- Protocol prefixes: `https://example.com` cleanup
- Port numbers: `example.com:8080` handling
- Subdomains: `subdomain.example.com` support

### Batch Validation
- Mixed types: email + phone + domain
- Individual failures: don't affect other items
- Empty arrays: validation error
- Malformed items: specific error messages

## Security Testing

### Input Validation
- SQL injection attempts: properly escaped
- XSS attempts: sanitized responses
- Path traversal: blocked
- Oversized payloads: rejected

### Rate Limiting
- Per-API-key limits: enforced
- Burst protection: prevents abuse
- Fair usage: proper quota allocation
- Reset timing: accurate headers

### Authentication
- API key validation: secure comparison
- Header injection: prevented
- Token extraction: multiple methods supported
- Error messages: don't leak information

## Production Readiness

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Redis rate limiting active (optional)
- [ ] SSL certificates valid
- [ ] DNS resolution working
- [ ] All tests passing
- [ ] Error logging configured
- [ ] Monitoring setup

### Vercel Deployment
1. Set environment variables in Vercel dashboard
2. Configure custom domain: `validate.endpnt.dev`
3. Enable edge caching for static assets
4. Monitor function performance
5. Set up alerts for errors

### Performance Monitoring
- Response times per endpoint
- Error rates by validation type
- Rate limit hit rates
- DNS lookup success rates
- SSL certificate validity

## Troubleshooting

### Common Issues
- **DNS timeouts**: Check network connectivity
- **SSL failures**: Verify certificate validity  
- **Rate limiting**: Check Redis configuration
- **Import errors**: Verify data file paths
- **Build failures**: Check TypeScript compilation

### Debug Mode
Set `NODE_ENV=development` for:
- Detailed error messages
- Request/response logging
- Validation step tracing
- Performance timing info

### Logs Analysis
Monitor for patterns in:
- High-frequency validation requests
- Specific domain lookup failures
- SSL certificate expiration warnings
- Rate limit threshold approaches