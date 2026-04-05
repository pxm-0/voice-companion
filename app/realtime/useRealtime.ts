import { useState } from "react"
import { initRealTime, stopRealTime, updateRealtimeSessionInstructions } from "./client"

export function useRealTime() {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const connect = async (options?: { instructions?: string }) => {
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

  return {
    connected,
    connecting,
    connect,
    disconnect,
    updateInstructions,
  }
}
