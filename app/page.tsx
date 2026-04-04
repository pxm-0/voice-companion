"use client"

import { useRealTime } from "./realtime/useRealtime"

export default function Home() {
  const { connected, start } = useRealTime()

  return (
    <div>
      <button onClick={ start }>
        { connected ? "Connected!" : "Start" }
      </button>
    </div>
    )
  }