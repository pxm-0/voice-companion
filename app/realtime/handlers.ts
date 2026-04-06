/**
 * app/realtime/handlers.ts — Realtime event handler layer
 *
 * Owns all event logic separated from pure WebRTC transport (client.ts).
 * Integrates the behavior layer: state detection, turn guidance, extraction ticks.
 */

import { detectState } from "@/lib/state"
import { handleTurn } from "@/lib/turn"
import type { CompanionMode } from "@/lib/session-types"
import type { TranscriptTurn } from "./types"

// ─── Mode state ────────────────────────────────────────────────────────────

let currentMode: CompanionMode = "think_with_me"

export function setCurrentMode(mode: CompanionMode) {
  currentMode = mode
}

// ─── Session state ──────────────────────────────────────────────────────────

let currentSessionId: string | null = null

export function setCurrentSessionId(id: string | null) {
  currentSessionId = id
}

// ─── Turn state ─────────────────────────────────────────────────────────────

let turnCounter = 0
let activeAssistantTurnId: string | null = null
let assistantTextBuffer = ""
let assistantHasAudioTranscript = false
let assistantTurnFinalized = false

function nextTurnId(role: "user" | "assistant") {
  turnCounter += 1
  return `${role}-${Date.now()}-${turnCounter}`
}

// ─── Extraction buffer ───────────────────────────────────────────────────────

const EXTRACTION_TICK_EVERY = 5
let userTurnBuffer: string[] = []

function checkExtractionTick(text: string) {
  userTurnBuffer.push(text)
  if (userTurnBuffer.length >= EXTRACTION_TICK_EVERY) {
    const batch = [...userTurnBuffer]
    userTurnBuffer = []
    window.dispatchEvent(
      new CustomEvent<{ turns: string[]; sessionId: string | null }>("extraction:tick", {
        detail: { turns: batch, sessionId: currentSessionId },
      }),
    )
  }
}

export function flushExtractionBuffer() {
  if (userTurnBuffer.length === 0) return
  const batch = [...userTurnBuffer]
  userTurnBuffer = []
  window.dispatchEvent(
    new CustomEvent<{ turns: string[]; sessionId: string | null }>("extraction:tick", {
      detail: { turns: batch, sessionId: currentSessionId },
    }),
  )
}

// ─── Transcript events ───────────────────────────────────────────────────────

export function emitTranscriptEvent(
  type: "transcript:update" | "transcript:final",
  detail: TranscriptTurn,
) {
  window.dispatchEvent(new CustomEvent<TranscriptTurn>(type, { detail }))
}

// ─── Behavior dispatch ───────────────────────────────────────────────────────

function emitTurnGuidance(text: string, isInterrupting = false) {
  const state = detectState(text)
  const guidance = handleTurn({ text, state, mode: currentMode, isInterrupting })
  window.dispatchEvent(
    new CustomEvent("turn:guidance", { detail: { state, guidance } }),
  )
}

// ─── Assistant turn management ───────────────────────────────────────────────

function ensureAssistantTurn() {
  if (activeAssistantTurnId) return activeAssistantTurnId

  activeAssistantTurnId = nextTurnId("assistant")
  assistantTextBuffer = ""
  assistantHasAudioTranscript = false
  assistantTurnFinalized = false

  return activeAssistantTurnId
}

function emitAssistantUpdate() {
  const id = ensureAssistantTurn()
  emitTranscriptEvent("transcript:update", {
    id,
    role: "assistant",
    text: assistantTextBuffer,
    status: "streaming",
  })
}

function finalizeAssistantTurn(finalText?: string) {
  if (!activeAssistantTurnId || assistantTurnFinalized) return

  if (typeof finalText === "string" && finalText.trim().length > 0) {
    assistantTextBuffer = finalText
  }

  emitTranscriptEvent("transcript:final", {
    id: activeAssistantTurnId,
    role: "assistant",
    text: assistantTextBuffer,
    status: "final",
  })

  assistantTurnFinalized = true
  activeAssistantTurnId = null
  assistantTextBuffer = ""
  assistantHasAudioTranscript = false
}

export function resetAssistantState() {
  activeAssistantTurnId = null
  assistantTextBuffer = ""
  assistantHasAudioTranscript = false
  assistantTurnFinalized = false
  currentSessionId = null
  userTurnBuffer = []
}

// ─── Main event router ───────────────────────────────────────────────────────

const DEBUG_REALTIME_EVENTS = false

export function handleServerEvent(data: Record<string, unknown>) {
  const eventType = typeof data.type === "string" ? data.type : ""

  if (DEBUG_REALTIME_EVENTS) {
    console.log("Realtime event:", eventType, data)
  }

  if (eventType === "conversation.item.input_audio_transcription.completed") {
    const text =
      typeof data.transcript === "string"
        ? data.transcript
        : typeof data.text === "string"
          ? data.text
          : ""
    if (!text || !text.trim()) return

    // Detect if user interrupted the assistant mid-response
    const isInterrupting = activeAssistantTurnId !== null && !assistantTurnFinalized
    if (isInterrupting) {
      finalizeAssistantTurn()
    }

    emitTranscriptEvent("transcript:final", {
      id: nextTurnId("user"),
      role: "user",
      text,
      status: "final",
    })

    // Behavior layer: state detection + turn guidance
    emitTurnGuidance(text, isInterrupting)

    // Accumulate for extraction tick
    checkExtractionTick(text)
    return
  }

  if (eventType === "response.output_audio_transcript.delta") {
    const delta = typeof data.delta === "string" ? data.delta : ""
    if (!delta) return

    ensureAssistantTurn()
    assistantHasAudioTranscript = true
    assistantTurnFinalized = false
    assistantTextBuffer += delta
    emitAssistantUpdate()
    return
  }

  if (eventType === "response.output_text.delta") {
    if (assistantHasAudioTranscript) return

    const delta = typeof data.delta === "string" ? data.delta : ""
    if (!delta) return

    ensureAssistantTurn()
    assistantTurnFinalized = false
    assistantTextBuffer += delta
    emitAssistantUpdate()
    return
  }

  if (eventType === "response.output_audio_transcript.done") {
    const transcript = typeof data.transcript === "string" ? data.transcript : undefined
    finalizeAssistantTurn(transcript)
    return
  }

  if (eventType === "response.done") {
    finalizeAssistantTurn()
  }
}
