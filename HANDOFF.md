# Companion Journal Handoff

Last updated: 2026-04-07

## Project Snapshot

Companion Journal is a cozy voice journaling app built on OpenAI Realtime WebRTC.

The core architecture is fully in place across four layers:
- **Voice transport** — live WebRTC conversation with OpenAI Realtime
- **Behavior layer** — emotion/intent detection drives live session.update calls during conversation
- **Memory evolution** — atomic memory with weight/decay, pattern summaries, and a slow-changing profile
- **Journal artifacts** — saved session entries with vivid titles, bullet-journal bullets, and structured action items

The product direction is a cozy second-brain + journaling companion. Not a chatbot with memory. Not therapy-lite. A system that continuously evolves its understanding of the user.

---

## Current Status

**Phases 1–3 are complete and pushed to main.** The system is functionally complete for a logged-in user. What remains is deployment (OAuth credentials + hosting) and one planned UX feature (voice preference selector).

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
| handlers.ts split from client.ts | ✓ |
| Session pre-create (IN_PROGRESS on connect) | ✓ |
| Session attribution (sessionId threaded through extraction) | ✓ |
| Multi-tenant auth (NextAuth, userId scoping on all routes) | ✓ |
| Login page (Google + GitHub OAuth) | ✓ |
| All pages + API routes auth-gated | ✓ |
| Voice preference setting (user-selectable) | Planned |
| Deployment | Not started |

### What Remains

**1. Voice preference selector** (planned, not started)
- Add `voicePreference String @default("marin")` to User schema
- New `PATCH /api/profile/settings` endpoint
- `VoiceSettings` client component on profile page
- Realtime route reads from user record instead of hardcoded `"marin"`
- Plan file: `/Users/oreo/.claude/plans/mellow-napping-nest.md`

**2. Deployment**
- Platform: not decided (Vercel is natural fit for Next.js)
- Needs: real `NEXTAUTH_SECRET`, Google + GitHub OAuth credentials with production redirect URIs
- Database: SQLite is fine for 5–10 users; no Postgres migration needed

**3. Phase 4 (optional)**
- Wire `timing.ts` `getTimingConfig()` into session.update `turn_detection` field for VAD optimization

---

## Local Development

### Getting unblocked without OAuth credentials

Auth is wired for production but OAuth creds aren't set up yet. To test locally:

1. Add to `.env.local`:
   ```
   SKIP_AUTH_FOR_DEV=true
   NEXTAUTH_SECRET=any-random-string
   NEXTAUTH_URL=http://localhost:3000
   ```

2. Seed the mock dev user into SQLite (required for FK constraints):
   ```bash
   npx prisma studio
   ```
   In `User` table, add a row: `id: dev-user-001`, `email: dev@localhost`, `name: Dev User`

3. Run: `npm run dev`

The mock auth bypass is in `lib/auth.ts` — gated on `SKIP_AUTH_FOR_DEV=true` so it never activates in production.

### Useful commands

```bash
npm run dev
npx prisma studio        # browse/edit DB
npx prisma db push       # sync schema changes
npx prisma generate      # regenerate client after schema change
npx tsc --noEmit         # type check
npm run build            # full build verification
```

---

## Architecture

### Frontend surfaces
- `/` — Today Hub: voice capture, manual quick log, today's sessions, open tasks, top memory snapshot
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
Prisma + SQLite (`prisma/dev.db`).

Models: `JournalSession`, `SessionTurn`, `SessionArtifact`, `Task`, `ProfileMemory`, `ProfileSnapshot`, `User`, `Account`, `Session` (NextAuth), `VerificationToken`

---

## How The Memory System Works

### Three time scales

```
Atomic memory     → fast-changing    (weight evolves per session)
Pattern summary   → medium stability (one sentence, per session)
Profile           → slow-changing    (rolling paragraph, cumulative)
```

### Live extraction (new in Phase 2)
- Every 5 user turns → `extraction:tick` event fires
- `sessionId` is threaded from session pre-create through the extraction pipeline
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

## How The Behavior Layer Works (Phase 3)

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
- `lib/timing.ts` — silence threshold + response delay
- `lib/brain.ts` — 3-layer system instruction builder
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

Required:
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_ID` + `GOOGLE_SECRET` (for production)
- `GITHUB_ID` + `GITHUB_SECRET` (optional, dev convenience)

Optional:
- `OPENAI_SUMMARY_MODEL` (defaults to `gpt-5.4-nano`)
- `DATABASE_URL` (defaults to SQLite `file:./dev.db`)
- `SKIP_AUTH_FOR_DEV=true` (local dev only, never in production)

---

## Validation Status

Last full build: 2026-04-07
- `npx prisma db push` ✓
- `npx prisma generate` ✓
- `npx tsc --noEmit` ✓ (zero errors)
- `npm run build` ✓ (17 routes)

---

## Known Issues

### 1. FK error for dev mock user
Creating a voice session fails with a foreign key constraint if the dev user (`dev-user-001`) doesn't exist in the `User` table. Fix: seed via Prisma Studio (see Local Development above).

### 2. OAuth not configured locally
Google and GitHub OAuth credentials aren't set up. Use `SKIP_AUTH_FOR_DEV=true` for local testing.

### 3. Turbopack workspace-root warning
Non-blocking build warning about multiple lockfiles. Does not affect runtime.

### 4. Phase 4 (timing.ts VAD) not wired
`getTimingConfig()` from `lib/timing.ts` is not yet passed into session.update's `turn_detection` field. The behavior layer fires correctly; this is a tuning optimization only.

### 5. README is outdated
Still the default create-next-app file.
