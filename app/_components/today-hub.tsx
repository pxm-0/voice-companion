"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useMemo, type FormEvent } from "react"
import { buildInstructions, getModeDescription, getModeLabel } from "@/lib/brain"
import type {
  CompanionMode,
  FinalizeSessionResponse,
  TodayHubData,
} from "@/lib/session-types"
import { COMPANION_MODES } from "@/lib/session-types"
import { TaskList } from "@/app/_components/task-list"
import { useRealTime } from "@/app/realtime/useRealtime"
import type { TranscriptTurn } from "@/app/realtime/types"
import type { TurnGuidanceEvent } from "@/app/realtime/useRealtime"

function upsertTurn(turns: TranscriptTurn[], next: TranscriptTurn) {
  const existingIndex = turns.findIndex((turn) => turn.id === next.id)
  if (existingIndex === -1) return [...turns, next]
  const updated = [...turns]
  updated[existingIndex] = next
  return updated
}

type TodayHubProps = {
  data: TodayHubData
}

export function TodayHub({ data }: TodayHubProps) {
  const router = useRouter()
  const [mode, setModeState] = useState<CompanionMode>("think_with_me")
  const [showModeMenu, setShowModeMenu] = useState(false)
  const [turns, setTurns] = useState<TranscriptTurn[]>([])
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedSession, setSavedSession] = useState<FinalizeSessionResponse | null>(null)
  const [showManualLog, setShowManualLog] = useState(false)
  const [manualText, setManualText] = useState("")
  const [manualState, setManualState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [manualError, setManualError] = useState<string | null>(null)
  const [guidanceEvent, setGuidanceEvent] = useState<TurnGuidanceEvent | null>(null)
  const [overlayLeaving, setOverlayLeaving] = useState(false)
  const [timeGreeting, setTimeGreeting] = useState("Good morning.")
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)
  const modeMenuRef = useRef<HTMLDivElement | null>(null)
  const prevViewStateRef = useRef<'idle' | 'connecting' | 'listening' | 'processing' | 'responding' | null>(null)

  const { connected, connecting, connect, disconnect, updateInstructions, setMode } = useRealTime({
    onTurnGuidance: setGuidanceEvent,
  })

  // Time-of-day greeting (client-only to avoid hydration mismatch)
  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setTimeGreeting("Good morning.")
    else if (h < 17) setTimeGreeting("Good afternoon.")
    else setTimeGreeting("Good evening.")
  }, [])

  // Persist mode across sessions
  useEffect(() => {
    const savedMode = window.localStorage.getItem("companion-mode")
    if (savedMode && COMPANION_MODES.includes(savedMode as CompanionMode)) {
      setModeState(savedMode as CompanionMode)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem("companion-mode", mode)
    setMode(mode)
  }, [mode, setMode])

  // Transcript event listeners
  useEffect(() => {
    const onTranscriptUpdate = (event: Event) => {
      const e = event as CustomEvent<TranscriptTurn>
      setTurns((prev) => upsertTurn(prev, e.detail))
    }
    const onTranscriptFinal = (event: Event) => {
      const e = event as CustomEvent<TranscriptTurn>
      setTurns((prev) => upsertTurn(prev, { ...e.detail, status: "final" }))
    }
    window.addEventListener("transcript:update", onTranscriptUpdate)
    window.addEventListener("transcript:final", onTranscriptFinal)
    return () => {
      window.removeEventListener("transcript:update", onTranscriptUpdate)
      window.removeEventListener("transcript:final", onTranscriptFinal)
    }
  }, [])

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [turns])

  // Close mode menu on outside click
  useEffect(() => {
    if (!showModeMenu) return
    const handler = (e: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setShowModeMenu(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showModeMenu])

  const latestPatternSummary = useMemo(() => {
    for (const session of data.sessions) {
      if (session.artifact?.patternSummary) return session.artifact.patternSummary
    }
    return null
  }, [data.sessions])

  const instructions = useMemo(
    () =>
      buildInstructions({
        mode,
        profileSummary: data.profile.summary,
        patternSummary: latestPatternSummary,
        memories: data.profile.memories,
      }),
    [data.profile.memories, data.profile.summary, latestPatternSummary, mode],
  )

  useEffect(() => {
    if (connected) {
      updateInstructions(instructions)
    }
  }, [connected, instructions, updateInstructions])

  const isHighEmotion =
    guidanceEvent?.state.emotion === "high" || guidanceEvent?.state.intent === "vent"

  async function handleConnect() {
    setTurns([])
    setSavedSession(null)
    setSaveState("idle")
    setSaveError(null)
    setSessionStartedAt(new Date().toISOString())
    setGuidanceEvent(null)

    try {
      await connect({ instructions, mode })
      window.dispatchEvent(new CustomEvent("session:start"))
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
    window.dispatchEvent(new CustomEvent("session:end"))
    setSessionStartedAt(null)
    setGuidanceEvent(null)

    if (!sessionStartedAt || turnsToPersist.length === 0) {
      setSaveState("idle")
      return
    }

    setSaveState("saving")
    setSaveError(null)

    try {
      const response = await fetch("/api/sessions/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startedAt: sessionStartedAt,
          endedAt,
          turns: turnsToPersist,
          mode,
          inputType: "voice",
        }),
      })

      const result = (await response.json()) as FinalizeSessionResponse | { error?: string }
      if (!response.ok) {
        throw new Error(
          "error" in result ? result.error ?? "Failed to save session." : "Failed to save session.",
        )
      }

      setSavedSession(result as FinalizeSessionResponse)
      setSaveState("saved")
      router.refresh()
    } catch (error) {
      setSaveState("error")
      setSaveError(error instanceof Error ? error.message : "Failed to save session.")
    }
  }

  // Allow nav "End session" button to trigger disconnect
  useEffect(() => {
    const handler = () => { void handleDisconnect() }
    window.addEventListener("session:request-end", handler)
    return () => window.removeEventListener("session:request-end", handler)
  }, [turns, sessionStartedAt, mode, connected])

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!manualText.trim()) {
      setManualState("error")
      setManualError("Write a quick note first.")
      return
    }

    setManualState("saving")
    setManualError(null)

    try {
      const response = await fetch("/api/sessions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: manualText, mode }),
      })

      const result = (await response.json()) as FinalizeSessionResponse | { error?: string }
      if (!response.ok) {
        throw new Error(
          "error" in result
            ? result.error ?? "Failed to save manual entry."
            : "Failed to save manual entry.",
        )
      }

      setSavedSession(result as FinalizeSessionResponse)
      setManualState("saved")
      setManualText("")
      setShowManualLog(false)
      router.refresh()
    } catch (error) {
      setManualState("error")
      setManualError(error instanceof Error ? error.message : "Failed to save manual entry.")
    }
  }

  const viewState: 'idle' | 'connecting' | 'listening' | 'processing' | 'responding' =
    connecting ? 'connecting'
    : connected ? 'listening'
    : saveState === 'saving' ? 'processing'
    : saveState === 'saved' && savedSession ? 'responding'
    : 'idle'

  const overlayVisible = viewState === 'listening' || viewState === 'connecting' || viewState === 'processing' || overlayLeaving

  // Trigger exit animation when leaving an overlay state
  useEffect(() => {
    const prev = prevViewStateRef.current
    prevViewStateRef.current = viewState
    if (prev === null) return
    const wasOverlay = prev === 'listening' || prev === 'connecting' || prev === 'processing'
    const isNoLongerOverlay = viewState === 'responding' || viewState === 'idle'
    if (wasOverlay && isNoLongerOverlay) {
      setOverlayLeaving(true)
      const t = setTimeout(() => setOverlayLeaving(false), 220)
      return () => clearTimeout(t)
    }
  }, [viewState])

  return (
    <>
      {/* ── Session active overlay ── */}
      {overlayVisible && (
        <div className={`fixed inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#f5ede2_0%,#efe4d6_60%,#e8ddcf_100%)] ${overlayLeaving ? 'animate-overlay-exit' : 'animate-overlay-enter'}`}>
          {/* Minimal session header */}
          <div className="flex items-center justify-between border-b border-[#dacbb7] bg-[rgba(245,237,226,0.92)] px-6 py-4 backdrop-blur-xl">
            <span className="font-[family-name:Georgia,serif] text-2xl text-[#2f241d]">eli</span>
            <div className="flex items-center gap-3">
              {guidanceEvent && connected && (
                <span
                  className={`h-2 w-2 rounded-full ${isHighEmotion ? "bg-[#c96a58]" : "bg-[#7aad82]"}`}
                  title={guidanceEvent.state.intent}
                />
              )}
              <span className="text-sm text-[#7a624f]">
                {viewState === 'processing' ? "Drafting…" : connected ? "Listening live" : "Starting…"}
              </span>
            </div>
          </div>

          {/* Orb + content area */}
          <div className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-4 py-8">
            {viewState === 'processing' ? (
              /* ── Processing state: calm rotating orb, no stop button ── */
              <>
                <div
                  aria-label="Drafting your entry"
                  className="animate-orb-processing relative flex h-52 w-52 flex-shrink-0 items-center justify-center rounded-full border border-[#c7a47e] bg-[radial-gradient(circle_at_35%_30%,#f1dfbf_0%,#c7a47e_42%,#7f664f_100%)]"
                >
                  <span className="pointer-events-none absolute inset-3 rounded-full border border-white/20" />
                </div>
                <p className="text-sm text-[#7a6858]">Drafting your entry…</p>
              </>
            ) : (
              /* ── Listening / connecting state: transcript + stop button ── */
              <>
                <button
                  disabled
                  aria-label="Eli is listening"
                  className={`relative flex h-52 w-52 flex-shrink-0 items-center justify-center rounded-full border ${
                    connected
                      ? isHighEmotion
                        ? "animate-breathe-high border-[#ba6e58] bg-[radial-gradient(circle_at_35%_30%,#f2907a_0%,#c96d58_42%,#7a3f33_100%)]"
                        : "animate-breathe border-[#ba6e58] bg-[radial-gradient(circle_at_35%_30%,#f2a08b_0%,#c96d58_42%,#7a3f33_100%)]"
                      : "border-[#c7a47e] bg-[radial-gradient(circle_at_35%_30%,#f1dfbf_0%,#c7a47e_42%,#7f664f_100%)]"
                  }`}
                >
                  <span className="pointer-events-none absolute inset-3 rounded-full border border-white/20" />
                  {guidanceEvent && connected && (
                    <span className="relative text-xs capitalize text-white/70">
                      {guidanceEvent.state.intent}
                    </span>
                  )}
                </button>

                {/* Transcript */}
                <div className="w-full max-w-xl">
                  <div
                    className="h-[38vh] overflow-y-auto pr-1"
                    role="log"
                    aria-live="polite"
                    aria-atomic="false"
                  >
                    <div className="space-y-3">
                      {turns.length === 0 ? (
                        <p className="py-8 text-center text-sm text-[#7a6858]">
                          Your words will appear here as you speak.
                        </p>
                      ) : (
                        turns.map((turn) => (
                          <article
                            key={turn.id}
                            className={`animate-slide-up max-w-[90%] rounded-[24px] border px-4 py-3 shadow-[0_8px_24px_rgba(111,81,56,0.08)] ${
                              turn.role === "user"
                                ? "ml-auto border-[#d9b08d] bg-[#f7e5d4] text-[#3a2c22]"
                                : "mr-auto border-[#d6d8c7] bg-[#eef1e7] text-[#243126]"
                            }`}
                          >
                            <span className="text-[11px] uppercase tracking-[0.26em] text-black/45">
                              {turn.role === "user" ? "You" : "Eli"}
                            </span>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                              {turn.text || "…"}
                            </p>
                          </article>
                        ))
                      )}
                      <div ref={transcriptEndRef} />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => void handleDisconnect()}
                  disabled={!connected}
                  aria-label="Stop and save this session"
                  className="pressable min-h-[48px] w-full max-w-xs rounded-full bg-[#5c735f] px-6 py-3 text-sm font-medium text-[#f7fbf5] transition-colors hover:bg-[#49604c] disabled:opacity-50"
                >
                  Stop and save
                </button>

                {saveState === "error" && (
                  <p className="text-sm text-[#9c4c40]">{saveError ?? "The session could not be finalized."}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Ambient home ── */}
      <main className="min-h-full bg-[linear-gradient(180deg,#f5ede2_0%,#efe4d6_42%,#e8ddcf_100%)] px-4 py-10 text-[#2f241d] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-10">

          {/* Greeting + orb + mode */}
          <section className="flex flex-col items-center gap-6 text-center">
            <div>
              <h1 className="font-[family-name:Georgia,serif] text-4xl text-[#31251d] sm:text-5xl">
                {timeGreeting}
              </h1>
              <p className="mt-2 text-sm text-[#7d6959]">
                {data.sessions.length === 0
                  ? "Nothing captured yet today."
                  : `${data.sessions.length} ${data.sessions.length === 1 ? "entry" : "entries"} today`}
              </p>
            </div>

            {/* Orb */}
            <button
              id="voice-session-button"
              onClick={() => void handleConnect()}
              disabled={connecting}
              aria-label={connecting ? "Connecting to Eli, please wait" : "Start voice session with Eli"}
              className={`pressable relative flex h-48 w-48 items-center justify-center rounded-full border transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#a86a4a] focus-visible:ring-offset-4 ${
                connecting
                  ? "cursor-wait border-[#c7a47e] bg-[radial-gradient(circle_at_35%_30%,#f1dfbf_0%,#c7a47e_42%,#7f664f_100%)]"
                  : "animate-breathe-gentle border-[#b9825d] bg-[radial-gradient(circle_at_35%_30%,#f4ceb0_0%,#d4976d_42%,#8e5a43_100%)] hover:scale-[1.015]"
              }`}
            >
              <span className="pointer-events-none absolute inset-3 rounded-full border border-white/20" />
              {connecting && (
                <span className="relative text-xs uppercase tracking-[0.28em] text-white/70">
                  Starting…
                </span>
              )}
            </button>

            {/* Idle prompt — only shown when no session recorded today */}
            {viewState === 'idle' && data.sessions.length === 0 && (
              <p className="text-sm text-[#9f7c63]">Start anywhere.</p>
            )}

            {/* Mode pill */}
            <div className="relative" ref={modeMenuRef}>
              <button
                onClick={() => setShowModeMenu((v) => !v)}
                aria-label="Change companion mode"
                aria-expanded={showModeMenu}
                aria-haspopup="listbox"
                className="flex items-center gap-1.5 rounded-full border border-[#dccab4] bg-[#fff9f1] px-4 py-2 text-sm text-[#654f40] transition-colors hover:bg-[#f8efe4]"
              >
                {getModeLabel(mode)}
                <span className="text-[#9f7c63] text-xs">▾</span>
              </button>

              {showModeMenu && (
                <div
                  className="absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-[20px] border border-[#dccab4] bg-[#fffaf1] p-2 shadow-[0_16px_40px_rgba(92,63,39,0.14)]"
                  role="listbox"
                  aria-label="Companion mode"
                >
                  {COMPANION_MODES.map((value) => (
                    <button
                      key={value}
                      role="option"
                      aria-selected={value === mode}
                      onClick={() => {
                        setModeState(value)
                        setShowModeMenu(false)
                      }}
                      className={`w-full rounded-[16px] px-4 py-3 text-left transition-colors ${
                        value === mode
                          ? "border-l-4 border-[#a86a4a] bg-[#fff3e8] text-[#31251d]"
                          : "text-[#654f40] hover:bg-[#f8efe4]"
                      }`}
                    >
                      <p className="font-[family-name:Georgia,serif] text-base">{getModeLabel(value)}</p>
                      <p className="mt-0.5 text-xs leading-5 text-[#7d6959]">{getModeDescription(value)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Post-session staggered reveal */}
            {viewState === 'responding' && savedSession && (
              <>
                {/* Summary card — reveals immediately */}
                <div className="animate-reveal-up w-full rounded-[28px] border border-[#dfd2bf] bg-[#fff8ee] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Just saved</p>
                      <h3 className="mt-2 font-[family-name:Georgia,serif] text-xl text-[#31251d]">
                        {savedSession.artifact?.title ?? "New entry"}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#695646]">
                        {savedSession.artifact?.summary ?? "Your session was saved."}
                      </p>
                    </div>
                    <Link
                      href={`/sessions/${savedSession.sessionId}`}
                      className="shrink-0 rounded-full border border-[#dccab4] bg-[#fff9f1] px-3 py-1.5 text-xs text-[#7d4f39] transition-colors hover:bg-[#f8efe4]"
                    >
                      Read →
                    </Link>
                  </div>
                </div>

                {/* Rapid-log bullets — reveal after 1.5 s with task-ping */}
                {savedSession.artifact?.rapidLogBullets && savedSession.artifact.rapidLogBullets.length > 0 && (
                  <div className="animate-reveal-up-delay w-full rounded-[28px] border border-[#dfd2bf] bg-[#fff8ee] p-5">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">From this session</p>
                    <ul className="mt-3 space-y-2">
                      {savedSession.artifact.rapidLogBullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="animate-task-ping flex items-start gap-2 rounded-[12px] text-sm text-[#564539]"
                        >
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#b78063]" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {saveState === "error" && viewState === 'idle' && (
              <p className="text-sm text-[#9c4c40]">{saveError ?? "The session could not be finalized."}</p>
            )}

            {/* Manual log */}
            {!showManualLog ? (
              <button
                onClick={() => setShowManualLog(true)}
                className="py-2.5 text-sm text-[#7d4f39] underline decoration-[#cf9c7d] underline-offset-4"
              >
                Write a note instead
              </button>
            ) : (
              <form
                onSubmit={(event) => void handleManualSubmit(event)}
                className="w-full space-y-3 text-left"
              >
                <textarea
                  id="manual-log-textarea"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  rows={5}
                  autoFocus
                  placeholder="What feels worth capturing right now?"
                  className="w-full resize-none rounded-[24px] border border-[#e2d4c3] bg-[#fffdf8] px-4 py-4 text-sm leading-7 text-[#2f241d] outline-none transition-colors focus:border-[#d2a17f]"
                />
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setShowManualLog(false)}
                    className="text-sm text-[#9f7c63]"
                  >
                    Cancel
                  </button>
                  <button
                    id="manual-log-submit"
                    type="submit"
                    disabled={manualState === "saving"}
                    className="rounded-full bg-[#5c735f] px-5 py-2 text-sm font-medium text-[#f7fbf5] transition-colors hover:bg-[#49604c] disabled:opacity-70"
                  >
                    {manualState === "saving" ? "Saving…" : "Save"}
                  </button>
                </div>
                {manualState === "error" && (
                  <p className="text-sm text-[#9c4c40]">{manualError}</p>
                )}
                {manualState === "saved" && (
                  <p className="text-sm text-[#4f654f]">Saved.</p>
                )}
              </form>
            )}
          </section>

          {/* ── Today's entries ── */}
          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#7a5e4a]">
                  Today&apos;s Entries
                </p>
                <h2 className="mt-2 font-[family-name:Georgia,serif] text-2xl text-[#31251d]">
                  Session artifacts, not just records.
                </h2>
              </div>
              <Link
                href="/sessions"
                className="shrink-0 text-sm text-[#7d4f39] underline decoration-[#cf9c7d] underline-offset-4"
              >
                All entries
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {data.sessions.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#d9cbb7] bg-[#fffaf1] p-6 text-sm leading-7 text-[#756353]">
                  No entries yet today. Start a voice session or write a quick note.
                </div>
              ) : (
                data.sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="hover-lift block rounded-[28px] border border-[#dfd2bf] bg-[#fff8ee] p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#d7b79a] bg-[#f9efe2] px-3 py-1 text-xs text-[#7c5b45]">
                        {session.inputType === "voice" ? "Voice" : "Manual"}
                      </span>
                      <span className="rounded-full border border-[#e1d4c2] bg-white px-3 py-1 text-xs text-[#8e7d6c]">
                        {getModeLabel(session.mode)}
                      </span>
                      <span className="rounded-full border border-[#e1d4c2] bg-white px-3 py-1 text-xs text-[#8e7d6c]">
                        {session.tasks.filter((task) => !task.completed).length} open tasks
                      </span>
                    </div>

                    <h3 className="mt-4 font-[family-name:Georgia,serif] text-xl text-[#31251d]">
                      {session.artifact?.title ?? "Untitled entry"}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[#695646]">
                      {session.artifact?.summary ??
                        "This entry was saved, but the artifact still needs processing."}
                    </p>

                    {session.artifact?.rapidLogBullets?.length ? (
                      <ul className="mt-4 space-y-2 text-sm text-[#564539]">
                        {session.artifact.rapidLogBullets.slice(0, 3).map((bullet) => (
                          <li key={bullet} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#b78063]" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* ── Open tasks ── */}
          <section>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#7a5e4a]">Open Tasks</p>
            <h2 className="mt-2 font-[family-name:Georgia,serif] text-2xl text-[#31251d]">
              Loose ends worth keeping warm.
            </h2>
            <div className="mt-5">
              <TaskList
                tasks={data.openTasks}
                emptyCopy="No open tasks right now. When a session suggests a concrete next step, it will appear here."
                showSessionLink
              />
            </div>
          </section>

        </div>
      </main>
    </>
  )
}
