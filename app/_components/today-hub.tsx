"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, type FormEvent } from "react"
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

function upsertTurn(turns: TranscriptTurn[], next: TranscriptTurn) {
  const existingIndex = turns.findIndex((turn) => turn.id === next.id)

  if (existingIndex === -1) {
    return [...turns, next]
  }

  const updated = [...turns]
  updated[existingIndex] = next
  return updated
}

type TodayHubProps = {
  data: TodayHubData
}

export function TodayHub({ data }: TodayHubProps) {
  const router = useRouter()
  const { connected, connecting, connect, disconnect, updateInstructions } = useRealTime()
  const [mode, setMode] = useState<CompanionMode>("think_with_me")
  const [turns, setTurns] = useState<TranscriptTurn[]>([])
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedSession, setSavedSession] = useState<FinalizeSessionResponse | null>(null)
  const [manualText, setManualText] = useState("")
  const [manualState, setManualState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [manualError, setManualError] = useState<string | null>(null)

  useEffect(() => {
    const savedMode = window.localStorage.getItem("companion-mode")
    if (savedMode && COMPANION_MODES.includes(savedMode as CompanionMode)) {
      setMode(savedMode as CompanionMode)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem("companion-mode", mode)
  }, [mode])

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

  const instructions = useMemo(
    () =>
      buildInstructions({
        mode,
        profileSummary: data.profile.summary,
        memories: data.profile.memories,
      }),
    [data.profile.memories, data.profile.summary, mode],
  )

  useEffect(() => {
    if (connected) {
      updateInstructions(instructions)
    }
  }, [connected, instructions, updateInstructions])

  const transcriptCount = turns.length
  const latestTurn = transcriptCount > 0 ? turns[transcriptCount - 1] : null

  async function handleConnect() {
    setTurns([])
    setSavedSession(null)
    setSaveState("idle")
    setSaveError(null)
    setSessionStartedAt(new Date().toISOString())

    try {
      await connect({ instructions })
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
          mode,
          inputType: "voice",
        }),
      })

      const result = (await response.json()) as FinalizeSessionResponse | { error?: string }
      if (!response.ok) {
        throw new Error("error" in result ? result.error || "Failed to save session." : "Failed to save session.")
      }

      setSavedSession(result as FinalizeSessionResponse)
      setSaveState("saved")
      router.refresh()
    } catch (error) {
      setSaveState("error")
      setSaveError(error instanceof Error ? error.message : "Failed to save session.")
    }
  }

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: manualText,
          mode,
        }),
      })

      const result = (await response.json()) as FinalizeSessionResponse | { error?: string }
      if (!response.ok) {
        throw new Error("error" in result ? result.error || "Failed to save manual entry." : "Failed to save manual entry.")
      }

      setSavedSession(result as FinalizeSessionResponse)
      setManualState("saved")
      setManualText("")
      router.refresh()
    } catch (error) {
      setManualState("error")
      setManualError(error instanceof Error ? error.message : "Failed to save manual entry.")
    }
  }

  return (
    <main className="min-h-full bg-[linear-gradient(180deg,#f5ede2_0%,#efe4d6_42%,#e8ddcf_100%)] px-4 py-6 text-[#2f241d] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-[#dbcdb8] bg-[linear-gradient(135deg,#fffaf1_0%,#f7efe2_46%,#efe2d4_100%)] p-6 shadow-[0_24px_70px_rgba(92,63,39,0.10)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#9e7f65]">Today Hub</p>
              <h1 className="mt-3 font-[family-name:Georgia,serif] text-4xl leading-tight text-[#31251d] sm:text-5xl">
                Cozy voice journaling with a second brain behind it.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#705d4e] sm:text-base">
                Start a voice check-in, jot a quick manual log, and let the app turn it into a journal artifact with bullets,
                themes, tasks, and memory you can revisit later.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#dccab4] bg-[#fff9f1]/90 px-5 py-4 text-right shadow-[0_10px_24px_rgba(111,81,56,0.06)]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Today</p>
              <p className="mt-2 font-[family-name:Georgia,serif] text-2xl text-[#382b22]">{data.todayLabel}</p>
              <p className="mt-2 text-sm text-[#7f6b5b]">{data.sessions.length} entries captured today</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {COMPANION_MODES.map((value) => {
              const active = value === mode

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`rounded-full border px-4 py-2 text-sm transition-all ${
                    active
                      ? "border-[#a86a4a] bg-[#a86a4a] text-[#fff8ef] shadow-[0_8px_24px_rgba(168,106,74,0.20)]"
                      : "border-[#d9c9b2] bg-[#fff9f2] text-[#654f40] hover:bg-[#f8efe4]"
                  }`}
                >
                  {getModeLabel(value)}
                </button>
              )
            })}
          </div>

          <p className="mt-3 text-sm text-[#7d6959]">{getModeDescription(mode)}</p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="overflow-hidden rounded-[32px] border border-[#dbcdb8] bg-[#fffaf2] p-6 shadow-[0_18px_50px_rgba(92,63,39,0.08)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Voice Check-In</p>
                <h2 className="mt-2 font-[family-name:Georgia,serif] text-3xl text-[#31251d]">Talk it through out loud.</h2>
                <p className="mt-3 text-sm leading-7 text-[#705d4e]">
                  The voice stack stays fast and natural, while the product quietly turns what you say into a journal entry with
                  tasks, themes, and memory.
                </p>
              </div>

              <div className="rounded-full border border-[#dccab4] bg-[#fff6ea] px-4 py-2 text-sm text-[#7a624f]">
                {connected ? "Listening live" : connecting ? "Connecting" : "Ready"}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-6 xl:flex-row xl:items-start">
              <div className="flex flex-col items-center xl:w-56">
                <button
                  onClick={connected ? handleDisconnect : handleConnect}
                  disabled={connecting}
                  className={`relative flex h-44 w-44 items-center justify-center rounded-full border text-center shadow-[0_18px_40px_rgba(111,81,56,0.15)] transition-transform duration-300 ${
                    connected
                      ? "border-[#ba6e58] bg-[radial-gradient(circle_at_35%_30%,#f2a08b_0%,#c96d58_42%,#7a3f33_100%)] text-white hover:scale-[1.01]"
                      : connecting
                        ? "cursor-wait border-[#c7a47e] bg-[radial-gradient(circle_at_35%_30%,#f1dfbf_0%,#c7a47e_42%,#7f664f_100%)] text-[#fff8ef]"
                        : "border-[#b9825d] bg-[radial-gradient(circle_at_35%_30%,#f4ceb0_0%,#d4976d_42%,#8e5a43_100%)] text-white hover:scale-[1.01]"
                  }`}
                >
                  <span className="pointer-events-none absolute inset-3 rounded-full border border-white/20" />
                  <span className="relative flex flex-col gap-2">
                    <span className="text-[11px] uppercase tracking-[0.28em] text-white/75">
                      {connected ? "Session On" : connecting ? "Starting" : "Ready"}
                    </span>
                    <span className="text-2xl font-semibold">{connected ? "Stop" : connecting ? "Wait" : "Start"}</span>
                    <span className="mx-auto max-w-[9rem] text-xs leading-relaxed text-white/80">
                      {connected ? "Finish and save this session" : "Begin a spoken check-in"}
                    </span>
                  </span>
                </button>

                <div className="mt-5 w-full rounded-[24px] border border-[#e1d2bf] bg-[#fff8ef] p-4 text-sm text-[#6f5a4a]">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Current Mode</p>
                  <p className="mt-2 font-medium text-[#362a21]">{getModeLabel(mode)}</p>
                  <p className="mt-2 leading-6">{getModeDescription(mode)}</p>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4 border-b border-[#eadfce] pb-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Live Notebook</p>
                    <h3 className="mt-2 text-xl font-semibold text-[#31251d]">Conversation in motion</h3>
                  </div>

                  <div className="text-right text-xs text-[#857261]">
                    <p>{transcriptCount} turns</p>
                    <p>
                      {connected
                        ? "Session active"
                        : connecting
                          ? "Session starting"
                          : saveState === "saving"
                            ? "Finalizing session"
                            : "Idle"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-[22rem] overflow-y-auto pr-1">
                  <div className="space-y-3">
                    {turns.length === 0 ? (
                      <div className="flex h-full min-h-72 items-center justify-center rounded-[24px] border border-dashed border-[#ddd0bd] bg-[#fff7ed] p-8 text-center">
                        <div className="max-w-sm">
                          <p className="text-sm uppercase tracking-[0.3em] text-[#9f7c63]">Standby</p>
                          <p className="mt-4 font-[family-name:Georgia,serif] text-2xl text-[#382b22]">Your spoken notes will gather here.</p>
                          <p className="mt-3 text-sm leading-7 text-[#7a6858]">
                            The live session remains fast and lightweight. The richer journaling happens after you stop and save.
                          </p>
                        </div>
                      </div>
                    ) : (
                      turns.map((turn) => (
                        <article
                          key={turn.id}
                          className={`max-w-[92%] rounded-[24px] border px-4 py-3 shadow-[0_8px_24px_rgba(111,81,56,0.08)] ${
                            turn.role === "user"
                              ? "ml-auto border-[#d9b08d] bg-[#f7e5d4] text-[#3a2c22]"
                              : "mr-auto border-[#d6d8c7] bg-[#eef1e7] text-[#243126]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[11px] uppercase tracking-[0.26em] text-black/45">
                              {turn.role === "user" ? "You" : "Companion"}
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.24em] text-black/35">{turn.status}</span>
                          </div>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{turn.text || "..."}</p>
                        </article>
                      ))
                    )}
                  </div>
                </div>

                {(saveState !== "idle" || savedSession) && (
                  <div className="mt-4 rounded-[24px] border border-[#dfd2bf] bg-[#fff8ee] p-4 text-sm leading-7 text-[#664e3e]">
                    {saveState === "saving" && <p>Saving the session, drafting the journal artifact, and refreshing memory now.</p>}
                    {saveState === "error" && <p className="text-[#9c4c40]">{saveError ?? "The session could not be finalized."}</p>}
                    {saveState === "saved" && savedSession && (
                      <div className="space-y-2">
                        <p>
                          Saved as{" "}
                          <Link href={`/sessions/${savedSession.sessionId}`} className="font-medium text-[#7d4f39] underline decoration-[#cf9c7d] underline-offset-4">
                            {savedSession.artifact?.title ?? "new journal entry"}
                          </Link>
                          .
                        </p>
                        <p>{savedSession.artifact?.summary ?? "The transcript was saved, but the artifact still needs attention."}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-[#dbcdb8] bg-[#fffaf2] p-6 shadow-[0_18px_50px_rgba(92,63,39,0.08)]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Quick Manual Log</p>
              <h2 className="mt-2 font-[family-name:Georgia,serif] text-2xl text-[#31251d]">Type a bullet, dump a thought, keep moving.</h2>
              <p className="mt-3 text-sm leading-7 text-[#705d4e]">
                Manual notes flow through the same summary and memory system as voice, so nothing gets stranded outside the second brain.
              </p>

              <form onSubmit={(event) => void handleManualSubmit(event)} className="mt-5 space-y-4">
                <textarea
                  value={manualText}
                  onChange={(event) => setManualText(event.target.value)}
                  rows={8}
                  placeholder="What feels worth capturing right now?"
                  className="w-full resize-none rounded-[24px] border border-[#e2d4c3] bg-[#fffdf8] px-4 py-4 text-sm leading-7 text-[#2f241d] outline-none focus:border-[#d2a17f]"
                />

                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs text-[#8c7968]">
                    Saved with {getModeLabel(mode)} mode and the same post-session memory processing as voice.
                  </div>
                  <button
                    type="submit"
                    disabled={manualState === "saving"}
                    className="rounded-full bg-[#5c735f] px-5 py-2 text-sm font-medium text-[#f7fbf5] transition-colors hover:bg-[#49604c] disabled:cursor-wait disabled:opacity-70"
                  >
                    {manualState === "saving" ? "Saving" : "Save manual entry"}
                  </button>
                </div>
              </form>

              {manualState === "error" && <p className="mt-3 text-sm text-[#9c4c40]">{manualError}</p>}
              {manualState === "saved" && <p className="mt-3 text-sm text-[#4f654f]">Manual entry saved and processed.</p>}
            </section>

            <section className="rounded-[32px] border border-[#dbcdb8] bg-[#fffaf2] p-6 shadow-[0_18px_50px_rgba(92,63,39,0.08)]">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Memory Snapshot</p>
                  <h2 className="mt-2 font-[family-name:Georgia,serif] text-2xl text-[#31251d]">Your second brain, softly visible.</h2>
                </div>
                <Link href="/profile" className="text-sm text-[#7d4f39] underline decoration-[#cf9c7d] underline-offset-4">
                  Open profile
                </Link>
              </div>

              <p className="mt-4 text-sm leading-7 text-[#705d4e]">
                {data.profile.summary ?? "No rolling profile summary yet. Once you save a few sessions, this area will start to reflect stable patterns and preferences."}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {data.profile.memories.length > 0 ? (
                  data.profile.memories.map((memory) => (
                    <span
                      key={memory.id}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        memory.pinned
                          ? "border-[#c88862] bg-[#f3dcc8] text-[#6d4533]"
                          : "border-[#ddd1bf] bg-[#fff7ef] text-[#7c6959]"
                      }`}
                    >
                      {memory.content}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[#8b7868]">No durable memory items yet.</span>
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[32px] border border-[#dbcdb8] bg-[#fffaf2] p-6 shadow-[0_18px_50px_rgba(92,63,39,0.08)]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Today&apos;s Entries</p>
                <h2 className="mt-2 font-[family-name:Georgia,serif] text-2xl text-[#31251d]">Session artifacts, not just records.</h2>
              </div>
              <Link href="/sessions" className="text-sm text-[#7d4f39] underline decoration-[#cf9c7d] underline-offset-4">
                Open archive
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {data.sessions.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#d9cbb7] bg-[#fffaf1] p-6 text-sm leading-7 text-[#756353]">
                  No entries yet today. Start a voice check-in or save a quick manual log and the hub will begin to fill out.
                </div>
              ) : (
                data.sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="block rounded-[28px] border border-[#dfd2bf] bg-[#fff8ee] p-5 transition-transform hover:-translate-y-0.5"
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

                    <h3 className="mt-4 font-[family-name:Georgia,serif] text-2xl text-[#31251d]">
                      {session.artifact?.title ?? "Untitled entry"}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[#695646]">
                      {session.artifact?.summary ?? "This entry was saved, but the artifact still needs processing."}
                    </p>

                    {session.artifact?.rapidLogBullets?.length ? (
                      <ul className="mt-4 space-y-2 text-sm text-[#564539]">
                        {session.artifact.rapidLogBullets.slice(0, 3).map((bullet) => (
                          <li key={bullet} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#b78063]" />
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

          <section className="rounded-[32px] border border-[#dbcdb8] bg-[#fffaf2] p-6 shadow-[0_18px_50px_rgba(92,63,39,0.08)]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Open Tasks</p>
                <h2 className="mt-2 font-[family-name:Georgia,serif] text-2xl text-[#31251d]">Loose ends worth keeping warm.</h2>
              </div>
            </div>

            <div className="mt-5">
              <TaskList
                tasks={data.openTasks}
                emptyCopy="No open tasks right now. When a session suggests a concrete next step, it will appear here."
                showSessionLink
              />
            </div>
          </section>
        </div>

        {latestTurn && (
          <p className="px-2 text-xs text-[#7c6959]">
            Latest live turn: <span className="font-medium text-[#4a392f]">{latestTurn.role}</span>
          </p>
        )}
      </div>
    </main>
  )
}
