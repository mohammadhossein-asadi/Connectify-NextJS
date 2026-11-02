# Connectify — Improvement, Upgrade & Feature Plan

Produced from a full read of the repo, a Ponytail-style audit (reuse before writing, delete before adding), the `performance` skill's measurement-first workflow, and the UI/UX references (`ui-ux-pro-max`, `taste-skill`, `awesome-design-md`).

Every number below was measured on this machine, not estimated. Anything that could not be measured is labelled **hypothesis** and comes with the command that would settle it.

**Codebase size:** 9,616 lines in `src/` (27 files, 24 of which currently fail typecheck) + 1,855 in `server.ts`. 34 Express routes.

---

## 0. The headline finding

`npm run lint` — the project's only quality gate — **has never checked anything.**

`@types/react` and `@types/react-dom` are absent from `devDependencies`. Without them `tsc` cannot resolve JSX at all, so every element in every component is implicitly `any`. Measured: **2,640 type errors**, of which 2,392 are the `TS7026` cascade from that single missing dependency. Install the two packages and the real count drops to ~248.

This is why three separate defects have survived in the tree: `LazyImage.tsx` declares props that don't exist, `Feed.tsx` imports the same function three times, and `ErrorBoundary.tsx` never type-checks its own state. Nothing was watching.

**Fix this before any refactor.** A UI/UX migration on top of a dead typecheck is 9,600 lines of unverified edits.

```bash
npm i -D @types/react @types/react-dom
npx tsc --noEmit   # expect ~248 remaining, not 2,640
```

Then decide the gate: either fix the ~248, or set `noImplicitAny: false` in `tsconfig.json` as a **labelled** temporary (`shortcut: implicit any allowed, remove after N call sites are typed`) so the gate catches regressions from today forward without requiring a full annotation pass first.

---

## 1. Delete first (zero behaviour change, pure subtraction)

Ponytail's first rung: does it need to exist?

| # | Item | Evidence | Action | Lines saved |
|---|------|----------|--------|-------------|
| 1.1 | `src/lib/api.ts` | 64-line API client class. Imported **once** (`App.tsx:7`), **called zero times**. Meanwhile 62 raw `fetch()` calls bypass it. | Delete the import + file. If you later want the JSON content-type guard it already implements, migrate then — deleting is the smaller diff today. | 64 |
| 1.2 | `src/components/LazyImage.tsx` | Imported by nobody. Cannot type-check: `LazyImageProps` lacks `src`/`alt`/`className`. 55 raw `<img>` tags in use. | Delete. If lazy loading is wanted, use native `loading="lazy"` on the existing `<img>` tags (rung 3: platform feature). | 53 |
| 1.3 | `Feed.tsx:2,6,8` | `formatRelativeTime` imported three times, `TS2300` duplicate identifier. | Remove two lines. | 2 |
| 1.4 | `autoprefixer` | In `devDependencies`. No `postcss.config.*` exists; Tailwind v4 handles prefixing internally. | Remove from `package.json`. | — |
| 1.5 | `@types/bcryptjs@2.4.6` | `bcryptjs@3` ships its own `index.d.ts` (verified in `node_modules`). The `@types` package is a stale stub for v2. | Remove. | — |
| 1.6 | `vite` | Declared in **both** `dependencies` (`^6.2.3`) and `devDependencies` (`^6.2.3`). | Keep the `devDependencies` entry only. | — |
| 1.7 | `docs/project-dna.md` | Describes "Next.js 16, App Router, Prisma, PostgreSQL, NextAuth v5, shadcn/ui, React Query + SWR, Persian RTL, Jalali calendar". **None of that is in this repo** — it's React 19 + Vite + Express + JWT + `db.json`. | Delete or rewrite. A wrong document actively misleads every agent and contributor that reads it, including me on the first pass. | ~50 |

Total: ~170 lines and 3 dependencies removed, no behaviour change. Run `npm run build` afterwards — this is the only check these changes need.

---

## 2. Correctness and security

Ordered by damage-if-skipped, each with the reason it's not optional (Ponytail never cuts data-loss handling or security).

### 2.1 The whole database is one non-atomic `writeFileSync` — **critical**

`server.ts:438` `saveDatabase()` serialises all five collections and writes `db.json` in place, synchronously, on every mutation.

Two problems, both data loss:
- A crash or OOM mid-write truncates the file → **every user, post, story, notification and message gone**. There is no backup path; `loadDatabase()` would then silently fall back to `SEED_USERS`.
- Concurrent requests interleave writes; there is no queue and no lock.

**Fix (~3 lines, no dependency):** write to `db.json.tmp`, `fs.renameSync` over the target. Rename is atomic on the same filesystem. Then debounce saves so a burst of reactions is one write, not thirty.

**Cost of skipping:** one SIGKILL during a demo and the demo accounts are the only thing left. Handler: `server.ts:396` (`loadDatabase`) already catches JSON errors and reseeds — meaning corruption is *silent*, which is worse than a crash.

### 2.2 Rate limiting buckets all production traffic into one user — **critical**

`rateLimit()` keys on `req.ip || req.connection.remoteAddress`. `app.set('trust proxy', …)` is **never called** (verified). Behind Cloud Run / Vercel every request arrives from the proxy's IP, so all users share one 30-request/minute bucket. The site rate-limits itself under any real load, and one abuser locks out everyone.

**Fix:** `app.set('trust proxy', 1)` (one hop) so Express reads `X-Forwarded-For`. Then decide whether the login limiter should be stricter than the global one.

**Cost of skipping:** login fails for everyone the moment more than ~30 requests per minute happen globally.

### 2.3 `JWT_SECRET` silently falls back to a committed constant — **high**

`server.ts:21`: `process.env.JWT_SECRET || "connectify-dev-secret-change-in-production"`. If the env var is ever missing in production, **anyone can mint a valid token for any user id** and the app reports no error.

**Fix:** at boot, `if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw`. Three lines. Keep the dev fallback for local work.

**Cost of skipping:** total account takeover, silently, on a misconfigured deploy.

### 2.4 `getAvailablePort()` can move a production server off its assigned port — **high**

`server.ts:~1795`: scans upward from `PORT` until it finds a free port. On Cloud Run the platform routes traffic to exactly `$PORT`; a container listening elsewhere fails health checks. It also hides the real error ("port in use") behind a server that claims to be running.

**Fix:** use `PORT` as given in production; keep the scan for local dev only.

### 2.5 No Content-Security-Policy; a deprecated header is present — **medium**

`server.ts:109` sets `X-XSS-Protection: 1; mode=block`, which is deprecated and can introduce vulnerabilities in older browsers. There is no CSP. `sanitizeString()` strips tags server-side, and React escapes on render, so XSS exposure is limited — but nothing constrains injected script if a dependency is ever compromised.

**Fix:** drop `X-XSS-Protection`; add `Content-Security-Policy` with `script-src 'self'` (you'd need `'unsafe-inline'` removed, which means no inline scripts — `index.html` currently has none, good). Add `Strict-Transport-Security` for the deployed origin.

### 2.6 No tests at all, and no framework installed

Zero test files, no runner in `node_modules/.bin`. Ponytail's rule: non-trivial logic leaves one small check behind. Three functions carry real risk and deserve it:

- `sanitizeString()` — trust boundary (`server.ts:26`)
- `verifyToken()` / `generateToken()` — security (`server.ts:38`)
- `saveDatabase()` — data loss (`server.ts:438`)

**Fix:** Node's built-in `node --test` (zero new dependencies — rung 3 of the ladder). `scripts`: `"test": "node --test"`. Do not install vitest for three assertions.

---

## 3. Performance

### 3.1 Measured baseline (production build, this machine)

| Metric | Measured | Budget | Status |
|---|---|---|---|
| Initial JS (index chunk) | 364.75 KB raw / **115.09 KB gzip** | < 300 KB gz | ✅ |
| Default tab chunk (Feed) | 100.93 KB raw / **23.16 KB gzip** | — | ✅ |
| CSS | 133 KB raw / **18.28 KB gzip** | < 100 KB gz | ✅ |
| All JS chunks combined | ~586 KB raw / ~163 KB gz | — | ✅ |
| Fonts | 2 families, 7 weights, third-party | < 100 KB | ⚠️ not measured |
| Above-fold images | remote Unsplash, not measured | < 500 KB | ⚠️ not measured |

Build passes (`BUILD_EXIT=0`). Bundle weight is **not** the problem — code splitting via `React.lazy` in `App.tsx` is doing its job.

### 3.2 Fonts are a serial, render-blocking chain — **measured structure, unmeasured cost**

`src/index.css:1` is `@import url('https://fonts.googleapis.com/css2?...Inter...[400;500;600;700]&family=Space+Grotesk...[500;600;700]')`.

That is: HTML → local CSS → **third-party CSS** → font files. Two extra round trips before text can paint, on the critical path. `index.html` preconnects (lines 33–34) but has **0 preloads** (verified). `font-display: swap` is requested via the URL, which does prevent invisible text — but the fallback swap is a layout shift.

**Fix, in order of payoff:**
1. Self-host the two families as `woff2`, latin subset only, with `@font-face` + `font-display: swap`, and `<link rel="preload" as="font" crossorigin>` for the one weight used above the fold. Removes the third-party origin entirely.
2. Cheaper: move from `@import` in CSS to `<link rel="stylesheet">` in `index.html`. Still one fewer round trip, and preconnect already exists.

**Verify with:** DevTools trace on a cold cache, compare LCP and "render delay" before/after. Budget the change as a **hypothesis** until traced.

### 3.3 `transition: all 0.4s` on every input and button — **high INP risk**

`src/index.css` (~line 30) applies a transition to `html, body, header, aside, main, nav, input, textarea, select, button`, with `0.4s` on `background-color`/`border-color` and `transition` covering *all* properties on interactive controls.

There are **156 `<button>` elements** in `src/`. Every hover, focus and state change animates for 400 ms, on all properties. This delays visible focus feedback (an accessibility problem, not just a perf one) and is unnecessary paint work on the interaction path.

**Fix:** transition only `background-color`/`color`/`border-color`, drop the `0.4s` to ~150 ms for controls, and exclude `input`/`textarea` from the global rule. Verify with a trace on the Feed tab while hovering the post action bar.

### 3.4 15-second polling that never stops

`App.tsx:~100`: `setInterval(fetchPeriodicData, 15000)` fires **three** requests (notifications, stories, recommendations) per user, forever — including while the tab is hidden.

**Fix (smallest):** guard with `document.visibilityState`, and refetch on `visibilitychange`. **Better (see 6.1):** one SSE stream replaces all three polls.

### 3.5 `!important` overrides defeating Tailwind — root cause of the visual drift

`src/index.css` contains **39 `!important` declarations** in 335 lines, many of them redefining Tailwind's own utilities globally: `.bg-white`, `.rounded-2xl` (forced to 1.5rem), `.rounded-xl`, `.bg-blue-600`/`.bg-blue-500` (repainted to indigo), every `text-gray-*`/`text-zinc-*`/`text-slate-*` at four shades, and all hover states.

Consequences that matter beyond aesthetics:
- **You cannot render a real `rounded-2xl`.** The utility is globally overridden, so the design system in the code no longer means what Tailwind documents.
- `html.dark .bg-white { background: #121214 !important }` wins over any utility you add later, so component-level fixes appear to "not work".
- It is a second, invisible theme layer that every future change has to fight.

This single file is the reason the UI/UX refactor in §4 must start with token extraction, not component edits.

---

## 4. UI/UX refactor

Measured design-system drift across `src/`:

| Signal | Count | Interpretation |
|---|---|---|
| `<img>` without `alt` | **46 of 55** | Screen readers announce nothing; egregious for a photo-heavy social app |
| Text at ≤11px | **148** (91 @ 10px, 35 @ 9px, 4 @ 7px) | Below practical legibility; 7–9px fails contrast and zoom requirements |
| Hardcoded hex colours in components | 41 (23 distinct) | Bypasses any token layer |
| Indigo/purple gradient usages | 26 across 9 files | The canonical "AI slop" pattern the UI/UX references explicitly flag for social products |
| `!important` in global CSS | 39 | See §3.5 |
| `aria-*` attributes | 14 in 11,471 lines | Semantics rely almost entirely on native elements |
| `<button>` vs `onClick` on div/span | 156 vs 2 | **Good** — keep it |
| Emoji used as icons | **0** | **Already compliant** |

### 4.1 The direction

Keep what's already true and distinctive: indigo `#4f46e5` as the single accent, zinc neutrals, Inter + Space Grotesk, generous radii. That is a coherent, defensible identity.

Drop the indigo→purple gradients (26 sites) — for a social product the `ui-ux-pro-max` rule set lists "AI purple/pink gradients" as an anti-pattern outright. One accent, spent on actions and state, not on decoration.

### 4.2 Sequence (this order is not optional)

1. **Restore the typecheck** (§0). No refactor before the gate works.
2. **Write `DESIGN.md` at the repo root** — the 9-section format from `awesome-design-md` (visual theme, colour roles, type hierarchy, component states, layout/spacing, elevation, do's & don'ts, responsive, agent prompt guide). Filled with *your* values, not a copied brand's. This is the contract; every later edit is checked against it.
3. **Replace the `!important` layer with tokens.** In Tailwind v4 that means `@theme` custom properties for colour roles (`--color-accent`, `--color-surface`, `--color-border`, `--color-text-muted`) plus `@custom-variant dark`. Then delete the override blocks. This is the `ui-ux-pro-max` migration checklist verbatim: audit hard-coded values → map to semantic roles → migrate in small batches → verify.
4. **Migrate in ascending file size**, smallest first, so you learn the pattern before touching the big ones: `VerifiedBadge` (35) → `MobileNav` (71) → `Toast` (82) → `TrendingHashtags` (96) → `Sidebar` (188) → `Analytics` (189) → `Bookmarks` (200) → `AuthModal` (210) → `Navbar` (228) → `Settings` (255) → `Notifications` (267) → `MediaGallery` (323) → `Messages` (400) → `StoriesModal` (409) → `App` (484) → `StoriesList` (540) → `ImageEditorModal` (838) → `PostCreate` (889) → `Profile` (947) → `Explore` (1133) → `Feed` (1469).
5. **Fix the three accessibility defects as part of each batch**, not as a separate project: `alt` on every `<img>` (46 missing), raise the 9–10px text to ≥12px, and let the global `:focus-visible` rule do its job once §3.3 stops delaying it.
6. **Verify each batch** with `taste-skill`'s browser check at 375 / 768 / 1024 / 1440 px, plus contrast ≥ 4.5:1 in **both** modes, before moving on. That tool is the design-side test suite; use it the same way you use `tsc`.

### 4.3 What not to do

Do not create a parallel theme system next to the `!important` layer. Do not restyle the 1,469-line `Feed.tsx` first. Do not adopt a component library — there are already 156 hand-rolled buttons with consistent intent; the problem is tokens, not components.

Files above ~800 lines (`ImageEditorModal`, `PostCreate`, `Profile`, `Explore`, `Feed` — 5,276 lines total, 55% of `src/`) are **split candidates**, not refactor-first candidates. Split them after tokens land, so the split doesn't have to be done twice.

---

## 5. Upgrade path

| Package | Installed | Note |
|---|---|---|
| `express` | **4.22.2** | `package.json` says `^4.21.2`. Upgrade within v4 freely. **Express 5 would break `app.get("*")`** at `server.ts:~1800` — path-to-regexp no longer accepts a bare `*`. Migrate that route to `/(.*)` or a named wildcard in the same commit, or don't migrate. |
| `react` / `react-dom` | 19.0.1 | Patch/minor upgrades are safe. |
| `vite` | 6.2.3 | v7 is a major. Do it separately, after §0 and §2, so nothing else is in flight. |
| `typescript` | 5.8.2 | Fine. Add `@types/react`, `@types/react-dom` (§0). |
| `motion` | 12.23.24 | Fine. |
| `lucide-react` | 0.546.0 | Each icon currently ships as its **own tiny chunk** (24 chunks under 1 KB in `dist`). Harmless over HTTP/2, but verify your host serves HTTP/2 — otherwise consider importing from the package root once. |

Remove: `autoprefixer`, `@types/bcryptjs`. De-duplicate: `vite`.

---

## 6. Feature roadmap

Ordered by value ÷ new-code. Each one reuses something that already exists, per the ladder.

**6.1 Real-time messaging without a new dependency** — *replaces* code rather than adding it. Add one `GET /api/events` SSE endpoint (`Content-Type: text/event-stream`, native `EventSource` in the browser). It replaces the 15-second poll in `App.tsx` entirely: minus 3 requests/user/15s, minus the polling effect, plus instant messages and notifications. No socket library, no new dep.

**6.2 Server-side search** — `/api/posts?q=` filtering over the in-memory array you already have, plus the existing `searchQuery` state in `App.tsx`. The UI and state already exist; only the query parameter is missing. Do not add a search service.

**6.3 Content moderation** — claimed in `metadata.json` (`"content moderation"`) but absent from the code. `sanitizeString()` already exists; add a word-list check inside it rather than a new module.

**6.4 Token revocation / refresh** — currently a 7-day JWT with no way to revoke. Add a `tokenVersion` integer per user, bumped on logout-all/password change, checked in `authMiddleware`. Roughly 10 lines total across `types.ts` and `server.ts`.

**6.5 Replace `db.json` with SQLite** — only if you want persistence you can trust. `node:sqlite` is built into Node 22+, so it is still zero new dependencies, and it removes §2.1's whole-file rewrite class of bug permanently. Indexes on `posts.userId` and `messages.recipientId` make the feed and inbox queries O(log n) instead of full scans.

**6.6 Explicitly not planned:** PWA/offline, a component library, a state-management library, a chart library (`Analytics.tsx` is 189 lines and has no chart dependency — keep it that way), and any new CSS framework. All of these are net additions to a codebase whose main problem is drift, not missing capability.

---

## 7. Suggested execution order

| Phase | Work | Gate before moving on |
|---|---|---|
| **0** | Add `@types/react` + `@types/react-dom`; triage the ~248 real type errors | `npm run lint` exits 0 (or has a labelled, documented threshold) |
| **1** | §1 deletions | `npm run build` exits 0; bundle shrinks |
| **2** | §2.1 atomic save, §2.2 `trust proxy`, §2.3 secret guard, §2.4 port | Manual: two concurrent POSTs don't corrupt `db.json` |
| **3** | §2.6 three `node --test` tests for save/auth/sanitize | `npm test` exits 0 |
| **4** | §3.3 transition fix, §3.4 visibility guard, §3.2 font loading | DevTools trace: LCP + long tasks before/after, same conditions |
| **5** | `DESIGN.md`, then token layer replacing the 39 `!important` rules | Both themes render; no utility silently overridden |
| **6** | Component migration, ascending size, a11y fixed per batch | 375/768/1024/1440 + contrast 4.5:1 + focus visible |
| **7** | §6.1 SSE (deletes the polling loop), then §6.2 | Messages arrive without reload; network tab shows no 15s polls |

Phases 0–4 are low-risk and independent of any design decision. Phase 5 onward is where the visual product changes, and it needs your sign-off on the direction in §4.1.

---

## 8. Method notes

- Typecheck, build and bundle figures come from `npx tsc --noEmit`, `npm run build`, and `gzip -c` over `dist/assets/*`, run on this machine against the current working tree.
- Design-drift counts come from `grep` over `src/**/*.tsx` and `src/index.css` — reproducible, and deliberately not eyeballed.
- Font cost, LCP, INP and third-party weight are **hypotheses**, not measurements. Settling them needs a cold-cache DevTools trace of the running app; the commands are given inline above.
- No runtime performance claim in this document has been verified against a running server. Phases 4 and 7 should be measured before and after, under identical conditions.
