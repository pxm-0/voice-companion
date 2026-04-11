# Eli — Handoff

Last updated: 2026-04-12 (UI v2 upgrade)

## Project Snapshot

Eli is a cozy voice journaling companion built on OpenAI Realtime WebRTC.

The core architecture is fully in place across four layers:
- **Voice transport** — live WebRTC conversation with OpenAI Realtime
- **Behavior layer** — emotion/intent detection drives live session.update calls during conversation
- **Memory evolution** — atomic memory with weight/decay, pattern summaries, and a slow-changing profile
- **Journal artifacts** — saved session entries with vivid titles, bullet-journal bullets, and structured action items

The product identity is a personal voice companion named Eli. Not a chatbot with memory. Not therapy-lite. A system that continuously evolves its understanding of the user.

---

## Current Status

**Deployed to Vercel. Auth live (Google + GitHub). Phase 1 UX state machine complete. UI v2 redesign applied.**

### What Is Done

| Feature | Status |
|---|---|
| Voice WebRTC session | ✓ |
| Journal artifact pipeline (finalize, summary, tasks) | ✓ |
| Memory extraction — live (every 5 turns) | ✓ |
| Memory extraction — post-session | ✓ |
| Memory weight/decay system | ✓ |
| Brain instructions (3-layer: profile + pattern + atomic) | ✓ |
| Behavior layer (state.ts → turn.ts → session.update) | ✓ |
| Session pre-create (IN_PROGRESS on connect) | ✓ |
| Session attribution (sessionId threaded through extraction) | ✓ |
| Multi-tenant auth (NextAuth, userId scoping on all routes) | ✓ |
| Login page (Google + GitHub OAuth) | ✓ |
| All pages + API routes auth-gated | ✓ |
| Rebrand to "Eli" (UI + AI identity) | ✓ |
| Today hub redesign (greeting, orb, session overlay, mode pill) | ✓ |
| Landing page (atmospheric, public-facing) | ✓ |
| Voice preference setting (user-selectable, profile page) | ✓ |
| Schema migrated to Postgres (`postgresql` provider) | ✓ |
| Neon DB provisioned via Vercel Marketplace | ✓ |
| Postgres migration file created (`20260408062302_init`) | ✓ |
| `eli_store_DATABASE_URL` wired in `prisma/schema.prisma` | ✓ |
| `GOOGLE_ID` + `GOOGLE_SECRET` added to Vercel env | ✓ |
| `AUTH_SECRET` set in Vercel env | ✓ |
| `OPENAI_API_KEY` set in Vercel env | ✓ |
| `prisma migrate deploy` run against Neon | ✓ |
| `GITHUB_ID` + `GITHUB_SECRET` added to Vercel env | ✓ |
| Google OAuth redirect URIs configured (both domains) | ✓ |
| **Today page state machine (idle/connecting/listening/processing/responding)** | ✓ |
| **Processing overlay (orb spins while AI drafts entry)** | ✓ |
| **Staggered reveal (summary → bullets at 1.2s + task ping at 2.2s)** | ✓ |
| **"Start anywhere." idle prompt** | ✓ |
| **Animation polish: easing tokens, overlay enter/exit, page transitions, press states** | ✓ |
| **UI v2 redesign: Outfit font, editorial nav, divider task list, reduced radii, mode selector** | ✓ |
| **Journal hierarchy (Week > Day > Sessions)** | ✓ |
| **Daily AI summary (current week only)** | ✓ |
| **Weekly intelligence summary** | ✓ |
| **Day-level task aggregation (deduplicated)** | ✓ |
| **Profile restructure (Patterns / Inferred Goals / Memory Fragments)** | ✓ |

---

## Next Steps (in order)

### Step 1 — Phase 3: Mode behavior + visual layer (v2.3 / v2.4)

Wire mode selector to timing/orb behavior in turn.ts and add CSS custom property layer for per-mode spacing/density/motion. See plan: `docs/superpowers/plans/2026-04-11-journal-profile-intelligence.md` (end section: "What This Plan Does NOT Cover").

---

### Step 2 — Phase 4: Settings page + VAD wiring (low effort)

`getTimingConfig()` in `lib/timing.ts` is not yet passed into the `turn_detection` field of `session.update`. The behavior layer fires correctly without it; this is a tuning optimization for silence detection thresholds.

---

## Local Development

### Without OAuth credentials

Auth is wired for production but OAuth creds may not be set up locally. To bypass:

1. Add to `.env.local`:
   ```
   SKIP_AUTH_FOR_DEV=true
   BETTER_AUTH_SECRET=any-random-string
   ```

2. Seed the mock dev user into the DB (required for FK constraints):
   ```bash
   npx prisma studio
   ```
   In `User` table, add: `id: dev-user-001`, `email: dev@localhost`, `name: Dev User`

3. Run: `npm run dev`

The bypass is in `lib/auth.ts` — gated on `SKIP_AUTH_FOR_DEV=true`, never activates in production.

### Useful commands

```bash
npm run dev
npx prisma studio                      # browse/edit DB
npx prisma db push                     # sync schema without migration
npx prisma migrate dev --name <name>   # create a migration
npx prisma migrate deploy              # apply migrations to remote DB
npx prisma generate                    # regenerate client after schema change
npx tsc --noEmit                       # type check
npm run build                          # full build verification
vercel env pull .env.local             # pull Vercel env vars locally
```

---

## Architecture

### Frontend surfaces
- `/` — **branches on auth**: landing page (unauthenticated) or Today hub (authenticated)
- `/login` — Google + GitHub OAuth sign-in
- `/sessions` — archive of saved journal entries
- `/sessions/[id]` — single journal entry with artifact/task editing and transcript
- `/profile` — rolling summary + durable memories with edit/pin/archive

**Landing page** (`app/_components/landing.tsx`): full-height hero with breathing orb, Georgia serif wordmark, asymmetric 3-column feature grid (01/02/03), dark pull-quote section, CTA. Public, no auth required. AppNav is hidden for all unauthenticated routes.

### API routes
- `POST /api/realtime` — exchanges SDP with OpenAI Realtime, injects brain instructions
- `POST /api/sessions/start` — pre-creates IN_PROGRESS session on voice connect
- `POST /api/sessions/finalize` — saves voice sessions, generates artifact + memory
- `POST /api/sessions/manual` — converts manual text log into the same finalize pipeline
- `GET /api/sessions` — session list
- `GET/PATCH /api/sessions/[id]` — session detail + artifact patch
- `PATCH /api/tasks/[id]` — task completion/edit
- `GET /api/profile` — profile/memory read
- `PATCH /api/profile/memories/[id]` — memory pin/archive/edit
- `POST /api/memory/extract` — live mid-session memory extraction (called every 5 turns)
- `GET|POST /api/auth/[...nextauth]` — NextAuth handler

### Persistence
Prisma + Neon Postgres (`eli_store_DATABASE_URL`). Migration file committed; run `prisma migrate deploy` to apply to Neon.

Models: `JournalSession`, `SessionTurn`, `SessionArtifact`, `Task`, `ProfileMemory`, `ProfileSnapshot`, `User`, `Account`, `Session` (NextAuth), `VerificationToken`

---

## How The Memory System Works

### Three time scales

```
Atomic memory     → fast-changing    (weight evolves per session)
Pattern summary   → medium stability (one sentence, per session)
Profile           → slow-changing    (rolling paragraph, cumulative)
```

### Live extraction
- Every 5 user turns → `extraction:tick` event fires
- `sessionId` threaded from session pre-create through the extraction pipeline
- Hits `/api/memory/extract` → AI extracts normalized signals → `upsertMemories()`
- Memory evolves *during* the conversation, not just after

### Weight evolution
- New memory: `weight=1.0`, `seenCount=1`
- Same signal again: `weight += 0.5` (cap 5.0), `seenCount++`
- Pinned: recency updated, weight preserved

### Decay
- Non-blocking after every session finalize
- `newWeight = weight * 0.85 ^ weeksInactive` (1 week grace)
- Below 0.15 → deactivated (soft delete)

### Brain injection
- `getMemoriesForBrain(5)` — sorted: pinned > weight > recency
- Profile summary → stable identity layer
- Pattern summary → last session arc
- Top 5 weighted memories → fast-changing atomic signals

---

## How The Behavior Layer Works

```
User turn arrives
  → state.ts detects emotion (low/neutral/high) + intent (vent/reflect/ask/casual)
  → turn.ts returns TurnGuidance { shouldRespond, shouldAskQuestion, shouldSuppressResponse, responseStyle, suggestedDelay }
  → handlers.ts fires turn:guidance CustomEvent
  → useRealtime.ts listener:
      - if shouldSuppressResponse → sends response.cancel to OpenAI
      - else → builds instruction fragment via buildInstructionFragment(responseStyle)
      - sends paced session.update after suggestedDelay ms
      - deduplication guard: skips if responseStyle unchanged from last update
```

Response styles: `reflective` | `collaborative` | `brief` | `silent`

---

## How The Session Lifecycle Works

```
User connects voice
  → POST /api/sessions/start → creates JournalSession { status: IN_PROGRESS }
  → sessionId stored in client, threaded through extraction:tick events

Every 5 user turns
  → extraction:tick fires with sessionId
  → POST /api/memory/extract → upsertMemories(userId, sessionId, ...)

User ends session
  → client sends turns + sessionId to POST /api/sessions/finalize
  → finalizeSession updates existing IN_PROGRESS record (or creates fresh for manual)
  → AI generates structured artifact (title, summary, mood, themes, bullets, tasks)
  → upsertMemories() again with full session context
  → decayMemories() non-blocking
  → prunes transcripts older than latest 5
```

---

## Current Model Split

| Role | Model |
|---|---|
| Realtime voice conversation | `gpt-realtime-mini` |
| Signal extraction (live + post-session) | `gpt-5.4-nano` |
| Post-session summary + artifact | `OPENAI_SUMMARY_MODEL` (default: `gpt-5.4-nano`) |

---

## Important Files

### Core product UI
- `app/page.tsx` + `app/_components/today-hub.tsx`
- `app/sessions/page.tsx` + `app/sessions/[id]/page.tsx`
- `app/profile/page.tsx`
- `app/login/page.tsx`
- `app/_components/app-nav.tsx`

### Editing surfaces
- `app/_components/session-artifact-editor.tsx`
- `app/_components/task-list.tsx`
- `app/_components/memory-list.tsx`

### Realtime stack
- `app/api/realtime/route.ts`
- `app/realtime/client.ts`
- `app/realtime/useRealtime.ts`
- `app/realtime/handlers.ts`
- `app/realtime/types.ts`

### Behavior + brain layer
- `lib/state.ts` — emotion + intent detection
- `lib/turn.ts` — TurnGuidance per state + mode
- `lib/timing.ts` — silence threshold + response delay (not yet wired to VAD)
- `lib/brain.ts` — 3-layer system instruction builder (AI identifies as "Eli")
- `lib/memory.ts` — upsert/decay/read for ProfileMemory
- `lib/extractor.ts` — AI signal extractor

### Auth
- `lib/auth.ts` — NextAuth export (with dev bypass)
- `lib/auth.config.ts` — providers + JWT strategy
- `middleware.ts` — route protection

### Session pipeline
- `lib/session-finalizer.ts` — all DB ops: start, finalize, queries
- `lib/session-types.ts`
- `lib/prisma.ts`
- `prisma/schema.prisma`

---

## Environment Variables

### Already set in Vercel (via Marketplace / manual)
- `OPENAI_API_KEY` ✓
- `eli_store_DATABASE_URL` ✓ (+ all other `eli_store_*` Neon vars)
- `AUTH_SECRET` ✓
- `GOOGLE_ID` + `GOOGLE_SECRET` ✓

### Still missing from Vercel
- `GITHUB_ID` + `GITHUB_SECRET` — add via `vercel env add`

### Env var names the code expects (`lib/auth.config.ts`)
- Google: `GOOGLE_ID` / `GOOGLE_SECRET`
- GitHub: `GITHUB_ID` / `GITHUB_SECRET`
- DB: `eli_store_DATABASE_URL` (set in `prisma/schema.prisma`)
- NextAuth: `AUTH_SECRET`

### Optional
- `OPENAI_SUMMARY_MODEL` (defaults to `gpt-5.4-nano`)
- `SKIP_AUTH_FOR_DEV=true` (local dev only, never in production)

### Not needed on Vercel
- `NEXTAUTH_URL` — Vercel infers from deployment URL automatically
- `BETTER_AUTH_SECRET` — leftover from earlier iteration, not read by code

---

## Validation Status

Last full build: 2026-04-12
- `npx tsc --noEmit` ✓ (zero errors)
- `npm run build` ✓ (all 18 routes)
- Deployed to Vercel ✓
- Landing page live at `/` for unauthenticated visitors
- Auth: Google + GitHub OAuth live
- Neon DB: provisioned + migration deployed
- Phase 1 state machine: implemented + build verified
- UI v2 redesign: type-checked and verified

---

## UI Design System (v2)

Applied per `ui_v2.md` spec + skill stack (design-taste-frontend + minimalist-ui + redesign-existing-projects).

### Token layer (`app/globals.css`)
CSS custom properties drive all color/spacing/radius decisions:
- **Palette**: warm off-white canvas `#faf7f3`, surface `#fefcf8`, border `#e5d9ca`
- **Text**: body `#3a2c22`, muted `#7d6959`, faint `#a89484`, accent `#9c6648`
- **Radius**: `--radius-sm` 6px / `--radius-md` 10px / `--radius-lg` 16px (all cards use `rounded-xl` = 12px)
- **Motion**: `--ease-out-strong`, `--ease-in-out-sine` — all animations reference these

### Typography
- **Body/UI**: `Outfit` (Google Fonts, loaded via `next/font/google`) — replaces Avenir Next system stack
- **Headings**: `Georgia` serif — intentional for Eli's warm, reflective persona
- All display headings use `tracking-tight`

### Component patterns
- **Nav**: plain text links, active = `font-medium` weight. No nested pills.
- **Task list**: `divide-y` divider list, no card boxes. Empty state = plain text.
- **Session entries**: `rounded-xl` card with border hover transition (no shadow, no lift)
- **Mode selector**: text button + chevron, dropdown `rounded-xl py-1`
- **CTAs**: `rounded-lg` (not pill), deep brown `#3a2c22` primary, terracotta `#9c6648` secondary
- **Tags/badges**: flat square border labels, not pill shapes

### Key decisions
- Warm palette preserved (fits Eli's product soul) — minimalist-ui cold-white aesthetic adapted to the existing warm direction
- `hover-lift` (animates `translateY`) removed everywhere — replaced with border color transitions
- `min-h-screen` → `min-h-[100dvh]` on landing (iOS Safari viewport fix)
- Title Case section headers → sentence case throughout

---

## Known Issues

### 1. FK error for dev mock user (local only)
Creating a voice session locally fails with a foreign key constraint if the dev user (`dev-user-001`) doesn't exist in the `User` table. Fix: seed via Prisma Studio.

### 2. Phase 4 (timing.ts VAD) not wired
`getTimingConfig()` from `lib/timing.ts` is not yet passed into session.update's `turn_detection` field. Behavior layer fires correctly; this is a tuning optimization only.

### 3. Turbopack workspace-root warning
Non-blocking build warning about multiple lockfiles. Does not affect runtime.
