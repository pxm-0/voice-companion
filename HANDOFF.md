# Companion Journal Handoff

Last updated: 2026-04-06

## Project Snapshot

Companion Journal is now beyond the "realtime demo" stage.

The app currently does three important things well:
- runs a live voice conversation over OpenAI Realtime WebRTC
- turns completed sessions into saved journal artifacts
- builds a lightweight second-brain layer from summaries, tasks, and durable memory

The newest implemented product direction is a cozy `Today Hub` with visible companion modes:
- `Think With Me`
- `Reflect`
- `Journal Quietly`

This phase keeps the voice transport intact and shifts the product toward a bullet-journal / second-brain experience.

## What Exists Right Now

### Live voice flow
- WebRTC voice session works through `/api/realtime`
- user transcript events appear in the UI
- assistant transcript streams and finalizes correctly
- session instructions can be updated live through `session.update`

### Journal product flow
- `/` is now a `Today Hub`
- users can start a voice check-in or write a manual quick log
- both paths feed the same save + summarize + memory pipeline
- saved sessions show title, summary, mood, themes, rapid-log bullets, and tasks
- raw transcripts are retained only for the latest 5 sessions

### Second-brain flow
- each saved session can update:
  - rolling profile summary
  - durable memory items
  - action items/tasks
- memory items can now be edited, pinned, or archived
- session artifacts can be edited after generation
- tasks can be edited and completed

## Product Direction

The current product is aiming for:
- cozy, accessible, low-friction daily journaling
- voice as the flagship input path
- manual logging as a first-class fallback
- a second-brain feel without turning into an overwhelming knowledge base
- a companion that thinks with the user instead of sounding like "therapist lite"

That last point matters.

The app is intentionally moving away from:
- canned reassurance
- generic safety boilerplate
- reflexive redirection to outside services for normal emotional reflection

The intended default behavior is collaborative, grounded, and useful.

## Current Architecture

### Frontend surfaces
- `/`
  - cozy daily home
  - voice capture
  - manual quick log
  - today's sessions
  - open tasks
  - top memory snapshot
- `/sessions`
  - archive of saved session entries
- `/sessions/[id]`
  - single journal-entry view
  - artifact editing
  - task editing
  - transcript as secondary detail
- `/profile`
  - rolling summary + durable memories
  - memory edit/pin/archive

### Server responsibilities
- `/api/realtime`
  - exchanges SDP with OpenAI Realtime
  - accepts optional companion instructions
- `/api/sessions/finalize`
  - saves voice sessions
  - generates artifact + summary + memory
- `/api/sessions/manual`
  - converts a manual text log into the same finalize pipeline
- `/api/sessions`
  - session list API
- `/api/sessions/[id]`
  - session detail API
  - session artifact patch API
- `/api/tasks/[id]`
  - task patch API
- `/api/profile`
  - profile/memory read API
- `/api/profile/memories/[id]`
  - memory patch API

### Persistence
Prisma + SQLite are the current storage layer.

Main concepts:
- `Session`
- `SessionTurn`
- `SessionSummary`
- `Task`
- `ProfileMemory`
- `ProfileSnapshot`

Design choice:
- recent raw transcripts are short-term memory
- summaries + memory items are long-term memory

This keeps the system inspectable and avoids "store every transcript forever" as the main memory strategy.

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

### Summary / memory / persistence logic
- `lib/brain.ts`
- `lib/session-summary.ts`
- `lib/session-finalizer.ts`
- `lib/session-types.ts`
- `lib/prisma.ts`
- `prisma/schema.prisma`

## How The Current Voice Behavior Works

### Realtime transport
The voice stack is intentionally not being re-architected right now.

Current approach:
- create WebRTC peer connection in `app/realtime/client.ts`
- send SDP offer to `/api/realtime`
- server relays to OpenAI Realtime `/v1/realtime/calls`
- receive assistant audio back through the peer connection
- receive transcript events through the data channel

### Behavior injection
Behavior tuning now happens above the transport layer.

`lib/brain.ts` builds instructions from:
- selected mode
- profile summary
- top memories
- safety style

Those instructions are passed:
- during session initialization
- during live updates through `session.update`

This is the correct seam for product-level tuning.
The voice transport itself is not the current bottleneck.

## How The Session Artifact Pipeline Works

When a session ends:
1. the client sends ordered turns to `/api/sessions/finalize`
2. the server saves the raw session + turns
3. the server calls the summary model for structured JSON output
4. the server saves:
   - title
   - summary
   - mood
   - themes
   - rapid-log bullets
   - action items
   - updated profile summary
   - memory item upserts
5. the server prunes raw transcript turns for sessions older than the latest 5

If summary generation fails:
- the raw session is still saved
- session status becomes `SUMMARY_FAILED`
- processing error is stored

That failure path is intentional and should be preserved.

## Current Model Split

There are three model roles right now:

- Realtime voice conversation:
  - `gpt-realtime-mini`
- Input transcription:
  - `gpt-4o-mini-transcribe`
- Post-session structured summary / memory extraction:
  - `OPENAI_SUMMARY_MODEL`
  - current example default in `.env.example` is `gpt-5.4-nano`

The split is deliberate:
- fast voice model for live interaction
- separate text model for structured artifact generation

## Environment

Current expected env vars:
- `OPENAI_API_KEY`
- `DATABASE_URL`
- `OPENAI_SUMMARY_MODEL`

See `.env.example` for the shape.
Do not commit real secret values.

## How To Run Locally

Install dependencies if needed, then use:

```bash
npm run dev
```

Useful DB commands:

```bash
npx prisma db push
npx prisma generate
```

Useful verification commands:

```bash
npm run lint
npm run build
```

## Validation Status

This phase has already been validated locally with:
- `npx prisma db push`
- `npx prisma generate`
- `npm run lint`
- `npm run build`

Build currently succeeds.

## Known Issues / Rough Edges

### 1. Turbopack workspace-root warning
`npm run build` shows a non-blocking warning about multiple lockfiles and inferred workspace root.

It does not break the build, but it should be cleaned up later by either:
- removing the extra lockfile, or
- setting `turbopack.root` in Next config

### 2. README is outdated
`README.md` is still the default create-next-app file and does not describe the actual product.

### 3. Behavior system is still prompt-led, not stateful
The current malleability work is real, but still lightweight.

What exists:
- mode switching
- instruction builder
- live `session.update`
- anti-therapist-lite behavioral rules

What does not exist yet as dedicated modules from the original spec:
- `state.ts`
- `turn.ts`
- `timing.ts`
- explicit interruption/silence strategy modules
- rule-backed safety/state classifier

Right now the behavior layer is mostly in `lib/brain.ts` plus prompt wording.
That is enough for product tuning, but not the final architecture.

### 4. Summary quality still needs tuning
The app now creates better journal artifacts than before, but tuning is still needed for:
- title quality
- bullet-journal voice
- action-item precision
- memory extraction selectivity
- reducing any remaining therapy-ish phrasing

### 5. No auth / multi-user support
The app is intentionally single-user right now.

## Mapping Against `reference.txt`

### Already aligned
- realtime session lifecycle exists
- `session.update` support exists
- memory layer exists
- mode system exists
- saved artifacts exist
- storage exists

### Partially aligned
- `brain.ts`
  - exists, but currently focused on instruction building
- memory extraction
  - exists, but lives inside the summary pipeline rather than separate extractor modules

### Not yet aligned as separate modules
The spec suggests eventually splitting into:
- `memory.ts`
- `extractor.ts`
- `state.ts`
- `turn.ts`
- `timing.ts`
- `handlers.ts`

We have the behavior pieces conceptually, but not fully separated in code yet.
That is likely the next architectural cleanup once product tuning becomes more advanced.

## Recommended Next Steps

### Highest-value next step
Tune the companion behavior and artifact quality rather than rewriting the voice stack.

The voice layer is already the strongest part of the product.
The biggest opportunities now are:
- make the companion feel more collaborative and less cautious-by-default
- improve journal artifact voice so entries feel genuinely cozy and worth revisiting
- tighten memory extraction so it feels trustworthy

### Suggested order
1. behavior tuning pass
   - tune `lib/brain.ts`
   - reduce therapist-lite tendencies
   - refine mode distinctions
2. artifact quality pass
   - improve session titles
   - improve rapid-log bullets
   - improve task extraction quality
3. architecture cleanup pass
   - split state / turn / timing logic into dedicated modules from the spec
4. UI polish pass
   - make the Today Hub and session detail views feel even more like a premium journal product
5. README / docs cleanup
   - replace the default README

## If You Are Picking This Up Next

Start here:
- `app/_components/today-hub.tsx`
- `lib/brain.ts`
- `lib/session-summary.ts`
- `lib/session-finalizer.ts`
- `prisma/schema.prisma`

That set gives you the product surface, live behavior seam, summary generation, persistence, and data model.

## Current Working Tree Note

As of this handoff, the cozy hub + malleable companion phase has been implemented locally and validated with lint/build. If you are reading this before a commit is made, expect a dirty working tree containing those changes.
