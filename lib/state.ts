/**
 * lib/state.ts — Emotion + intent detection
 *
 * Architecture cleanup module from reference.txt spec.
 * v1: rule-based detection from transcript text.
 * v2: can be upgraded to use a lightweight classifier model.
 */

// --- Types ---

export type EmotionLevel = "low" | "neutral" | "high"

export type IntentType = "vent" | "reflect" | "ask" | "casual"

export type ConversationState = {
  emotion: EmotionLevel
  intent: IntentType
}

// --- Emotion detection ---

const HIGH_EMOTION_SIGNALS = [
  "i can't",
  "i can't",
  "frustrated",
  "overwhelmed",
  "exhausted",
  "breaking down",
  "crying",
  "furious",
  "terrified",
  "panic",
  "falling apart",
  "can't take",
  "hate this",
  "so stressed",
  "freaking out",
  "burned out",
]

const LOW_EMOTION_SIGNALS = [
  "not really",
  "whatever",
  "doesn't matter",
  "fine i guess",
  "kind of okay",
  "not a big deal",
  "just rambling",
  "nothing important",
  "just wanted to say",
]

function detectEmotion(text: string): EmotionLevel {
  const lower = text.toLowerCase()
  if (HIGH_EMOTION_SIGNALS.some((signal) => lower.includes(signal))) return "high"
  if (LOW_EMOTION_SIGNALS.some((signal) => lower.includes(signal))) return "low"
  return "neutral"
}

// --- Intent detection ---

const VENT_SIGNALS = [
  "i just need to",
  "i need to talk about",
  "i'm so",
  "i am so",
  "it's been",
  "it has been",
  "i've been",
  "i have been",
  "nobody gets it",
  "nobody understands",
  "i hate",
  "this is so",
  "i can't believe",
]

const REFLECT_SIGNALS = [
  "i've been thinking",
  "i have been thinking",
  "i wonder",
  "i'm trying to figure out",
  "maybe i",
  "i feel like",
  "i realized",
  "i notice",
  "looking back",
  "i keep",
  "i tend to",
]

const ASK_SIGNALS = [
  "what should i",
  "what do you think",
  "do you think",
  "how do i",
  "what's the best",
  "can you help",
  "any advice",
  "any suggestions",
  "what would you",
]

function detectIntent(text: string): IntentType {
  const lower = text.toLowerCase()
  if (ASK_SIGNALS.some((signal) => lower.includes(signal))) return "ask"
  if (VENT_SIGNALS.some((signal) => lower.includes(signal))) return "vent"
  if (REFLECT_SIGNALS.some((signal) => lower.includes(signal))) return "reflect"
  return "casual"
}

// --- Main API ---

/**
 * Detect emotion level and intent from a single turn of user text.
 * Used by the turn manager to decide how to respond.
 */
export function detectState(text: string): ConversationState {
  return {
    emotion: detectEmotion(text),
    intent: detectIntent(text),
  }
}

/**
 * Merge state signals across multiple turns.
 * Takes the highest-signal emotion and most specific intent.
 */
export function mergeStates(states: ConversationState[]): ConversationState {
  if (states.length === 0) return { emotion: "neutral", intent: "casual" }

  const emotionPriority: Record<EmotionLevel, number> = { high: 2, neutral: 1, low: 0 }
  const intentPriority: Record<IntentType, number> = { ask: 3, vent: 2, reflect: 1, casual: 0 }

  const emotion = states.reduce((best, state) =>
    emotionPriority[state.emotion] > emotionPriority[best.emotion] ? state : best,
  ).emotion

  const intent = states.reduce((best, state) =>
    intentPriority[state.intent] > intentPriority[best.intent] ? state : best,
  ).intent

  return { emotion, intent }
}
