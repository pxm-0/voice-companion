"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRealTime } from "./realtime/useRealtime"
import type { TranscriptTurn } from "./realtime/types"
import type { FinalizeSessionResponse } from "@/lib/session-types"

function upsertTurn(turns: TranscriptTurn[], next: TranscriptTurn) {
  const existingIndex = turns.findIndex((turn) => turn.id === next.id)

  if (existingIndex === -1) {
    return [...turns, next]
  }

  const updated = [...turns]
  updated[existingIndex] = next
  return updated
}

export default function Home() {
  const { connected, connecting, connect, disconnect } = useRealTime()
  const [turns, setTurns] = useState<TranscriptTurn[]>([])
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedSession, setSavedSession] = useState<FinalizeSessionResponse | null>(null)

  useEffect(() => {
    const onTranscriptUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<TranscriptTurn>
      setTurns((prev) => upsertTurn(prev, customEvent.detail))
    }

    const onTranscriptFinal = (event: Event) => {
      const customEvent = event as CustomEvent<TranscriptTurn>
      setTurns((prev) => upsertTurn(prev, { ...customEvent.detail, status: "final" }))
    }

    window.addEventListener("transcript:update", onTranscriptUpdate)
    window.addEventListener("transcript:final", onTranscriptFinal)

    return () => {
      window.removeEventListener("transcript:update", onTranscriptUpdate)
      window.removeEventListener("transcript:final", onTranscriptFinal)
    }
  }, [])

  const transcriptCount = turns.length
  const latestTurn = transcriptCount > 0 ? turns[transcriptCount - 1] : null

  async function handleConnect() {
    setTurns([])
    setSavedSession(null)
    setSaveState("idle")
    setSaveError(null)
    setSessionStartedAt(new Date().toISOString())

    try {
      await connect()
    } catch (error) {
      setSessionStartedAt(null)
      setSaveState("error")
      setSaveError(error instanceof Error ? error.message : "Failed to start the live session.")
    }
  }

  async function handleDisconnect() {
    const endedAt = new Date().toISOString()
    const turnsToPersist = turns
      .filter((turn) => turn.text.trim().length > 0)
      .map((turn) => ({
        id: turn.id,
        role: turn.role,
        text: turn.text,
        status: turn.status,
      }))

    disconnect()
    setSessionStartedAt(null)

    if (!sessionStartedAt || turnsToPersist.length === 0) {
      setSaveState("idle")
      return
    }

    setSaveState("saving")
    setSaveError(null)

    try {
      const response = await fetch("/api/sessions/finalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startedAt: sessionStartedAt,
          endedAt,
          turns: turnsToPersist,
        }),
      })

      const data = (await response.json()) as FinalizeSessionResponse | { error?: string }

      if (!response.ok) {
        throw new Error("error" in data ? data.error || "Failed to finalize session." : "Failed to finalize session.")
      }

      setSavedSession(data as FinalizeSessionResponse)
      setSaveState("saved")
    } catch (error) {
      setSaveState("error")
      setSaveError(error instanceof Error ? error.message : "Failed to finalize session.")
    }
  }

  return (
    <main className="min-h-full overflow-hidden bg-[radial-gradient(circle_at_top,#22304c_0%,#11161f_30%,#090c12_68%,#05070b_100%)] text-[#F4F7FB]">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#8EA5C2]">Live Session</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[0.04em] text-white sm:text-3xl">
              Voice Reflection Console
            </h1>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#B9C6D8] backdrop-blur">
            {transcriptCount} {transcriptCount === 1 ? "turn" : "turns"}
          </div>
        </div>

        <div className="grid flex-1 gap-6 py-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative overflow-hidden rounded-[28px] border border-[#243247] bg-[linear-gradient(160deg,rgba(28,39,58,0.94),rgba(12,17,26,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-8">
            <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(106,163,255,0.28),transparent_70%)]" />

            <div className="relative flex h-full flex-col">
              <div className="flex items-center justify-between gap-4">
                <div className="max-w-md">
                  <p className="text-sm uppercase tracking-[0.28em] text-[#7D93AE]">Phase 1 Surface</p>
                  <p className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                    Realtime voice in, transcript out, ready to validate.
                  </p>
                </div>

                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                    connected
                      ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
                      : connecting
                        ? "border-[#7DA8FF]/35 bg-[#7DA8FF]/10 text-[#D8E6FF]"
                      : "border-white/10 bg-white/5 text-[#A8B6C8]"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      connected ? "bg-emerald-300" : connecting ? "bg-[#A9C5FF]" : "bg-[#6E7C90]"
                    }`}
                  />
                  {connected ? "Listening live" : connecting ? "Connecting" : "Idle"}
                </div>
              </div>

              <div className="flex flex-1 flex-col items-center justify-center py-10">
                <button
                  onClick={connected ? handleDisconnect : handleConnect}
                  disabled={connecting}
                  className={`group relative flex h-44 w-44 items-center justify-center rounded-full border text-center transition-all duration-300 sm:h-52 sm:w-52 ${
                    connected
                      ? "border-[#FF8A7C]/60 bg-[radial-gradient(circle_at_35%_30%,#ff8f7c_0%,#ff6d5f_28%,#6f1f23_100%)] shadow-[0_0_0_12px_rgba(255,110,95,0.08),0_22px_90px_rgba(255,110,95,0.28)] hover:scale-[1.02]"
                      : connecting
                        ? "cursor-wait border-[#7DA8FF]/35 bg-[radial-gradient(circle_at_35%_30%,#7d9fe4_0%,#3e5f9f_30%,#101829_100%)] shadow-[0_0_0_12px_rgba(90,134,255,0.06),0_22px_90px_rgba(63,109,224,0.16)]"
                      : "border-[#7DA8FF]/55 bg-[radial-gradient(circle_at_35%_30%,#93b7ff_0%,#4778d9_30%,#13213c_100%)] shadow-[0_0_0_12px_rgba(90,134,255,0.08),0_22px_90px_rgba(63,109,224,0.26)] hover:scale-[1.02]"
                  }`}
                >
                  <span className="pointer-events-none absolute inset-3 rounded-full border border-white/15" />
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_48%)]" />
                  <span className="relative flex flex-col items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.32em] text-white/70">
                      {connected ? "Session on" : connecting ? "Starting" : "Ready"}
                    </span>
                    <span className="text-2xl font-semibold text-white">
                      {connected ? "Stop" : connecting ? "Wait" : "Start"}
                    </span>
                    <span className="max-w-[9rem] text-xs leading-relaxed text-white/75">
                      {connected
                        ? "End the live session"
                        : connecting
                          ? "Negotiating live audio"
                          : "Begin a spoken check-in"}
                    </span>
                  </span>
                </button>

                <div className="mt-8 grid w-full max-w-xl grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.26em] text-[#7D93AE]">Input</p>
                    <p className="mt-2 text-lg font-medium text-white">Live microphone</p>
                    <p className="mt-1 text-sm text-[#AEBBCC]">
                      User speech is transcribed as finalized turns.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.26em] text-[#7D93AE]">Output</p>
                    <p className="mt-2 text-lg font-medium text-white">Streaming response</p>
                    <p className="mt-1 text-sm text-[#AEBBCC]">
                      Assistant text streams live, then locks on completion.
                    </p>
                  </div>
                </div>

                <div className="mt-8 w-full max-w-xl rounded-[24px] border border-white/10 bg-white/[0.05] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-[#7D93AE]">Session Save</p>
                      <h2 className="mt-2 text-xl font-semibold text-white">Phase 2 finalize flow</h2>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        saveState === "saved"
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                          : saveState === "saving"
                            ? "border-[#7DA8FF]/30 bg-[#7DA8FF]/10 text-[#DDE9FF]"
                            : saveState === "error"
                              ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                              : "border-white/10 bg-white/[0.04] text-[#B7C5D8]"
                      }`}
                    >
                      {saveState === "saved"
                        ? "Saved"
                        : saveState === "saving"
                          ? "Saving"
                          : saveState === "error"
                            ? "Needs attention"
                            : "Waiting"}
                    </span>
                  </div>

                  <div className="mt-4 text-sm leading-7 text-[#C9D5E2]">
                    {saveState === "idle" && (
                      <p>When you stop a live session, we now save the raw transcript, generate a durable summary, and refresh the rolling profile memory.</p>
                    )}

                    {saveState === "saving" && (
                      <p>Saving the session, generating a summary, and updating profile memory now.</p>
                    )}

                    {saveState === "error" && (
                      <p className="text-amber-100">{saveError ?? "The session could not be finalized."}</p>
                    )}

                    {saveState === "saved" && savedSession && (
                      <div className="space-y-3">
                        <p>
                          Session saved as <span className="font-medium text-white">{savedSession.sessionId}</span>.
                        </p>
                        <p>
                          {savedSession.summary
                            ? savedSession.summary.summary
                            : "The raw session was saved, but the summary step still needs attention."}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <Link
                            href={`/sessions/${savedSession.sessionId}`}
                            className="rounded-full border border-[#7DA8FF]/30 bg-[#7DA8FF]/10 px-4 py-2 text-sm text-[#DDE9FF] transition-colors hover:bg-[#7DA8FF]/20"
                          >
                            Open session
                          </Link>
                          <Link
                            href="/sessions"
                            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[#D7E1EE] transition-colors hover:bg-white/[0.08]"
                          >
                            View history
                          </Link>
                          <Link
                            href="/profile"
                            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[#D7E1EE] transition-colors hover:bg-white/[0.08]"
                          >
                            View profile
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex h-[min(70vh,48rem)] min-h-[28rem] flex-col overflow-hidden rounded-[28px] border border-[#243247] bg-[linear-gradient(180deg,rgba(14,19,28,0.96),rgba(8,11,18,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
            <div className="flex items-end justify-between border-b border-white/10 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#7D93AE]">Transcript</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Conversation log</h2>
              </div>

              <div className="text-right text-xs text-[#93A4B8]">
                <p>{latestTurn ? `Latest: ${latestTurn.role}` : "Waiting for first turn"}</p>
                <p>
                  {connected
                    ? "Session active"
                    : connecting
                      ? "Session starting"
                      : saveState === "saving"
                        ? "Finalizing session"
                        : "Session not started"}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="space-y-4">
              {turns.length === 0 && (
                <div className="flex h-full min-h-72 items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                  <div className="max-w-sm">
                    <p className="text-sm uppercase tracking-[0.3em] text-[#7D93AE]">Standby</p>
                    <p className="mt-4 text-2xl font-medium text-white">Your transcript will build here.</p>
                    <p className="mt-3 text-sm leading-7 text-[#9FB0C3]">
                      Start a session, speak naturally, and we&apos;ll stack each user and assistant turn into a readable conversation.
                    </p>
                  </div>
                </div>
              )}

              {turns.map((turn) => (
                <article
                  key={turn.id}
                  className={`max-w-[92%] rounded-3xl border px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.18)] ${
                    turn.role === "user"
                      ? "ml-auto border-[#305287] bg-[linear-gradient(180deg,#1B3354,#13263f)] text-[#EDF4FF]"
                      : "mr-auto border-white/10 bg-[linear-gradient(180deg,#1B1F29,#131722)] text-[#F3F6FA]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] uppercase tracking-[0.26em] text-white/55">
                      {turn.role === "user" ? "You" : "Companion"}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-[0.24em] ${
                        turn.status === "streaming" ? "text-[#9DD3FF]" : "text-white/40"
                      }`}
                    >
                      {turn.status}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-inherit/95">
                    {turn.text || "..."}
                  </p>
                </article>
              ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
