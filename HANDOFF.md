# Eli — Handoff

Last updated: 2026-04-07

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

**Deployed to Vercel. Backend is broken — SQLite cannot run on Vercel serverless.** The DB must be migrated to Postgres before the deployed version works. All other systems are functionally complete.

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
| Voice preference setting (user-selectable) | Planned |
| **Database: Postgres migration** | **Blocking** |
| OAuth credentials wired in Vercel env | Not done |

---

## Next Steps (in order)

### Step 1 — Migrate database to Postgres (BLOCKING for production)

**Why:** Vercel serverless functions have no persistent filesystem. SQLite (`file:./dev.db`) doesn't exist on Vercel. Every API call to the DB fails on deploy.

**How:**

1. Provision a Postgres database. Recommended: **Neon** via Vercel Marketplace (free tier, auto-provisions `DATABASE_URL` in Vercel env).
   - Vercel dashboard → Storage → Browse Marketplace → Neon
   - After provisioning, `DATABASE_URL` is set in Vercel env automatically for all environments

2. Change `prisma/schema.prisma` datasource provider:
   ```diff
   datasource db {
   -  provider = "sqlite"
   +  provider = "postgresql"
      url      = env("DATABASE_URL")
   }
   ```

3. Generate a migration from the current schema:
   ```bash
   npx prisma migrate dev --name init
   ```
   This creates `prisma/migrations/` with SQL that Vercel will apply.

4. Pull the Vercel Postgres `DATABASE_URL` locally to test:
   ```bash
   vercel env pull .env.local
   ```

5. Run the migration against the remote Postgres DB:
   ```bash
   npx prisma migrate deploy
   ```

6. Redeploy:
   ```bash
   vercel --prod
   ```

**Prisma schema changes needed beyond provider:** None expected. The current schema uses no SQLite-specific types. All field types (`String`, `DateTime`, `Boolean`, `Int`, `Float`, enums) map cleanly to Postgres.

**Local dev after migration:** Keep a local `.env` pointing to the SQLite file for fast iteration, or use Neon's branch feature to get a separate dev database. If keeping SQLite locally, the `provider` line will need to stay `"sqlite"` in the local schema or you'll need to configure a dev DATABASE_URL separately.

---

### Step 2 — Wire OAuth credentials in Vercel env

Needed for production login to work:
- `GOOGLE_ID` + `GOOGLE_SECRET` — Google Cloud Console → OAuth 2.0 Client
  - Authorized redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
- `GITHUB_ID` + `GITHUB_SECRET` — GitHub → Settings → Developer settings → OAuth Apps
  - Callback URL: `https://your-domain.vercel.app/api/auth/callback/github`
- `BETTER_AUTH_SECRET` — already in `.env`, confirm it's set in Vercel env
- `NEXTAUTH_URL` — set to the production domain in Vercel env (Production only; not needed for Preview)

Add via Vercel dashboard → Settings → Environment Variables, or:
```bash
vercel env add GOOGLE_ID
vercel env add GOOGLE_SECRET
# etc.
```

---

### Step 3 — Voice preference selector (planned feature, not blocking)

Plan file: `/Users/oreo/.claude/plans/mellow-napping-nest.md`

What's needed:
- Add `voicePreference String @default("ash")` to `User` model in `prisma/schema.prisma`
- New `PATCH /api/profile/settings` endpoint — reads/writes `voicePreference` on `User`
- `VoiceSettings` client component on `/profile` page — dropdown of available OpenAI Realtime voices
- `app/api/realtime/route.ts` — read `voicePreference` from user record instead of hardcoded value
- One migration: `npx prisma migrate dev --name add_voice_preference`

---

### Step 4 — Phase 4: wire timing.ts VAD tuning (optional, not blocking)

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

2. Seed the mock dev user into SQLite (required for FK constraints):
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
- `/` — Today: greeting, voice orb, mode selector, session overlay, post-session card, today's entries, open tasks
- `/sessions` — archive of saved journal entries
- `/sessions/[id]` — single journal entry with artifact/task editing and transcript
- `/profile` — rolling summary + durable memories with edit/pin/archive
- `/login` — Google + GitHub OAuth sign-in

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
Prisma + SQLite locally (`prisma/dev.db`). **Must migrate to Postgres for Vercel.**

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

### Required for production
- `OPENAI_API_KEY`
- `DATABASE_URL` — Postgres connection string (Neon recommended)
- `BETTER_AUTH_SECRET`
- `GOOGLE_ID` + `GOOGLE_SECRET`
- `GITHUB_ID` + `GITHUB_SECRET`

### Optional
- `OPENAI_SUMMARY_MODEL` (defaults to `gpt-5.4-nano`)
- `SKIP_AUTH_FOR_DEV=true` (local dev only, never in production)

### Not needed on Vercel
- `NEXTAUTH_URL` — Vercel infers from deployment URL automatically

---

## Validation Status

Last full build: 2026-04-07
- `npx tsc --noEmit` ✓ (zero errors)
- `npm run build` ✓ (17 routes)
- Deployed to Vercel ✓ (frontend loads)
- Backend/DB: broken until Postgres migration

---

## Known Issues

### 1. SQLite on Vercel (BLOCKING)
All API routes that touch the DB fail on Vercel. Fix: Postgres migration (see Next Steps Step 1).

### 2. OAuth not configured in Vercel env
Login will fail on the deployed version until Google/GitHub credentials are added to Vercel environment variables with correct redirect URIs.

### 3. FK error for dev mock user (local only)
Creating a voice session locally fails with a foreign key constraint if the dev user (`dev-user-001`) doesn't exist in the `User` table. Fix: seed via Prisma Studio.

### 4. Phase 4 (timing.ts VAD) not wired
`getTimingConfig()` from `lib/timing.ts` is not yet passed into session.update's `turn_detection` field. Behavior layer fires correctly; this is a tuning optimization only.

### 5. Turbopack workspace-root warning
Non-blocking build warning about multiple lockfiles. Does not affect runtime.
