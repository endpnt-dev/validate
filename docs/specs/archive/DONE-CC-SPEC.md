> **⚠️ Security note (2026-04-24):** This file previously contained a live API key literal (C-008). The key has been revoked and is no longer active. Curl examples use `YOUR_API_KEY` — substitute a key retrieved from Vercel env.

# endpnt Validation API — CC Spec (Part 5 of 6)
**Version:** 1.0
**Date:** April 13, 2026
**Author:** Opus (planning only — CC executes all code changes)
**Agent:** Start with architect → then frontend-agent + backend-agent for implementation
**Project:** endpnt.dev — Developer API platform
**Repo:** endpnt-dev/validate

---

## CRITICAL: Environment Setup (READ FIRST)

Before doing ANYTHING, run these commands to ensure you're in the right place:

```bash
cd /mnt/c/Repositories/endpnt/validate
pwd
# Must show: /mnt/c/Repositories/endpnt/validate

git branch
# Must show: * dev
# If not on dev, run: git checkout dev

git status
# Should be clean. If not, stash or commit existing changes.
```

**Git workflow for this project:**
- Work on `dev` branch
- Push to `dev` when done — Vercel auto-deploys a preview URL
- DO push to dev
- JK will review the preview, then open a PR to main on GitHub for production deploy

---

## Overview

Build the Validation API — the fifth of 5 utility APIs for endpnt.dev. This API validates email addresses, phone numbers, and domains using DNS lookups, regex pattern matching, and curated data lists. No AI, no external APIs — pure Node.js built-in modules.

This is the most lightweight API in the suite. No heavy dependencies like Playwright or Sharp. Extremely fast response times (<100ms for most requests).

Use the same architecture patterns from previous APIs. Copy shared scaffolding and adapt.

Deployed at validate.endpnt.dev.

---

## Requirements

1. Validate email addresses: format check, MX record lookup, disposable domain detection, role-based address detection, free provider detection
2. Validate phone numbers: format check, country code validation, carrier type detection
3. Validate domains: DNS resolution, SSL check, registrar info
4. Batch validation: up to 50 items in one request
5. Return a score (0.0 to 1.0) indicating overall validity confidence
6. Return detailed breakdown of each check performed
7. API key auth, rate limiting, standard response format
8. POST method for all endpoints
9. Landing page, docs page, pricing page
10. Health check at `/api/v1/health`

---

## Suggestions & Context

### Tech Stack
- **Framework:** Next.js 14+ App Router, TypeScript
- **DNS Lookups:** Node.js built-in `dns/promises` module (resolveMx, resolve4, resolveTxt)
- **Phone Validation:** `libphonenumber-js` — Google's phone number parsing library ported to JS
- **Disposable Email List:** Bundle a JSON file of ~3,000+ known disposable email domains. Source: open-source lists on GitHub (e.g., `disposable-email-domains` package or `ivolo/disposable-email-domains`)
- **Rate Limiting:** `@upstash/ratelimit` + `@upstash/redis`
- **Styling:** Tailwind CSS, dark theme

### Folder Structure

```
validate/
  app/
    api/
      v1/
        validate/
          email/
            route.ts          ← Email validation
          phone/
            route.ts          ← Phone validation
          domain/
            route.ts          ← Domain validation
          batch/
            route.ts          ← Batch validation (email, phone, or domain)
        health/
          route.ts
    page.tsx
    docs/
      page.tsx
    pricing/
      page.tsx
    layout.tsx
    globals.css
  lib/
    auth.ts                   ← Copy from previous APIs
    rate-limit.ts             ← Copy from previous APIs
    response.ts               ← Copy from previous APIs
    validators/
      email.ts                ← Email validation logic
      phone.ts                ← Phone validation logic
      domain.ts               ← Domain validation logic
    config.ts
  data/
    disposable-domains.json   ← List of ~3,000 disposable email domains
    free-providers.json       ← List of free email providers (gmail, yahoo, outlook, etc.)
    role-addresses.json       ← List of role-based prefixes (info, admin, support, sales, etc.)
  middleware.ts
  package.json
  tsconfig.json
  next.config.js
  tailwind.config.ts
  postcss.config.js
  .env.example
  vercel.json
  README.md
```

### API Endpoints

#### POST /api/v1/validate/email

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| email | string | Yes | — | Email address to validate |
| check_mx | boolean | No | true | Check if domain has valid MX records |
| check_disposable | boolean | No | true | Check against disposable email domain list |
| check_role | boolean | No | true | Flag role-based addresses (info@, admin@, etc.) |
| check_free | boolean | No | true | Flag free email providers (gmail, yahoo, etc.) |

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "valid": true,
    "score": 0.95,
    "checks": {
      "format": { "pass": true, "detail": "Valid email format" },
      "mx_record": { "pass": true, "detail": "MX record found: mx1.example.com" },
      "disposable": { "pass": true, "detail": "Not a disposable domain" },
      "role_based": { "pass": true, "detail": "Not a role-based address" },
      "free_provider": { "pass": false, "detail": "Free email provider detected" }
    },
    "domain": {
      "name": "example.com",
      "has_mx": true,
      "mx_records": ["mx1.example.com", "mx2.example.com"],
      "is_disposable": false,
      "is_free_provider": false
    },
    "suggestion": null
  }
}
```

**Score calculation:**
- Start at 1.0
- Format invalid → 0.0 (instant fail)
- No MX record → subtract 0.4
- Disposable domain → subtract 0.3
- Role-based → subtract 0.1
- Free provider → subtract 0.05 (not inherently bad, just a signal)

#### POST /api/v1/validate/phone

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| phone | string | Yes | — | Phone number (with or without country code) |
| country | string | No | "US" | Default country code if not included in number |

**Response:**
```json
{
  "success": true,
  "data": {
    "phone": "+14155551234",
    "valid": true,
    "score": 0.90,
    "formatted": {
      "international": "+1 415 555 1234",
      "national": "(415) 555-1234",
      "e164": "+14155551234"
    },
    "country": "US",
    "country_name": "United States",
    "type": "mobile",
    "carrier": null
  }
}
```

#### POST /api/v1/validate/domain

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| domain | string | Yes | — | Domain to validate |
| check_ssl | boolean | No | true | Check if domain has valid SSL certificate |
| check_dns | boolean | No | true | Check DNS resolution |

**Response:**
```json
{
  "success": true,
  "data": {
    "domain": "example.com",
    "valid": true,
    "score": 0.95,
    "dns": {
      "has_a_record": true,
      "a_records": ["93.184.216.34"],
      "has_mx": true,
      "has_txt": true,
      "nameservers": ["a.iana-servers.net", "b.iana-servers.net"]
    },
    "ssl": {
      "valid": true,
      "issuer": "DigiCert",
      "expires": "2027-01-15"
    }
  }
}
```

#### POST /api/v1/validate/batch

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| items | array | Yes | — | Array of objects: [{ type: "email", value: "..." }, ...] |

Max 50 items per batch. Returns array of results matching input order.

**Error codes:**
- `AUTH_REQUIRED` (401)
- `INVALID_API_KEY` (401)
- `RATE_LIMIT_EXCEEDED` (429)
- `INVALID_PARAMS` (400) — missing email/phone/domain
- `BATCH_TOO_LARGE` (400) — exceeds 50 items
- `DNS_LOOKUP_FAILED` (500) — DNS resolver error

### Landing Page
- Hero: "Validate emails, phones, and domains instantly"
- Live demo: Type an email address, see validation results in real-time
- Stats showing: "Catch fake signups, reduce bounce rates, verify leads"
- Three feature cards: email validation, phone validation, domain validation
- Code examples

### Docs Page
- Three sections/tabs: Email, Phone, Domain
- Interactive tester per validation type
- Score explanation (what each check means, how score is calculated)
- Batch validation examples
- Integration guides (signup form validation, CRM data cleaning, etc.)

---

## DO NOT TOUCH

- Do not modify any files outside `/mnt/c/Repositories/endpnt/validate/`
- Do not touch any other endpnt repos

---

## Edge Cases

1. Email with plus addressing (user+tag@gmail.com) — valid format, should pass
2. Email with very long domain — validate but flag unusual
3. Email with unicode characters — some are valid (internationalized email)
4. Phone number with extensions (555-1234 x123) — parse, ignore extension
5. Phone number with letters (1-800-FLOWERS) — convert to digits
6. Domain that exists but has no website (no A record, only MX) — still valid
7. Domain with trailing dot (example.com.) — normalize
8. Recently registered domain — can't detect this without WHOIS API (document limitation)
9. Batch with mixed types (emails and phones together) — handle each by its type field
10. MX lookup timeout — return result with mx_record check as "unknown" rather than failing entirely
11. Typo suggestions — if email domain is close to a common provider (gmial.com → gmail.com), include in `suggestion` field

---

## Environment Variables

```
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
API_KEYS={"YOUR_API_KEY":{"tier":"free","name":"Demo Key"}}
NEXT_PUBLIC_SITE_URL=https://validate.endpnt.dev
```

---

## Git Commit & Push

```bash
git add -A && git commit -m "feat: initial Validation API — email, phone, domain, batch endpoints" && git push origin dev
```

**DO push to dev.**

---

## Smoke Tests

| # | Scenario | Steps | Expected Result | Pass/Fail |
|---|----------|-------|-----------------|-----------|
| 1 | Health check | GET /api/v1/health | Returns { status: "ok" } | |
| 2 | Valid email | POST /api/v1/validate/email with email: "test@gmail.com" | valid: true, score > 0.8, free_provider: true | |
| 3 | Invalid email format | POST with email: "not-an-email" | valid: false, score: 0.0, format check fails | |
| 4 | Disposable email | POST with email: "test@tempmail.com" | valid: true but score reduced, disposable: true | |
| 5 | Role-based email | POST with email: "info@company.com" | role_based check flagged | |
| 6 | No MX record | POST with email at a domain with no MX | mx_record check fails, score reduced | |
| 7 | Valid US phone | POST /api/v1/validate/phone with phone: "+14155551234" | valid: true, type: mobile, formatted correctly | |
| 8 | Invalid phone | POST with phone: "123" | valid: false | |
| 9 | Phone without country code | POST with phone: "4155551234", country: "US" | Parses correctly as US number | |
| 10 | Valid domain | POST /api/v1/validate/domain with domain: "google.com" | valid: true, has A records, has MX | |
| 11 | Invalid domain | POST with domain: "thisdoesnotexist12345.com" | valid: false, no DNS records | |
| 12 | Batch validation | POST /api/v1/validate/batch with 3 mixed items | Returns array of 3 results | |
| 13 | Batch too large | POST batch with 51 items | Returns 400 BATCH_TOO_LARGE | |
| 14 | Missing API key | POST without x-api-key | Returns 401 | |
| 15 | Landing page | Visit / | Renders with hero, live demo, feature cards | |
| 16 | Typo suggestion | POST with email: "user@gmial.com" | suggestion: "user@gmail.com" | |


---

## ✅ Completion Record

- **Completed:** 2026-04-13
- **Final commit:** [commit hash from original buildout]
- **Vercel deployment:** green
- **Agents invoked:** architect, backend-agent, review-qa-agent
- **Smoke tests:** [N of N] passing
- **Notes:** Retired as part of 2026-04-20 housekeeping sweep. Content absorbed into platform CLAUDE.md and repo CLAUDE.md files. Validate API successfully built and deployed.
