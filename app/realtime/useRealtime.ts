import { useEffect, useRef, useState } from "react"
import {
  initRealTime,
  stopRealTime,
  updateRealtimeMode,
  updateRealtimeSessionInstructions,
} from "./client"
import { setCurrentMode } from "./handlers"
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

export function useRealTime(options?: UseRealTimeOptions) {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const onTurnGuidanceRef = useRef(options?.onTurnGuidance)
  onTurnGuidanceRef.current = options?.onTurnGuidance

  // Listen for behavior layer guidance events
  useEffect(() => {
    const onGuidance = (event: Event) => {
      const customEvent = event as CustomEvent<TurnGuidanceEvent>
      onTurnGuidanceRef.current?.(customEvent.detail)
    }

    window.addEventListener("turn:guidance", onGuidance)
    return () => window.removeEventListener("turn:guidance", onGuidance)
  }, [])

  // Live memory extraction: fire-and-forget every 5 user turns
  useEffect(() => {
    const onExtractionTick = (event: Event) => {
      const customEvent = event as CustomEvent<{ turns: string[] }>
      const { turns } = customEvent.detail

      fetch("/api/memory/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turns }),
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
      await initRealTime(options)
      setConnected(true)
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = () => {
    stopRealTime()
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
    connect,
    disconnect,
    updateInstructions,
    setMode,
  }
}
