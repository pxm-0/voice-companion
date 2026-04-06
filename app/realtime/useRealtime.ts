import { useEffect, useRef, useState } from "react"
import {
  initRealTime,
  stopRealTime,
  updateRealtimeMode,
  updateRealtimeSessionInstructions,
  sendRealtimeEvent,
} from "./client"
import { setCurrentMode, setCurrentSessionId, flushExtractionBuffer } from "./handlers"
import { getResponseDelay } from "@/lib/timing"
import type { CompanionMode } from "@/lib/session-types"
import type { ConversationState } from "@/lib/state"
import type { TurnGuidance } from "@/lib/turn"

export type TurnGuidanceEvent = {
  state: ConversationState
  guidance: TurnGuidance
}

type UseRealTimeOptions = {
  onTurnGuidance?: (event: TurnGuidanceEvent) => void
}

function buildInstructionFragment(
  style: "reflective" | "collaborative" | "brief" | "silent",
  shouldAskQuestion: boolean,
): string {
  switch (style) {
    case "reflective":
      return "In this moment, respond gently and reflectively. Mirror what the user expressed without steering them. Do not ask questions. Keep your response short and warm."
    case "collaborative":
      return shouldAskQuestion
        ? "Think alongside the user. Stay curious and collaborative. You may ask one clarifying question if it genuinely helps."
        : "Think alongside the user. Stay collaborative and engaged. Keep your response concise."
    case "brief":
      return "The user is journaling. Acknowledge briefly and warmly, then let them continue. Do not ask questions."
    case "silent":
      return ""
  }
}

export function useRealTime(options?: UseRealTimeOptions) {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const onTurnGuidanceRef = useRef(options?.onTurnGuidance)
  onTurnGuidanceRef.current = options?.onTurnGuidance
  const lastResponseStyleRef = useRef<string | null>(null)

  // Listen for behavior layer guidance events — Phase 3: activate behavior layer
  useEffect(() => {
    const onGuidance = (event: Event) => {
      const customEvent = event as CustomEvent<TurnGuidanceEvent>
      const { state, guidance } = customEvent.detail

      // Forward to external callback if provided
      onTurnGuidanceRef.current?.({ state, guidance })

      // Skip if style hasn't changed (avoid spamming session.update)
      if (guidance.responseStyle === lastResponseStyleRef.current) return
      lastResponseStyleRef.current = guidance.responseStyle

      // Suppression: cancel any in-progress assistant response
      if (guidance.shouldSuppressResponse) {
        sendRealtimeEvent({ type: "response.cancel" })
        return
      }

      if (guidance.responseStyle === "silent") return

      // Build instruction fragment for this state
      const fragment = buildInstructionFragment(guidance.responseStyle, guidance.shouldAskQuestion)

      // Apply suggestedDelay before sending session.update
      const delay = getResponseDelay(state)
      setTimeout(() => {
        updateRealtimeSessionInstructions(fragment)
      }, delay)
    }

    window.addEventListener("turn:guidance", onGuidance)
    return () => window.removeEventListener("turn:guidance", onGuidance)
  }, [])

  // Live memory extraction: fire-and-forget every 5 user turns
  useEffect(() => {
    const onExtractionTick = (event: Event) => {
      const customEvent = event as CustomEvent<{ turns: string[]; sessionId: string | null }>
      const { turns, sessionId: tickSessionId } = customEvent.detail

      fetch("/api/memory/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turns, sessionId: tickSessionId }),
      }).catch(() => {
        // Non-blocking — extraction failures never surface to the user
      })
    }

    window.addEventListener("extraction:tick", onExtractionTick)
    return () => window.removeEventListener("extraction:tick", onExtractionTick)
  }, [])

  const connect = async (options?: { instructions?: string; mode?: CompanionMode }) => {
    if (connected || connecting) return

    setConnecting(true)

    try {
      // Pre-create the session to get a sessionId for attribution
      const startRes = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: options?.mode ?? "think_with_me" }),
      })

      if (startRes.ok) {
        const { sessionId: newSessionId } = (await startRes.json()) as { sessionId: string }
        setSessionId(newSessionId)
        sessionIdRef.current = newSessionId
        setCurrentSessionId(newSessionId)
      }

      await initRealTime(options)
      setConnected(true)
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = () => {
    flushExtractionBuffer() // flush any buffered turns before disconnecting
    stopRealTime()
    setSessionId(null)
    sessionIdRef.current = null
    setConnected(false)
    setConnecting(false)
  }

  const updateInstructions = (instructions: string) => {
    if (!connected) return
    updateRealtimeSessionInstructions(instructions)
  }

  const setMode = (mode: CompanionMode) => {
    setCurrentMode(mode)
    updateRealtimeMode(mode)
  }

  return {
    connected,
    connecting,
    sessionId,
    connect,
    disconnect,
    updateInstructions,
    setMode,
  }
}
