# Eli Journal

**A voice journaling companion that remembers who you are.**

Live at [eli-journal.com](https://eli-journal.com) · Built by [Dustin A](https://github.com/pxm-0)

---

## What it is

Eli is a voice companion you talk to — not type at. You open it, hit record, and just talk. Through your day, a problem, something you're processing. Eli listens, responds when it matters, and when you're done, it quietly turns that conversation into a structured journal entry.

But the actual idea is the second brain underneath.

Most AI tools are stateless. Every session starts from zero. Eli isn't like that. It builds a layered understanding of you across conversations — things you keep coming back to, emotional patterns, what you've committed to. That context is injected into every new session so Eli walks in already knowing you. Not performing memory. Actually having it.

---

## How it works

### Voice transport

Eli uses the OpenAI Realtime API over **WebRTC** — not WebSockets, not HTTP polling. Your browser negotiates a direct peer-to-peer audio connection to OpenAI. The result is sub-100ms latency and natural conversation rhythm. The transport layer is intentionally thin; all the interesting work happens in the layers above it.

### The behavior layer

This is the part I'm most proud of.

While you're talking, every turn you speak runs through two detectors:

- **Emotion classifier** — low / neutral / high arousal
- **Intent classifier** — venting, reflecting, asking, casual

Those signals feed a turn manager that produces live guidance: should Eli respond at all? Ask a question? Stay silent? How long should she wait? What style — `reflective`, `collaborative`, `brief`, or `silent`?

That guidance fires a `session.update` to OpenAI mid-conversation. Eli rewires herself in real time based on your emotional state. If you're venting, she listens more. If you're working through a problem, she engages. This isn't just a static system prompt — it's an adaptive layer that changes the character of the conversation as it unfolds.

### Memory with three time scales

Instead of a flat memory store, there are three layers modeled on how memory actually works:

**Atomic memory** — fast-changing signals extracted from conversation. Each has a weight (1.0 on first mention, +0.5 on each recurrence, cap 5.0). Decays at 0.85 per week of inactivity. Below 0.15, soft-deleted.

**Pattern summaries** — one sentence per session capturing the emotional and thematic arc. What did this conversation look like?

**Profile** — a slow-evolving paragraph built cumulatively across all sessions. Stable identity layer. Updated, never wiped.

Extraction happens **live, every 5 turns**, mid-session — not just at the end. By the time you hang up, Eli has already been updating her understanding of you while you were talking. The session finalizer runs a second full pass, then a decay sweep across all memories.

### Brain injection

At the start of every session, a three-layer system prompt is assembled:

1. Your **profile paragraph** — who you are, stable across time
2. The **pattern summary** from your last session — the arc it took
3. Your **top 5 weighted memories** — sorted by pin status, weight, recency

This is what makes Eli feel like she remembers. She references things from three weeks ago because they had enough weight to survive decay. A struggle you kept bringing up has been compounding. She knows.

### Session lifecycle

```
connect
  → pre-create session record (IN_PROGRESS)
  → thread sessionId into all extraction events

every 5 turns
  → live signal extraction (gpt-5.4-nano)
  → atomic memories upserted mid-session

hang up
  → finalize: save journal artifact + full extraction pass + memory decay sweep
```

### Journal artifact

Each session produces: a vivid title, prose summary, bullet-journal bullets, mood, themes, and concrete action items — extracted in a separate model pass after the conversation ends.

---

## Companion modes

| Mode | Character |
|---|---|
| Think With Me | Collaborative, grounded — thinks alongside you |
| Reflect | Gentle, emotionally attuned — mirrors and holds space |
| Journal Quietly | Minimal — mostly listens, stays out of the way |

Modes route into the behavior layer to produce different response density, pacing, and style.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js (App Router) |
| Voice | OpenAI Realtime API (WebRTC) |
| Intelligence | gpt-5.4-nano (extraction + summaries) |
| Database | Prisma + Neon Postgres |
| Auth | NextAuth — Google + GitHub OAuth |
| Hosting | Vercel |

---

## Key files

```
app/realtime/
  client.ts          — WebRTC transport (SDP handshake, data channel)
  useRealtime.ts     — React hook, wires transport to behavior layer
  handlers.ts        — event routing + turn guidance integration

lib/
  brain.ts           — 3-layer system prompt builder
  memory.ts          — upsert / decay / read for atomic memories
  extractor.ts       — live + post-session signal extraction
  state.ts           — emotion + intent classification
  turn.ts            — TurnGuidance per emotional state + mode
  timing.ts          — silence thresholds + response delay config
  session-finalizer.ts — full session save + artifact + memory pipeline
```

---

## Models

| Role | Model |
|---|---|
| Live voice conversation | `gpt-realtime-mini` |
| Mid-session signal extraction | `gpt-5.4-nano` |
| Post-session summary + artifact | `gpt-5.4-nano` (configurable via `OPENAI_SUMMARY_MODEL`) |

---

## License

MIT
