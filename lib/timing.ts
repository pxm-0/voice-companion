/**
 * lib/timing.ts — Silence detection + response delay
 *
 * Architecture cleanup module from reference.txt spec.
 * Handles timing logic for the companion voice loop:
 * - silence detection (when to trigger end-of-turn)
 * - response delay (pacing based on emotional state)
 * - session pacing defaults
 */

import type { ConversationState } from "@/lib/state"

// --- Types ---

export type SilenceTimerHandle = ReturnType<typeof setTimeout>

export type TimingConfig = {
  /** Ms of silence before onSilence fires. Default 1500ms. */
  silenceThresholdMs: number
  /** Ms delay before the companion responds after turn end. */
  responseDelayMs: number
}

// --- Silence detection ---

let silenceTimer: SilenceTimerHandle | null = null

/**
 * Start a silence detection timer.
 * Resets on each call. When silence threshold is reached, fires onSilence.
 */
export function startSilenceTimer(
  onSilence: () => void,
  thresholdMs = 1500,
): void {
  clearSilenceTimer()
  silenceTimer = setTimeout(onSilence, thresholdMs)
}

/**
 * Clear the active silence timer (e.g. when user resumes speaking).
 */
export function clearSilenceTimer(): void {
  if (silenceTimer !== null) {
    clearTimeout(silenceTimer)
    silenceTimer = null
  }
}

// --- Response delay ---

/**
 * Returns the appropriate response delay in ms based on emotional state and mode.
 *
 * High emotion → longer pause (give space)
 * Neutral/casual → short pause (keep the conversation flowing)
 */
export function getResponseDelay(state: ConversationState): number {
  if (state.emotion === "high") return 800
  if (state.intent === "vent") return 600
  if (state.intent === "reflect") return 400
  return 200
}

/**
 * Returns the full timing configuration for a given state.
 */
export function getTimingConfig(state: ConversationState): TimingConfig {
  return {
    silenceThresholdMs:
      state.emotion === "high" ? 2000 : state.intent === "vent" ? 1800 : 1500,
    responseDelayMs: getResponseDelay(state),
  }
}
