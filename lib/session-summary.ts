import { ProfileMemoryKind } from "@prisma/client"
import type { CompanionMode, SessionInputType } from "@/lib/session-types"

type ExistingMemory = {
  kind: ProfileMemoryKind
  content: string
}

type SummaryGenerationInput = {
  startedAt: string
  endedAt: string
  mode: CompanionMode
  inputType: SessionInputType
  turns: Array<{
    role: "user" | "assistant"
    text: string
  }>
  existingProfileSummary: string | null
  existingMemories: ExistingMemory[]
}

export type SummaryGenerationResult = {
  title: string
  sessionSummary: string
  keyThemes: string[]
  rapidLogBullets: string[]
  actionItems: string[]
  mood: string
  patternSummary: string
  profileSummary: string
  memories: Array<{
    kind: ProfileMemoryKind
    content: string
  }>
}

const SUMMARY_JSON_SCHEMA = {
  name: "session_summary_payload",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: {
        type: "string",
        description:
          "A short, vivid title that captures the emotional core of this session. Be specific — avoid generic titles like 'Monday Check-in' or 'Session Summary'. Examples: 'Running on Empty Again', 'Finally Said It Out Loud', 'Spinning Wheels on the Project'.",
      },
      sessionSummary: {
        type: "string",
        description:
          "A 2-3 sentence human summary in first-person voice, like a journal entry. Warm, grounded, specific to what actually happened. Not a transcript recap.",
      },
      keyThemes: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 4,
      },
      rapidLogBullets: {
        type: "array",
        description:
          "Bullet-journal style bullets. Short, vivid, action-verb or noun-first. Examples: 'woke up foggy, pushed through emails anyway', 'skipped lunch again', 'good call with the team despite low energy'.",
        items: { type: "string" },
        minItems: 1,
        maxItems: 5,
      },
      actionItems: {
        type: "array",
        description:
          "Only include items where the user expressed a concrete next step, decision, or commitment. Skip vague intentions. Max 3.",
        items: { type: "string" },
        maxItems: 3,
      },
      mood: {
        type: "string",
        description:
          "A 1-3 word mood label. Specific and honest — not 'reflective' or 'positive'. Examples: 'drained but grounded', 'quietly stuck', 'relieved and foggy'.",
      },
      patternSummary: {
        type: "string",
        description:
          "One sentence capturing the key pattern or emotional arc of this session. First-person, past tense. Example: 'This session, the user was mentally drained from work, struggled to start tasks, and preferred low-pressure conversation.'",
      },
      profileSummary: {
        type: "string",
        description:
          "A rolling single-paragraph profile summary that incorporates this session's patterns into the user's ongoing identity. Stable, cumulative, third-person. Focus on recurring tendencies, preferences, and emotional rhythms.",
      },
      memories: {
        type: "array",
        description:
          "Durable memory items worth storing long-term. Only save stable, recurring signals — not one-off mentions. Write content in normalized third-person present-tense form. Use exactly the same wording you would use if you observed this signal again — consistency is critical for deduplication. Example: 'tends to feel drained after long work sessions'. Max 5.",
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            kind: {
              type: "string",
              enum: [
                "IDENTITY",
                "PREFERENCE",
                "GOAL",
                "THEME",
                "RELATIONSHIP",
                "ROUTINE",
                "EMOTION",
              ],
            },
            content: {
              type: "string",
            },
          },
          required: ["kind", "content"],
        },
      },
    },
    required: [
      "title",
      "sessionSummary",
      "keyThemes",
      "rapidLogBullets",
      "actionItems",
      "mood",
      "patternSummary",
      "profileSummary",
      "memories",
    ],
  },
} as const

function normalizeMemories(memories: ExistingMemory[]) {
  return memories.map((memory) => `${memory.kind}: ${memory.content}`).join("\n")
}

function buildPrompt(input: SummaryGenerationInput) {
  const transcript = input.turns
    .filter((turn) => turn.text.trim().length > 0)
    .map((turn) => `${turn.role.toUpperCase()}: ${turn.text}`)
    .join("\n")

  return [
    "You are updating a cozy companion journal and second-brain system.",
    "Return JSON that matches the provided schema exactly.",
    "",
    "## Artifact quality rules",
    "- Write with warm clarity and specificity — not clinical, not generic, not therapy-speak.",
    "- The saved artifact should feel like a real bullet-journal entry, not a transcript dump.",
    "- Titles should be vivid and specific to this session's emotional core.",
    "- Rapid-log bullets: short, punchy, action-verb or noun-first. Sound like a human wrote them.",
    "- Only capture action items when the user expressed a concrete commitment or next step.",
    "- Avoid: 'you mentioned', 'the user expressed', therapy clichés, safety disclaimers.",
    "",
    "## Memory quality rules",
    "- Only save memory items that reflect stable, recurring signals — not one-off events.",
    "- Write memory content in normalized third-person form: 'tends to feel X when Y'.",
    "- Use consistent wording — the same signal seen again should produce the exact same string.",
    "- Be selective. 0-3 strong memories beats 5 weak ones. Max 5.",
    "",
    `Input type: ${input.inputType}`,
    `Mode: ${input.mode}`,
    `Session started: ${input.startedAt}`,
    `Session ended: ${input.endedAt}`,
    "",
    "Existing profile summary:",
    input.existingProfileSummary ?? "None yet.",
    "",
    "Existing active memories (for context — do not repeat these verbatim unless reinforcing):",
    input.existingMemories.length > 0 ? normalizeMemories(input.existingMemories) : "None yet.",
    "",
    "Transcript:",
    transcript || "No transcript turns were captured.",
  ].join("\n")
}

function isProfileMemoryKind(value: string): value is ProfileMemoryKind {
  return (
    value === "IDENTITY" ||
    value === "PREFERENCE" ||
    value === "GOAL" ||
    value === "THEME" ||
    value === "RELATIONSHIP" ||
    value === "ROUTINE" ||
    value === "EMOTION"
  )
}

function assertStringArray(value: unknown, label: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Invalid ${label} in summary payload.`)
  }
}

function assertSummaryPayload(data: unknown): asserts data is SummaryGenerationResult {
  if (!data || typeof data !== "object") {
    throw new Error("Summary payload was not an object.")
  }

  const payload = data as Record<string, unknown>

  if (typeof payload.title !== "string" || payload.title.trim().length === 0) {
    throw new Error("Missing title in summary payload.")
  }

  if (typeof payload.sessionSummary !== "string" || payload.sessionSummary.trim().length === 0) {
    throw new Error("Missing sessionSummary in summary payload.")
  }

  assertStringArray(payload.keyThemes, "keyThemes")
  assertStringArray(payload.rapidLogBullets, "rapidLogBullets")
  assertStringArray(payload.actionItems, "actionItems")

  if (typeof payload.mood !== "string" || payload.mood.trim().length === 0) {
    throw new Error("Missing mood in summary payload.")
  }

  if (
    typeof payload.patternSummary !== "string" ||
    payload.patternSummary.trim().length === 0
  ) {
    throw new Error("Missing patternSummary in summary payload.")
  }

  if (typeof payload.profileSummary !== "string" || payload.profileSummary.trim().length === 0) {
    throw new Error("Missing profileSummary in summary payload.")
  }

  if (!Array.isArray(payload.memories)) {
    throw new Error("Missing memories in summary payload.")
  }

  for (const memory of payload.memories) {
    if (!memory || typeof memory !== "object") {
      throw new Error("Invalid memory item in summary payload.")
    }

    const item = memory as Record<string, unknown>
    if (typeof item.kind !== "string" || !isProfileMemoryKind(item.kind)) {
      throw new Error("Invalid memory kind in summary payload.")
    }

    if (typeof item.content !== "string" || item.content.trim().length === 0) {
      throw new Error("Invalid memory content in summary payload.")
    }
  }
}

function sanitizeStringArray(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

export async function generateSessionSummary(
  input: SummaryGenerationInput,
): Promise<SummaryGenerationResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for summary generation.")
  }

  const model = process.env.OPENAI_SUMMARY_MODEL || "gpt-5.4-nano"

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You produce structured JSON for a cozy journal companion app. Write artifacts that feel human, specific, and worth revisiting — like a real journal entry, not a session transcript.",
        },
        {
          role: "user",
          content: buildPrompt(input),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: SUMMARY_JSON_SCHEMA,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Summary generation failed: ${errorText}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null
        refusal?: string | null
      }
    }>
  }

  const choice = data.choices?.[0]
  if (!choice?.message || choice.message.refusal) {
    throw new Error("Summary generation was refused or returned no message.")
  }

  if (!choice.message.content) {
    throw new Error("Summary generation returned empty content.")
  }

  const parsed = JSON.parse(choice.message.content) as unknown
  assertSummaryPayload(parsed)

  return {
    title: parsed.title.trim(),
    sessionSummary: parsed.sessionSummary.trim(),
    keyThemes: sanitizeStringArray(parsed.keyThemes),
    rapidLogBullets: sanitizeStringArray(parsed.rapidLogBullets),
    actionItems: sanitizeStringArray(parsed.actionItems),
    mood: parsed.mood.trim(),
    patternSummary: parsed.patternSummary.trim(),
    profileSummary: parsed.profileSummary.trim(),
    memories: parsed.memories.map((memory) => ({
      kind: memory.kind,
      content: memory.content.trim(),
    })),
  }
}
