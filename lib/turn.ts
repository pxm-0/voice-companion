/**
 * lib/turn.ts — Turn manager
 *
 * Architecture cleanup module from reference.txt spec.
 * Controls when to respond, how to respond, and whether to ask questions.
 *
 * v1: returns response guidance based on state + mode.
 * v2: can hook into live session.update to modify realtime behavior.
 */

import type { ConversationState } from "@/lib/state"
import type { CompanionMode } from "@/lib/session-types"

// --- Types ---

export type TurnInput = {
  text: string
  state: ConversationState
  mode: CompanionMode
  isInterrupting?: boolean
}

export type TurnGuidance = {
  shouldRespond: boolean
  shouldAskQuestion: boolean
  shouldSuppressResponse: boolean
  responseStyle: "reflective" | "collaborative" | "brief" | "silent"
  suggestedDelay: number // ms
}

// --- Core turn logic ---

/**
 * Given a turn's text, state, and mode, return guidance on how to respond.
 * This is consumed by the realtime layer to adjust session behavior dynamically.
 */
export function handleTurn(input: TurnInput): TurnGuidance {
  const { state, mode, isInterrupting = false } = input

  // Interruption: always stop and yield
  if (isInterrupting) {
    return {
      shouldRespond: false,
      shouldAskQuestion: false,
      shouldSuppressResponse: true,
      responseStyle: "silent",
      suggestedDelay: 0,
    }
  }

  // Journal quietly: mostly silent, no steering
  if (mode === "journal_quietly") {
    return {
      shouldRespond: true,
      shouldAskQuestion: false,
      shouldSuppressResponse: false,
      responseStyle: "brief",
      suggestedDelay: 600,
    }
  }

  // High emotion: respond reflectively, no questions, longer pause
  if (state.emotion === "high") {
    return {
      shouldRespond: true,
      shouldAskQuestion: false,
      shouldSuppressResponse: false,
      responseStyle: "reflective",
      suggestedDelay: 800,
    }
  }

  // Venting: reflect back, hold space, no steering
  if (state.intent === "vent") {
    return {
      shouldRespond: true,
      shouldAskQuestion: false,
      shouldSuppressResponse: false,
      responseStyle: "reflective",
      suggestedDelay: 600,
    }
  }

  // Asking: collaborative, can ask a clarifying question
  if (state.intent === "ask") {
    return {
      shouldRespond: true,
      shouldAskQuestion: mode === "think_with_me",
      shouldSuppressResponse: false,
      responseStyle: "collaborative",
      suggestedDelay: 200,
    }
  }

  // Reflect mode: gentle, one question allowed
  if (mode === "reflect") {
    return {
      shouldRespond: true,
      shouldAskQuestion: state.intent === "reflect",
      shouldSuppressResponse: false,
      responseStyle: "reflective",
      suggestedDelay: 400,
    }
  }

  // Default: think with me, collaborative
  return {
    shouldRespond: true,
    shouldAskQuestion: true,
    shouldSuppressResponse: false,
    responseStyle: "collaborative",
    suggestedDelay: 200,
  }
}
