# Companion Journal

A cozy voice journaling app with a continuously evolving second brain.

## What it does

Companion Journal lets you talk through your day, your thoughts, or a problem — and quietly turns that conversation into a structured journal entry that remembers who you are.

Each session produces:
- A vivid journal artifact (title, summary, bullet-journal bullets, key themes, mood)
- Concrete action items extracted from what you actually committed to
- Durable memory items that evolve over time

The app builds a three-layer understanding of you:
1. **Atomic memory** — fast-changing signals from each conversation
2. **Pattern summaries** — what each session's emotional arc looked like
3. **Profile** — a slow-evolving paragraph that captures your tendencies, preferences, and patterns

## Tech stack

- **Next.js** (App Router)
- **OpenAI Realtime API** (WebRTC voice session)
- **Prisma + SQLite** (local persistence)
- **TypeScript** throughout

## Models

| Role | Model |
|---|---|
| Live voice conversation | `gpt-realtime-mini` |
| Mid-session signal extraction | `gpt-5.4-nano` |
| Post-session summary + memory | configurable via `OPENAI_SUMMARY_MODEL` |

## Getting started

Copy the example env file and fill in your API key:

```bash
cp .env.example .env
```

Set up the database:

```bash
npx prisma db push
npx prisma generate
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `DATABASE_URL` | Yes | SQLite path (e.g. `file:./dev.db`) |
| `OPENAI_SUMMARY_MODEL` | No | Model for post-session summaries (default: `gpt-5.4-nano`) |

## Companion modes

| Mode | Behavior |
|---|---|
| Think With Me | Collaborative, grounded — thinks alongside you |
| Reflect | Gentle, emotionally attuned — mirrors and holds space |
| Journal Quietly | Minimal — mostly listens, stays out of the way |

## Architecture

```
app/realtime/
  client.ts      — pure WebRTC transport
  handlers.ts    — event routing + behavior layer integration
  useRealtime.ts — React hook with live extraction + turn guidance

lib/
  brain.ts           — builds 3-layer system instructions
  memory.ts          — upsert/decay/read for ProfileMemory
  extractor.ts       — atomic signal extraction (gpt-5.4-nano)
  state.ts           — emotion + intent detection
  turn.ts            — turn manager: response guidance per state
  timing.ts          — silence detection + delay logic
  session-summary.ts — post-session artifact generation
  session-finalizer.ts — full session save + memory pipeline
```

## License

MIT
