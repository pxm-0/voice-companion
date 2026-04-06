/**
 * lib/extractor.ts — Atomic signal extractor
 *
 * Extracts one meaningful memory signal per conversation turn using gpt-5.4-nano.
 * Designed to be fast and cheap — max 1 signal per call, skips low-confidence results.
 *
 * In Phase 1: called at session end alongside summary generation.
 * In Phase 2: can be called live every N turns during a session.
 */

// --- Types ---

export type SignalType = "emotion" | "pattern" | "preference"

export type AtomicSignal = {
  type: SignalType
  value: string
  confidence: "medium" | "high"
}

type ExtractorResponse = {
  found: boolean
  type: SignalType
  value: string
  confidence: "low" | "medium" | "high"
}

// --- Schema ---

const EXTRACTOR_JSON_SCHEMA = {
  name: "signal_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      found: {
        type: "boolean",
        description: "Whether a meaningful signal was found in this text.",
      },
      type: {
        type: "string",
        enum: ["emotion", "pattern", "preference"],
        description: "The type of signal detected.",
      },
      value: {
        type: "string",
        description:
          "The normalized signal value. Write in third-person present tense, e.g. 'tends to feel drained after long work days'. Keep it under 12 words.",
      },
      confidence: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "How strongly the text supports this signal.",
      },
    },
    required: ["found", "type", "value", "confidence"],
  },
} as const

// --- System prompt ---

const EXTRACTOR_SYSTEM_PROMPT = [
  "You extract one meaningful behavioral or emotional signal from user speech.",
  "",
  "Signal types:",
  "- emotion: a feeling or mood state expressed in this moment",
  "- pattern: a recurring behavior, tendency, or habit",
  "- preference: something the user likes, dislikes, or prefers",
  "",
  "Rules:",
  "- Extract at most one signal. If nothing meaningful is present, set found=false.",
  "- Ignore filler, pleasantries, and one-off complaints with no clear pattern.",
  "- Write the value in stable, normalized third-person form: 'tends to feel X when Y'.",
  "- Use the same wording you would use if you saw this signal again — consistency enables deduplication.",
  "- Set confidence=low for ambiguous or throwaway mentions.",
].join("\n")

// --- Main function ---

/**
 * Extract one atomic signal from a piece of user text.
 * Returns null if no meaningful signal is found or confidence is low.
 */
export async function extractSignal(text: string): Promise<AtomicSignal | null> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for signal extraction.")
  }

  const trimmed = text.trim()
  if (trimmed.length < 10) return null

  const model = "gpt-5.4-nano"

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: EXTRACTOR_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Extract a signal from this:\n\n"${trimmed}"`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: EXTRACTOR_JSON_SCHEMA,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Signal extraction failed: ${errorText}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: { content?: string | null; refusal?: string | null }
    }>
  }

  const choice = data.choices?.[0]
  if (!choice?.message || choice.message.refusal || !choice.message.content) {
    return null
  }

  const parsed = JSON.parse(choice.message.content) as ExtractorResponse

  if (!parsed.found || parsed.confidence === "low" || !parsed.value.trim()) {
    return null
  }

  return {
    type: parsed.type,
    value: parsed.value.trim(),
    confidence: parsed.confidence,
  }
}

/**
 * Extract signals from multiple turns of a transcript.
 * Used at session end to pull additional atomic signals the summary may have missed.
 * De-duplicates by exact value match before returning.
 */
export async function extractSignalsFromTurns(
  turns: Array<{ role: "user" | "assistant"; text: string }>,
): Promise<AtomicSignal[]> {
  const userTurns = turns.filter(
    (t) => t.role === "user" && t.text.trim().length > 10,
  )

  const results: AtomicSignal[] = []
  const seen = new Set<string>()

  for (const turn of userTurns) {
    try {
      const signal = await extractSignal(turn.text)
      if (signal && !seen.has(signal.value)) {
        seen.add(signal.value)
        results.push(signal)
      }
    } catch {
      // Non-blocking — extraction failures don't stop the pipeline
    }
  }

  return results
}
