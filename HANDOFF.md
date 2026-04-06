# Companion Journal Handoff

Last updated: 2026-04-06

## Project Snapshot

Companion Journal is a cozy voice journaling app built on OpenAI Realtime WebRTC.

The core architecture is now in place across three layers:
- **Voice transport** — live WebRTC conversation with OpenAI Realtime
- **Memory evolution** — atomic memory with weight/decay, pattern summaries, and a slow-changing profile
- **Journal artifacts** — saved session entries with vivid titles, bullet-journal bullets, and structured action items

The product direction is a cozy second-brain + journaling companion. Not a chatbot with memory. Not therapy-lite. A system that continuously evolves its understanding of the user.

---

## What Exists Right Now

### Live voice flow
- WebRTC voice session works through `/api/realtime`
- User transcript events appear in the UI
- Assistant transcript streams and finalizes correctly
- Session instructions are updated live through `session.update`

### Journal product flow
- `/` is a `Today Hub`
- Users can start a voice check-in or write a manual quick log
- Both paths feed the same save + summarize + memory pipeline
- Saved sessions show title, summary, mood, themes, rapid-log bullets, and tasks
- Raw transcripts are retained only for the latest 5 sessions

### Memory system (newly upgraded)
- Each session runs `upsertMemories()` — same signal seen again → weight increases
- Unused memories decay weekly (0.85^weeks) and deactivate below threshold 0.15
- Brain instructions are now built from **3 ranked layers**:
  1. Profile summary (slow-changing long-term identity)
  2. Pattern summary (last session arc — medium stability)
  3. Top 5 weighted memories (fast-changing atomic signals)
- Memory content is normalized to stable third-person strings for exact-match deduplication
- `EMOTION` is now a valid memory kind alongside: `IDENTITY`, `PREFERENCE`, `GOAL`, `THEME`, `RELATIONSHIP`, `ROUTINE`

### Second-brain flow
- Each saved session updates:
  - Rolling profile summary
  - Pattern summary (new: "This session, the user felt...")
  - Durable memory items with weight evolution
  - Action items/tasks
- Memory items can be edited, pinned, or archived
- Session artifacts can be edited after generation
- Tasks can be edited and completed

---

## Product Direction

The system is building toward:
- Cozy, accessible, low-friction daily journaling
- Voice as the flagship input path
- Manual logging as first-class fallback
- A second-brain feel — not an overwhelming knowledge base
- A companion that thinks *with* the user, not at them

The app is intentionally moving away from:
- Canned reassurance
- Generic safety boilerplate
- Reflexive redirection for normal emotional reflection

Default behavior: collaborative, grounded, useful.

---

## Current Architecture

### Frontend surfaces
- `/` — cozy daily home: voice capture, manual quick log, today's sessions, open tasks, top memory snapshot
- `/sessions` — archive of saved session entries
- `/sessions/[id]` — single journal-entry view with artifact/task editing and transcript
- `/profile` — rolling summary + durable memories with edit/pin/archive

### Server responsibilities
- `/api/realtime` — exchanges SDP with OpenAI Realtime, accepts companion instructions
- `/api/sessions/finalize` — saves voice sessions, generates artifact + summary + memory
- `/api/sessions/manual` — converts a manual text log into the same finalize pipeline
- `/api/sessions` — session list API
- `/api/sessions/[id]` — session detail + artifact patch API
- `/api/tasks/[id]` — task patch API
- `/api/profile` — profile/memory read API
- `/api/profile/memories/[id]` — memory patch API

### Persistence
Prisma + SQLite.

Models:
- `Session`
- `SessionTurn`
- `SessionSummary` — now includes `patternSummary`
- `Task`
- `ProfileMemory` — now includes `weight`, `seenCount`
- `ProfileSnapshot`

Design:
- Recent raw transcripts = short-term memory (pruned to latest 5)
- Summaries + memory items = long-term memory
- Weight + seenCount = signal strength tracking over time

---

## Important Files

### Core app shell and product UI
- `app/page.tsx`
- `app/_components/today-hub.tsx`
- `app/_components/app-nav.tsx`
- `app/sessions/page.tsx`
- `app/sessions/[id]/page.tsx`
- `app/profile/page.tsx`

### Editing surfaces
- `app/_components/session-artifact-editor.tsx`
- `app/_components/task-list.tsx`
- `app/_components/memory-list.tsx`

### Realtime stack
- `app/api/realtime/route.ts`
- `app/realtime/client.ts`
- `app/realtime/useRealtime.ts`
- `app/realtime/types.ts`

### Memory + brain layer (fully separated)
- `lib/memory.ts` — upsert/decay/read for ProfileMemory
- `lib/extractor.ts` — atomic signal extractor (gpt-5.4-nano)
- `lib/brain.ts` — builds 3-layer system instructions
- `lib/state.ts` — emotion + intent detection (rule-based v1)
- `lib/turn.ts` — turn manager: response guidance per state + mode
- `lib/timing.ts` — silence detection + response delay logic

### Summary / persistence
- `lib/session-summary.ts`
- `lib/session-finalizer.ts`
- `lib/session-types.ts`
- `lib/prisma.ts`
- `prisma/schema.prisma`

---

## How The Memory System Works

### Memory layers (3 time scales)

```
Atomic memory     → fast-changing    (weight evolves per session)
Pattern summary   → medium stability (one sentence, per session)
Profile           → slow-changing    (rolling paragraph, cumulative)
```

### Upsert + weight evolution
- New memory: `weight=1.0`, `seenCount=1`
- Same signal again: `weight += 0.5` (cap at 5.0), `seenCount++`
- Pinned memories: recency updated, weight preserved

### Decay
- Runs non-blocking after every session finalize
- `newWeight = weight * 0.85 ^ weeksInactive` (grace: 1 week)
- Below 0.15 → deactivated (soft delete, not hard delete)

### Brain injection
- `getMemoriesForBrain(5)` — sorted: pinned > weight > recency
- Injected as "Recent context" in system instructions
- Profile summary = stable identity layer
- Pattern summary = last session arc (bridge between atomic + profile)

### Signal extraction
- `lib/extractor.ts` extracts one normalized signal per turn
- Uses: `gpt-5.4-nano`
- Output: stable third-person strings → `"tends to feel drained after long work sessions"`
- Exact-match dedup works reliably because the LLM is prompted for consistency

---

## How The Session Artifact Pipeline Works

When a session ends:
1. Client sends ordered turns to `/api/sessions/finalize`
2. Server saves raw session + turns
3. Summary model generates structured JSON:
   - title (vivid, session-specific)
   - sessionSummary (warm, first-person)
   - keyThemes (1–4)
   - rapidLogBullets (bullet-journal style, 1–5)
   - actionItems (concrete only, max 3)
   - mood (specific, 1–3 words)
   - **patternSummary** (one-sentence arc — new)
   - profileSummary (rolling paragraph — updated)
   - memories (normalized, max 5 — new cap)
4. Saves summary + tasks to DB
5. Runs `upsertMemories()` with weight evolution
6. Runs `decayMemories()` non-blocking
7. Prunes raw transcripts older than latest 5

If summary generation fails:
- Raw session still saved
- Status → `SUMMARY_FAILED`
- Processing error stored
- Failure path intentional and preserved

---

## Current Model Split

| Role | Model |
|---|---|
| Realtime voice conversation | `gpt-realtime-mini` |
| Signal extraction | `gpt-5.4-nano` |
| Post-session summary + memory | `OPENAI_SUMMARY_MODEL` (default: `gpt-5.4-nano`) |

---

## Environment

Expected env vars:
- `OPENAI_API_KEY`
- `DATABASE_URL`
- `OPENAI_SUMMARY_MODEL`

See `.env.example`.

---

## How To Run Locally

```bash
npm run dev
```

Useful DB commands:
```bash
npx prisma db push
npx prisma generate
```

Verification:
```bash
npm run lint
npm run build
```

---

## Validation Status

Validated locally after this phase:
- `npx prisma db push` ✓
- `npx prisma generate` ✓
- `npm run lint` ✓
- `npm run build` ✓

Build succeeds. All 13 routes compile.

---

## Known Issues / Rough Edges

### 1. Turbopack workspace-root warning
`npm run build` shows a non-blocking warning about multiple lockfiles and inferred workspace root. Does not break the build.

### 2. README is outdated
`README.md` is still the default create-next-app file.

### 3. Extractor not wired to live session yet
`lib/extractor.ts` exists and works, but is not yet called mid-session. Currently, signal extraction only happens at session end (inside the summary pipeline implicitly via the LLM).

Next step: wire `extractSignalsFromTurns()` to run on user turns during a live session, then call `upsertMemories()` immediately — so memory evolves *during* the conversation, not just after.

### 4. `state.ts` / `turn.ts` / `timing.ts` not wired to the realtime client yet
These modules exist with the right interfaces, but the realtime `client.ts` and `useRealtime.ts` don't call them yet. They are stubs ready to be connected.

### 5. No auth / multi-user support
Intentionally single-user.

---

## Mapping Against `reference.txt`

### Fully aligned
- Realtime session lifecycle ✓
- `session.update` support ✓
- Memory layer ✓ (now with weight + decay)
- Mode system ✓
- Saved artifacts ✓
- Storage ✓
- `brain.ts` ✓ (3-layer instruction model)
- `memory.ts` ✓ (separate module)
- `extractor.ts` ✓ (separate module, stub-wired)
- `state.ts` ✓
- `turn.ts` ✓
- `timing.ts` ✓

### Not yet wired
- `handlers.ts` — event handler split from `client.ts` (still inline)
- Live mid-session extraction — extractor exists but not called during conversation
- `state.ts` / `turn.ts` / `timing.ts` — not yet connected to realtime client

---

## Recommended Next Steps

### Highest value right now

**1. Wire the realtime client to the behavior layer**

Connect `state.ts`, `turn.ts`, `timing.ts` into `app/realtime/client.ts` and `useRealtime.ts` so the behavior layer actually influences live conversations. This is the biggest gap between what exists on paper and what runs at runtime.

**2. Wire live memory extraction**

Call `extractSignalsFromTurns()` at end of session (or every N turns) and run `upsertMemories()` immediately. This closes the loop: memory evolves during conversation, not just after.

**3. Split `handlers.ts` from `client.ts`**

Extract the event listener logic from `app/realtime/client.ts` into `app/realtime/handlers.ts` per the reference spec. Small refactor, high architectural clarity.

**4. UI polish pass**

The Today Hub and session detail views are functional. Making them feel more premium (animations, memory weight visualization, pattern summary display) would significantly improve the product feel.

**5. README cleanup**

Replace the default README with a real product description.

---

## If You Are Picking This Up Next

Start here:
- `lib/memory.ts` — understand the weight system
- `lib/brain.ts` — see how the 3-layer instructions are built
- `app/realtime/client.ts` — this is where behavior layer wiring goes next
- `app/_components/today-hub.tsx` — the main product surface
- `prisma/schema.prisma` — the full data model

The memory architecture is solid. The next phase is connecting it to the live conversation loop.
