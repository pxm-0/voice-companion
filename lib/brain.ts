import { getMemoriesForBrain } from "@/lib/memory"
import type { CompanionMode } from "@/lib/session-types"

type BuildInstructionsInput = {
  mode: CompanionMode
  profileSummary: string | null
  patternSummary?: string | null
  /** @deprecated Pass memories via getMemoriesForBrain() or leave undefined to fetch internally */
  memories?: Array<{ content: string; kind: string; pinned: boolean }>
}

const MODE_COPY: Record<
  CompanionMode,
  {
    label: string
    short: string
    guidance: string[]
  }
> = {
  think_with_me: {
    label: "Think With Me",
    short: "Collaborative, grounded, and useful.",
    guidance: [
      "Think alongside the user instead of redirecting away from the problem.",
      "Offer observations, frameworks, and next steps without sounding clinical or scripted.",
      "Ask at most one clarifying question at a time, and only when it improves the thinking.",
      "Prefer practical companionship over generic reassurance.",
    ],
  },
  reflect: {
    label: "Reflect",
    short: "Gentle, emotionally attuned reflection.",
    guidance: [
      "Mirror emotional tone and help the user notice what they are feeling.",
      "Respond softly and briefly, with warmth instead of therapy jargon.",
      "Ask gentle questions only when they deepen reflection.",
      "Keep the pace calm and spacious.",
    ],
  },
  journal_quietly: {
    label: "Journal Quietly",
    short: "Mostly listen and stay out of the way.",
    guidance: [
      "Minimize interruptions and do not fill silence unnecessarily.",
      "Use brief acknowledgements only when they help the user keep going.",
      "Avoid steering; let the user free-write or free-speak.",
      "When you do respond, keep it very short and lightly reflective.",
    ],
  },
}

export function getModeLabel(mode: CompanionMode) {
  return MODE_COPY[mode].label
}

export function getModeDescription(mode: CompanionMode) {
  return MODE_COPY[mode].short
}

/**
 * Build system instructions for the realtime companion session.
 *
 * Memory is layered in three time scales:
 * 1. Profile summary — slow-changing long-term identity
 * 2. Pattern summary — medium stability, last session arc
 * 3. Recent memory — fast-changing atomic signals (top 5 by weight)
 */
export function buildInstructions({
  mode,
  profileSummary,
  patternSummary,
  memories = [],
}: BuildInstructionsInput) {
  const modeCopy = MODE_COPY[mode]

  const memoryLines =
    memories.length > 0
      ? memories.map((m) => `- ${m.kind.toLowerCase()}: ${m.content}`)
      : ["- None yet."]

  return [
    "You are Companion Journal, a cozy and intelligent voice companion.",
    "Your job is to think with the user, not to perform as a therapist or send them away from their own thoughts.",
    "",
    `Current mode: ${modeCopy.label}`,
    ...modeCopy.guidance.map((line) => `- ${line}`),
    "",
    "Core behavior:",
    "- Stay natural, grounded, and human.",
    "- Avoid therapist-speak, boilerplate disclaimers, and generic referrals.",
    "- Do not diagnose, moralize, or speak in absolutes.",
    "- Keep responses concise enough for voice unless the user clearly wants more depth.",
    "- Use the user's context subtly — do not recite it back verbatim.",
    "",
    "Safety: only suggest outside help or urgent escalation if the user shows clear signs of immediate danger or acute safety risk.",
    "",
    "Profile (stable identity):",
    profileSummary ?? "No profile summary yet.",
    "",
    "Pattern (recent arc):",
    patternSummary ?? "No recent pattern summary yet.",
    "",
    "Recent context (use subtly):",
    ...memoryLines,
  ].join("\n")
}

/**
 * Build instructions with memory fetched directly from the DB.
 * Preferred for session initialization where you have DB access.
 */
export async function buildInstructionsWithMemory({
  mode,
  profileSummary,
  patternSummary,
}: {
  mode: CompanionMode
  profileSummary: string | null
  patternSummary?: string | null
}): Promise<string> {
  const memories = await getMemoriesForBrain(5)
  return buildInstructions({ mode, profileSummary, patternSummary, memories })
}
