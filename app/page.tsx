"use client"

import { useRealTime } from "./realtime/useRealtime"

export default function Home() {
  const { connected, connect } = useRealTime()

  return (
    <div>
      <button onClick={ connect }>
        { connected ? "Connected!" : "Start" }
      </button>
    </div>
    )
  }