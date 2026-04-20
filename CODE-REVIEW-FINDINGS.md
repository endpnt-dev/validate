# Validate API — Code Review Findings (endpnt-dev/validate)
**Reviewed by:** Opus (Claude chat) — cross-repo code review
**Date:** April 17, 2026
**Scope reviewed:** `app/api/v1/*` (all 4 routes), `lib/*`, `lib/validators/*` (email only read deeply)

---

## Critical issues

### None identified in this review.

Validate's core design is safer than Convert or Screenshot because it doesn't fetch arbitrary user-supplied URLs (SSRF surface is tiny — only MX DNS lookups and TLS probes, both of which use standard libraries). The main systemic issue is architectural divergence from sister APIs, addressed in Correctness below.

---

## Correctness issues

### M1 — Rate-limit config shape and algorithm diverge from sister APIs
**Files:** `lib/config.ts`, `lib/rate-limit.ts`

Validate is the only API in the platform using:
- `RATE_LIMITS` config shape (vs `TIER_LIMITS` in QR/Screenshot/Preview/Convert)
- `Ratelimit.fixedWindow()` (vs `slidingWindow()` in others)
- Per-day windows (`window: 86400`) vs per-minute windows
- Only 3 tiers (free/pro/enterprise — missing `starter`)

This is a structural inconsistency, not a bug. It works. But it means:
1. Pricing is displayed differently (per-day quotas vs per-minute rates)
2. Shared tooling across APIs can't assume a common shape
3. If someone eventually builds a platform-wide dashboard, Validate needs special handling
4. The missing `starter` tier means Validate either has no starter pricing OR uses pro limits for starter users — needs clarification

**Recommended fix:** Addressed in the cross-repo rate-limit discussion — see `CC-SPEC-RATELIMIT-FIX.md` in Screenshot repo's "Issue 2 Follow-Up" section. Not a tonight fix. Requires a pricing decision from JK about whether to add a `starter` tier to Validate.

### M2 — `auth.ts` has a second version of `validateApiKey` with different shape
**File:** `lib/auth.ts`

Validate's `validateApiKey` is a PRIVATE function inside `auth.ts`, used only by the module's own `authenticateRequest`:

```ts
function validateApiKey(apiKey: string): ApiKeyInfo | null {
  const apiKeys = getApiKeys()  // From config.ts
  const keyInfo = apiKeys[apiKey]
  if (!keyInfo) return null
  if (!['free', 'pro', 'enterprise'].includes(keyInfo.tier)) {
    console.error(`Invalid tier for API key: ${keyInfo.tier}`)
    return null
  }
  return keyInfo
}
```

Sister APIs export `validateApiKey` as a public helper. Validate wraps it inside a higher-level `authenticateRequest` function that returns a typed result. The inner validation also has an additional check — "reject if tier is not in the known set" — which QR/Screenshot/Preview/Convert do NOT do.

**This is actually better behavior** than the sister APIs — it fails closed if an unknown tier appears. But it's architecturally inconsistent.

**Recommended fix:** Consider this as a positive pattern to propagate to sister APIs, not to change here. Leave Validate's auth.ts alone. Flag for the "Issue 2" platform harmonization.

### M3 — `getApiKeyId(apiKey)` uses first 16 chars as rate-limit identifier
**File:** `lib/auth.ts` (bottom of file)

```ts
export function getApiKeyId(apiKey: string): string {
  return apiKey.substring(0, 16) // First 16 chars as identifier
}
```

The comment says "In production, you might want to use the actual key ID." A collision would require two API keys sharing the same first 16 characters. Since keys start with `ek_live_` (8 chars), that leaves only 8 characters of entropy as the uniqueness domain. With 256 possible characters per position (actually much less — likely alphanumeric, so ~62), the collision risk is low but not zero.

More importantly: using a prefix-slice as the rate-limit identifier is weird. Other APIs pass the full API key to `checkRateLimit`. Why the prefix slice?

Possible reason: to avoid leaking full API keys into Upstash keys (where they'd be visible to anyone who can read the Upstash dashboard). That IS a reasonable concern — but then the other 4 APIs have the same issue, and none of them truncate.

**Recommended fix:** Pick one pattern across the platform:
- Option A: Pass the full API key (simple, but leaks into Upstash analytics)
- Option B: Hash the key before using as rate-limit identifier (e.g., SHA-256 of the key) — prevents leakage AND provides collision resistance
- Currently Option C (truncation) — neither fully safe nor fully consistent

Flag for platform-wide decision.

### M4 — Email validation performs DNS lookup twice for MX records
**File:** `lib/validators/email.ts` (function `validateEmail`, lines ~297-320)

```ts
if (check_mx && domain) {
  result.checks.mx_record = await checkMx(domain)  // First DNS lookup
  result.domain.has_mx = result.checks.mx_record.pass === true

  if (result.checks.mx_record.pass) {
    try {
      const mxRecords = await dns.resolveMx(domain)  // Second DNS lookup (same domain!)
      result.domain.mx_records = mxRecords
        .sort((a, b) => a.priority - b.priority)
        .map(mx => mx.exchange)
    } catch (error) {
      // Ignore errors in extracting MX records for display
    }
  }
}
```

First lookup inside `checkMx` does the validation. Then if successful, lookup AGAIN to get the records for display. Latency penalty for every email validation with `check_mx: true` — effectively doubles the DNS lookup cost. Also uses extra quota against whatever DNS provider is in use.

**Recommended fix:** Make `checkMx` return the MX records alongside the pass/fail verdict. Use them in both places.

### M5 — Free tier has 100/day limit — is this advertised?
**File:** `lib/config.ts`

```ts
free: { requests: 100, window: 86400 }, // 100 per day
```

Validate's free tier is 100 requests PER DAY. Other APIs advertise "100 requests per month" on their pricing pages. Major discrepancy.

100/day × 30 days = 3,000/month equivalent — 30x more generous than sister APIs' 100/month advertised limits.

**This is either:**
- A bug (Validate accidentally generous due to the divergent rate-limit config)
- A deliberate choice (Validate is cheap to run, so generous free tier)
- Unadvertised (customers don't know they get 100/day)

**Recommended fix:** JK should decide: align with sister APIs (change window to 60s and requests to 10, matching 10/min pattern) OR keep current limits and update pricing page copy to reflect the 100/day reality. Either way, pricing copy and actual behavior should agree.

---

## Polish / consistency issues

### P1 — CORS configured (unique among sister APIs)
**File:** `lib/api-handler.ts` `handleCors()`

Validate is the ONLY API that implements CORS preflight handling and exposes `OPTIONS` endpoints. The CORS response allows `*` origin.

This enables browser-based usage (a customer can call `validate.endpnt.dev` from their own frontend JavaScript without a backend proxy). Sister APIs don't do this.

**Not a bug.** Validate's API surface (email/phone/domain validation) is frequently called from forms where browser-based usage is natural. Sister APIs are more commonly called server-to-server. However, this is ANOTHER platform-wide inconsistency — decide whether all APIs should expose CORS or only some.

### P2 — Rate-limit response headers added (unique among sister APIs)
**File:** `lib/api-handler.ts`

```ts
response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString())
```

Validate is the ONLY API setting standard `X-RateLimit-*` headers. Sister APIs put `remaining_credits` in `meta` of the response body instead.

**Industry standard is HTTP headers.** Stripe, GitHub, AWS, all use `X-RateLimit-*` or the draft-ietf-httpapi-ratelimit-headers equivalents. Validate is doing the right thing.

**Recommended fix:** Propagate this pattern to sister APIs during platform harmonization. Note in a future spec.

### P3 — `ERROR_CODES` is defined in `lib/response.ts` (not `lib/config.ts`)
Sister APIs put `ERROR_CODES` in `lib/config.ts`. Validate puts it in `lib/response.ts`. Cosmetic; response.ts does need to reference it for `ERROR_STATUS_MAP`. Not worth changing.

### P4 — `lib/config.ts` tier types don't include `starter`
```ts
export interface ApiKeyInfo {
  tier: 'free' | 'pro' | 'enterprise'
  name: string
}
```

If a key with `tier: "starter"` appears in `API_KEYS`, Validate's auth will reject it (M2 finding about the tier check). Means the platform's API_KEYS env var may have starter-tier keys that work for QR/Screenshot/Preview/Convert but are rejected by Validate.

**Recommended fix:** Either add `'starter'` to Validate's tier type and set rate limits for it, or document that Validate intentionally has no starter tier.

### P5 — `parseJsonBody` returns a different discriminated union shape than other utilities
**File:** `lib/api-handler.ts`

```ts
return { success: true, data: body }  // or { success: false, error: string }
```

Clean pattern, but different from how sister APIs throw errors. Not a bug.

---

## Security considerations

### S1 — DNS lookups against user-supplied domains (email, domain validators)
**File:** `lib/validators/email.ts` (`checkMx`), `lib/validators/domain.ts` (not read deeply)

Users can submit arbitrary domains. DNS lookups are sent to whatever resolver the Node runtime is configured with. This is technically an outbound network operation but is bounded to DNS protocol only — NOT an SSRF risk in the HTTP sense.

However, it IS a potential amplification vector: an attacker can submit many domains per request via the batch endpoint, each triggering DNS lookups. With `MAX_BATCH_SIZE = 50` and a concurrency of 10, up to 50 DNS queries per request. At scale, could annoy DNS providers or rack up resolver costs.

**Not exploitable today.** But worth monitoring if Validate gets popular.

### S2 — Batch processing concurrency limiter is reasonable
**File:** `app/api/v1/validate/batch/route.ts` (lines ~155-190)

Concurrency capped at 10. Good defense against runaway parallelism. The `Promise.allSettled` ensures a single item failure doesn't kill the whole batch.

### S3 — Email validation doesn't verify SMTP connectivity (HELO/RCPT)
**File:** `lib/validators/email.ts` `checkMx`

Validate only checks for MX records, not whether the SMTP server actually accepts mail for the specific address. This is a deliberate and correct design choice — SMTP probing is slow, often blocked, and yields unreliable results. MX-record check is what industry validation services (Mailgun, ZeroBounce, etc.) rely on for the fast tier.

**No fix needed.** Flagging for awareness if customers ask "does this verify the address is deliverable?" — the honest answer is "we verify the domain can accept mail, not the specific inbox."

### S4 — `validateDomain` does TLS certificate probes
**File:** `lib/validators/domain.ts` (not read deeply, inferred)

If `check_ssl: true`, Validate connects to port 443 of the user-supplied domain. This IS a form of limited SSRF — an attacker could submit an internal hostname and get back whether it has a cert.

**Mitigation options:**
1. DNS resolution happens first; private IP ranges would fail at the IP level
2. But DNS resolution for internal hostnames might succeed if the domain is internal-resolvable

**Recommended fix:** Verify `validateDomain` rejects private IPs in the resolved DNS result BEFORE attempting TLS. If it doesn't, add that check. Low priority since the attack surface is limited (TLS probes only return connection success + cert metadata, not arbitrary HTTP responses).

---

## Suggested fix specs (priority ordered)

1. **M4 — Double DNS lookup in email validation.** Easy perf fix, 5-line change.
2. **M5 — Free tier quota mismatch with advertised copy.** Pricing decision + doc update.
3. **S4 — Verify `validateDomain` SSRF posture.** Read `lib/validators/domain.ts` and confirm private-IP rejection.
4. **P4 — Add `starter` tier to Validate config.** Trivial if JK wants it; skip otherwise.
5. **M1, M2, M3, P1, P2 — Platform harmonization.** Large multi-repo spec, post-Cipher polish sprint. Move sister APIs toward Validate's better patterns (CORS, rate-limit headers, tier validation) rather than forcing Validate to regress.

---

## Review notes for CC review-qa-agent

When running CC's `review-qa-agent` on Validate:

1. **Read `lib/validators/domain.ts`.** I didn't. Specifically check:
   - Does the SSL certificate probe resolve DNS first, then check IP against a private-IP blocklist before connecting?
   - Are TLS errors sanitized before returning to the user? (Avoid leaking internal hostnames)
   - Is there a timeout on the TLS connection?
2. **Read `lib/validators/phone.ts`.** I didn't. Phone validation is mostly offline (libphonenumber-style lookup) so security risk is minimal, but verify:
   - No external API calls for phone validation
   - Country code handling doesn't allow injection
3. **Verify the 100/day free tier.** Run 101 requests to `/api/v1/validate/email` with a free-tier key — the 101st should return `RATE_LIMIT_EXCEEDED`. Confirm current behavior before deciding whether to change it.
4. **Double-check batch endpoint for DOS potential.** Submit a batch of 50 emails all requiring MX + SSL checks. Does it complete within the serverless function timeout? Does any single slow DNS/TLS probe block the batch excessively?
5. **Confirm CORS OPTIONS handling works** — curl with `-X OPTIONS` and `-H "Origin: https://example.com"` should return 200 with the right allow-headers.
