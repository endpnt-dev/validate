# CLAUDE.md — Validate API Specific Rules

**This file supplements `C:\Repositories\endpnt\CLAUDE.md` (platform-wide rules).** Read both. Universal rules (definition of done, mandatory workflow, agent usage, spec archive procedure, status-report honesty) are in the platform file. Only Validate-specific guidance lives here.

---

## What this API does

Validate verifies user input — emails, phone numbers, domains, IP addresses, URLs, etc. Routes under `/api/v1/`:

- `email` — syntax + MX record + disposable/role detection
- `phone` — parse via `libphonenumber-js`, normalize to E.164, detect carrier/type
- `domain` — DNS lookup, WHOIS-adjacent checks
- Other validators (see `app/api/v1/`)

Input: JSON body with the value to validate + options. Output: validation result in the standard response envelope. No file I/O, no image processing — the lightest API on the platform.

---

## Validate is the Outlier — Know Where It Diverges

Validate was built with subtly different conventions than its sister APIs (QR, Preview, Convert, Screenshot). These divergences are tracked as future work, NOT to be fixed in ad-hoc tasks:

### 1. Rate-limit algorithm

Validate uses `Ratelimit.fixedWindow()`. All other APIs use `Ratelimit.slidingWindow()`.

Behavior difference: fixed-window allows bursts at window boundaries (a free user can hit 20 requests in 1 second if they straddle a window reset). Sliding-window is smoother and more forgiving of legitimate bursts while harder to exploit.

### 2. Rate-limit config shape

Validate's `lib/config.ts` uses:

```typescript
RATE_LIMITS[tier] = { requests: number, window: string }
```

All other APIs use:

```typescript
TIER_LIMITS[tier] = { requests_per_minute: number, requests_per_month: number }
```

This means Validate's rate-limit config cannot be copy-pasted to/from sister APIs without rewriting.

### 3. Rate-limit key prefix

Validate uses `@upstash/ratelimit:validate:{tier}`. All others use `rl:{api}:{tier}` (after the Screenshot fix lands).

Validate's prefix is fine — it's API-namespaced and doesn't collide. It just doesn't match.

### 4. Tier set

~~Validate exposes `free / pro / enterprise` only. No `starter` tier.~~ **Fixed 2026-04-23:** `starter` tier added to `ApiKeyInfo` union in `lib/config.ts` and to the tier allow-list in `lib/auth.ts`. Phase 7 key rotation required it (Demo Proxy Key upgraded to starter tier). See exception note below.

### The fix (future, not now)

All four divergences get fixed together as a dedicated "validate normalization" spec. Do NOT attempt partial fixes — the config shape and algorithm changes couple with tier-count changes, and you cannot cleanly do one without the others.

If you need to touch Validate's rate-limit code for an unrelated reason: preserve the current shape and algorithm. Don't "helpfully" align it with peers mid-task.

Exception (authorized 2026-04-23, JK): The tier-set divergence (starter tier missing) was addressed standalone ahead of the full normalization spec because Phase 7 key rotation required it. The remaining 3 divergences (algorithm: fixedWindow, config shape: requests/window, key prefix: @upstash/ratelimit:validate:{tier}) are still coupled and still deferred to the validate normalization spec. Do NOT use this exception as precedent — future standalone divergence fixes still require explicit JK authorization.

---

## Library Choices

| Library | Purpose | Key gotcha |
|---|---|---|
| `libphonenumber-js` | Phone parsing and validation | Default export is large. Prefer subpath imports like `libphonenumber-js/min` if you don't need full metadata. |

Validate has NO native dependencies, NO image processing, NO browsers. This is why its build is the fastest on the platform. **Keep it this way.** If a validation endpoint "needs" a heavy library (Python-style validation frameworks, full Node URL parsers with native deps), push back — cheaper alternatives exist.

---

## Next.js Config — FIX REQUIRED

Current `next.config.js` has two issues:

```javascript
const nextConfig = {
  experimental: {
    appDir: true,  // ❌ Deprecated — appDir is default in Next 13.4+, always true
  },
  runtime: 'nodejs',  // ❌ Not a valid Next 14 top-level config key
  output: 'standalone'  // ✅ OK
}
```

**`appDir: true`** — was required in Next 13 early betas. Removed/ignored in Next 14. Safe to delete.

**`runtime: 'nodejs'`** at the top level is not a recognized Next config key. Runtime is configured per-route via `export const runtime = 'nodejs'` in the route file. If some routes need the Edge runtime explicitly excluded (likely the case here, since DNS lookups need Node's `dns` module), add `export const runtime = 'nodejs'` to the specific route files, not here.

Correct version:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone'
}

module.exports = nextConfig
```

And in each API route file that uses `dns`, `net`, `tls`, or similar Node-only modules:

```typescript
// app/api/v1/email/route.ts
export const runtime = 'nodejs'
```

Don't fix this as a side task. Scope as its own micro spec if you touch the config.

---

## Shared Handler Pattern (Reference for Other APIs)

`lib/api-handler.ts` has Validate's `createApiHandler` wrapper that deduplicates auth + rate-limit + parse boilerplate across routes. This is the target pattern for Convert's future refactor (flagged as M4 in Convert's code review).

When extending Validate, use the wrapper. Do not write route handlers with inline auth/rate-limit code — it drifts from the established pattern.

---

## DNS and Network Operations

Validate's email and domain routes do real DNS lookups. This has implications:

- Must run in Node.js runtime (Edge runtime has no `dns` module)
- Must have a timeout — DNS can hang forever against unreachable servers
- Must handle IPv4/IPv6 mixed results
- Cannot run in Vercel's Edge middleware

Verify the per-route `export const runtime = 'nodejs'` is set on any route that does DNS. Absent that, Vercel may try to run the route at Edge and it'll fail at runtime with "module not found: dns."

---

## Validate-Specific Error Codes

Beyond platform errors:

- `INVALID_EMAIL_SYNTAX` (400)
- `INVALID_PHONE_FORMAT` (400)
- `INVALID_DOMAIN` (400)
- `DNS_LOOKUP_FAILED` (500)
- `DNS_TIMEOUT` (504)
- `DISPOSABLE_EMAIL_CHECK_FAILED` (500)

---

## Disposable Email Detection

Validate uses a static list of known disposable email domains. The list lives in `data/` (likely `data/disposable-domains.json` or similar). Update cadence: probably stale — the list should be refreshed periodically against a maintained source like `disposable-email-domains` npm package. Not blocking, but track as data-freshness debt.

---

## Loose files at repo root

- `test-api.js` — test scaffolding. Move to `tests/` or gitignore.
- `TESTING.md` — testing notes. Should probably live in `docs/` or be part of README.

Not blocking. Clean up when next in the repo.

---

## DO NOT TOUCH (Validate-specific)

- `lib/rate-limit.ts` config shape or algorithm outside of the dedicated normalization spec — see divergence section above
- `data/` files without a freshness plan — stale disposable-domain data leads to wrong-answer bugs, not crashes, so they're hard to catch
- Per-route `export const runtime = 'nodejs'` — removing it silently switches routes to Edge and breaks DNS
