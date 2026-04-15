# endpnt Validation API

> Validate emails, phone numbers, and domains instantly with our lightning-fast API

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/endpnt-dev/validate)

## Features

- **📧 Email Validation**: Format check, MX records, disposable domain detection, role-based flagging, free provider detection, typo suggestions
- **📱 Phone Validation**: International format parsing, country detection, type identification, vanity number conversion  
- **🌐 Domain Validation**: DNS resolution, SSL certificate check, comprehensive record lookup
- **📦 Batch Processing**: Up to 50 validations in a single request
- **⚡ Fast Performance**: Sub-100ms response times, no external API dependencies
- **🔒 Secure**: API key authentication, rate limiting, comprehensive error handling

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/endpnt-dev/validate.git
cd validate
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
API_KEYS={"ek_live_74qlNSbK5jTwq28Y":{"tier":"free","name":"Demo Key"}}
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the live demo.

### 4. Test the API

```bash
curl -X POST http://localhost:3000/api/v1/validate/email \
  -H "Content-Type: application/json" \
  -H "x-api-key: ek_live_74qlNSbK5jTwq28Y" \
  -d '{"email": "test@example.com"}'
```

## API Reference

### Email Validation

```bash
POST /api/v1/validate/email
```

**Request:**
```json
{
  "email": "user@example.com",
  "check_mx": true,
  "check_disposable": true,
  "check_role": true,
  "check_free": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "valid": true,
    "score": 0.95,
    "checks": {
      "format": {"pass": true, "detail": "Valid email format"},
      "mx_record": {"pass": true, "detail": "MX record found"},
      "disposable": {"pass": true, "detail": "Not a disposable domain"},
      "role_based": {"pass": true, "detail": "Not a role-based address"},
      "free_provider": {"pass": false, "detail": "Free email provider detected"}
    },
    "domain": {
      "name": "example.com",
      "has_mx": true,
      "mx_records": ["mx1.example.com"],
      "is_disposable": false,
      "is_free_provider": false
    },
    "suggestion": null
  }
}
```

## Technology Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Phone Library**: libphonenumber-js
- **Rate Limiting**: @upstash/ratelimit + @upstash/redis
- **DNS/SSL**: Node.js built-in modules (`dns`, `tls`)
- **Deployment**: Vercel

## Testing

Run the comprehensive test suite:

```bash
# Start the dev server first
npm run dev

# Run smoke tests
node test-api.js
```

See [TESTING.md](TESTING.md) for detailed testing documentation.

## Performance

### Response Times
- **Health Check**: < 10ms
- **Email Validation**: < 100ms
- **Phone Validation**: < 50ms
- **Domain Validation**: < 200ms
- **Batch (10 items)**: < 500ms

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ by [endpnt.dev](https://endpnt.dev)
