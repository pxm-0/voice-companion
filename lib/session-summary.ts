import { ProfileMemoryKind } from "@prisma/client"

type ExistingMemory = {
  kind: ProfileMemoryKind
  content: string
}

type SummaryGenerationInput = {
  startedAt: string
  endedAt: string
  turns: Array<{
    role: "user" | "assistant"
    text: string
  }>
  existingProfileSummary: string | null
  existingMemories: ExistingMemory[]
}

export type SummaryGenerationResult = {
  sessionSummary: string
  keyThemes: string[]
  mood: string
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
      sessionSummary: {
        type: "string",
        description: "A concise human-readable summary of the completed voice session.",
      },
      keyThemes: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 5,
      },
      mood: {
        type: "string",
        description: "A short mood label that captures the emotional tone of the session.",
      },
      profileSummary: {
        type: "string",
        description: "A rolling single-paragraph profile summary for future sessions.",
      },
      memories: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            kind: {
              type: "string",
              enum: ["IDENTITY", "PREFERENCE", "GOAL", "THEME", "RELATIONSHIP", "ROUTINE"],
            },
            content: {
              type: "string",
            },
          },
          required: ["kind", "content"],
        },
      },
    },
    required: ["sessionSummary", "keyThemes", "mood", "profileSummary", "memories"],
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
    "You are updating a companion journal memory system.",
    "Return JSON that matches the provided schema exactly.",
    "Focus on stable, durable user information only.",
    "Do not store fleeting details unless they reflect a meaningful recurring theme.",
    "Use memory items for facts, preferences, goals, relationships, routines, or lasting themes.",
    "If no durable memory should be added, return an empty memories array.",
    "",
    `Session started: ${input.startedAt}`,
    `Session ended: ${input.endedAt}`,
    "",
    "Existing profile summary:",
    input.existingProfileSummary ?? "None yet.",
    "",
    "Existing active memories:",
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
    value === "ROUTINE"
  )
}

function assertSummaryPayload(data: unknown): asserts data is SummaryGenerationResult {
  if (!data || typeof data !== "object") {
    throw new Error("Summary payload was not an object.")
  }

  const payload = data as Record<string, unknown>

  if (typeof payload.sessionSummary !== "string" || payload.sessionSummary.trim().length === 0) {
    throw new Error("Missing sessionSummary in summary payload.")
  }

  if (!Array.isArray(payload.keyThemes) || payload.keyThemes.some((theme) => typeof theme !== "string")) {
    throw new Error("Invalid keyThemes in summary payload.")
  }

  if (typeof payload.mood !== "string" || payload.mood.trim().length === 0) {
    throw new Error("Missing mood in summary payload.")
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
            "You produce structured JSON for a journal companion app. Keep summaries concise and memories durable.",
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
    sessionSummary: parsed.sessionSummary.trim(),
    keyThemes: parsed.keyThemes.map((theme) => theme.trim()).filter(Boolean),
    mood: parsed.mood.trim(),
    profileSummary: parsed.profileSummary.trim(),
    memories: parsed.memories.map((memory) => ({
      kind: memory.kind,
      content: memory.content.trim(),
    })),
  }
}
