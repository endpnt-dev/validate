# BUGS.md — Validation API Bug Tracker

**Scope:** Bugs specific to the Validation API (`validate.endpnt.dev`). Cross-cutting bugs live at `../BUGS.md`.

**ID prefix:** `V-NNN` (sequential, do not reuse).

**Last updated:** 2026-04-24.

---

## Open bugs

### V-001 — Rate-limit algorithm and config shape divergence

- **Severity:** Low (functionally equivalent to customers; tech debt)
- **Files:** `lib/rate-limit.ts`, `lib/config.ts`
- **Discovered:** Pre-2026-04-24 (documented extensively in `validate/CLAUDE.md`)
- **Symptom:** Validate uses `Ratelimit.fixedWindow()` with a `{ requests, window }` config shape. All other APIs on the platform use `Ratelimit.slidingWindow()` with a `{ requests_per_minute, requests_per_month }` shape.
- **Root cause:** Validate was built before the rate-limit conventions were standardized. Items 1 and 2 (algorithm + config shape) are genuinely coupled — the algorithm constructor consumes the shape — so they must be fixed together.
- **Impact:** Customer-visible behavior is functionally equivalent. Internally, Validate's code has a different surface area than its peers, making shared refactors harder.
- **Fix approach:** Coordinated spec (see `validate/CLAUDE.md` "The coupling rule"). Replace algorithm + config shape together. Also address item items 3/4 history in that same spec if not yet done. Do NOT attempt partial fixes.
- **Status:** Open. Explicitly deferred. Not a launch blocker. Validate's CLAUDE.md has firm guardrails against opportunistic fixes.

### V-002 — Phone field input visibility (docs page)

- **Severity:** Low
- **File:** Validate docs page (verify exact path when picking up the fix)
- **Discovered:** Pre-2026-04-24 (captured in userMemories as "Validation docs page: phone field input visibility partially fixed")
- **Symptom:** On the docs/try-it page for the phone validation endpoint, the phone number input field has visibility issues (light text on light background, insufficient contrast, or similar). Note from userMemories: "partially fixed" — so some progress has been made but the fix is incomplete.
- **Root cause:** Likely a styling issue from the landing-page scaffolding where the phone input's contrast wasn't tuned for the live docs-page theme.
- **Impact:** Users trying to test phone validation in the docs demo can't see what they're typing. Not functionally blocking but embarrassing.
- **Fix approach:** Review current state of the input field styling. Verify against the documented target (WCAG AA contrast minimum). Adjust `color`, `background-color`, or `border` in the relevant CSS / Tailwind class.
- **Status:** Open (partial fix applied). Bundle with frontend polish pass.

### V-003 — Stale disposable-email domain list

- **Severity:** Low (wrong-answer bug class)
- **File:** `data/` folder (likely `data/disposable-domains.json`)
- **Discovered:** Pre-2026-04-24 (flagged in `validate/CLAUDE.md`)
- **Symptom:** The disposable-email detection relies on a static JSON list. List freshness is unknown — likely stale relative to the disposable-email ecosystem, which adds and removes domains frequently.
- **Root cause:** No refresh mechanism. List was baked in at initial build time.
- **Impact:** False negatives — emails from newly-popular disposable providers will be classified as legitimate. Customers relying on disposable detection for fraud prevention get stale results.
- **Fix approach:** Options:
  1. Build-time refresh — a pre-deploy step that pulls from the `disposable-email-domains` npm package. Simple but requires remembering to rebuild.
  2. Runtime refresh — lazily fetch the list on cold start from a CDN, cache in memory for the function's lifetime. More complex but more reliable.
  3. Hybrid — ship a baseline list, periodically rebuild.
- **Status:** Open. No active spec. Not a launch blocker — disposable detection is an opt-in flag, not a default.

---

## Resolved bugs

### V-004 — Next.js config has deprecated and invalid keys

- **Originally:** Medium, discovered Pre-2026-04-24 (flagged in `validate/CLAUDE.md`)
- **Resolved:** 2026-04-24 (confirmed resolved by biweekly code health audit)
- **Resolution commit:** Unknown — actual fix date not tracked in git history; confirmed absent by audit reading `next.config.js` directly
- **What changed:** `next.config.js` is now `{ output: 'standalone' }` with no `appDir`, no top-level `runtime`, no deprecated or invalid keys. Each DNS-dependent route has `export const runtime = 'nodejs'` in its route file.
- **Verification:** Biweekly code health audit 2026-04-24 read `next.config.js` directly and confirmed correct, minimal Next 14 config throughout. Cross-reference: `../BUGS.md#P-001` (convert C-005 and PDF-002 also confirmed resolved this audit).
