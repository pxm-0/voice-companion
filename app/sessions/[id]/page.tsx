import { notFound } from "next/navigation"
import { SessionArtifactEditor } from "@/app/_components/session-artifact-editor"
import { TaskList } from "@/app/_components/task-list"
import { getModeLabel } from "@/lib/brain"
import { formatDateTime } from "@/lib/format-date"
import { getSessionById } from "@/lib/session-finalizer"

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSessionById(id)

  if (!session) {
    notFound()
  }

  return (
    <main className="min-h-full bg-[linear-gradient(180deg,#f5ede2_0%,#efe4d6_45%,#e8ddcf_100%)] px-4 py-8 text-[#2f241d] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-[#dbcdb8] bg-[#fffaf2] p-6 shadow-[0_18px_50px_rgba(92,63,39,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#9f7c63]">Session Entry</p>
              <h1 className="mt-2 font-[family-name:Georgia,serif] text-4xl text-[#31251d]">
                {session.artifact?.title || `Entry from ${formatDateTime(session.endedAt)}`}
              </h1>
              <p className="mt-3 text-sm leading-7 text-[#705d4e]">
                {formatDateTime(session.startedAt)} to {formatDateTime(session.endedAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[#d7b79a] bg-[#f9efe2] px-3 py-1 text-xs text-[#7c5b45]">
                {session.inputType === "voice" ? "Voice" : "Manual"}
              </span>
              <span className="rounded-full border border-[#e1d4c2] bg-white px-3 py-1 text-xs text-[#8e7d6c]">
                {getModeLabel(session.mode)}
              </span>
              <span className="rounded-full border border-[#e1d4c2] bg-white px-3 py-1 text-xs text-[#8e7d6c]">
                {session.transcriptRetained ? "Transcript retained" : "Transcript pruned"}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-[#dfd2bf] bg-[#fff8ef] p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Summary</p>
              <div className="mt-3 max-w-prose text-base leading-8 text-[#3b2f25]">
                {session.artifact?.summary || "Summary is not available for this session yet."}
              </div>
              {session.processingError && (
                <p className="mt-4 rounded-2xl border border-[#dfbaa6] bg-[#f7e2d7] px-4 py-3 text-sm text-[#924d42]">
                  Summary processing error: {session.processingError}
                </p>
              )}
            </div>

            <div className="grid gap-4">
              <div className="rounded-[28px] border border-[#dfd2bf] bg-[#fff8ef] p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Mood</p>
                <p className="mt-3 text-lg text-[#3b2f25]">{session.artifact?.mood ?? "Unavailable"}</p>
              </div>
              <div className="rounded-[28px] border border-[#dfd2bf] bg-[#fff8ef] p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Themes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {session.artifact?.themes.length ? (
                    session.artifact.themes.map((theme) => (
                      <span
                        key={theme}
                        className="rounded-full border border-[#d7b79a] bg-[#f9efe2] px-3 py-1 text-sm text-[#7c5b45]"
                      >
                        {theme}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[#8b7868]">No themes were saved.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {session.artifact && <SessionArtifactEditor sessionId={session.id} artifact={session.artifact} />}

        <section className="rounded-[32px] border border-[#dbcdb8] bg-[#fffaf2] p-6 shadow-[0_18px_50px_rgba(92,63,39,0.08)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Action Items</p>
              <h2 className="mt-2 font-[family-name:Georgia,serif] text-2xl text-[#31251d]">Loose ends and next steps</h2>
            </div>
            <p className="text-sm text-[#7a6858]">{session.tasks.filter((task) => !task.completed).length} open tasks</p>
          </div>

          <div className="mt-5">
            <TaskList
              tasks={session.tasks}
              emptyCopy="No action items were captured for this entry. That’s fine too — not every journal session needs a task list."
            />
          </div>
        </section>

        <section className="rounded-[32px] border border-[#dbcdb8] bg-[#fffaf2] p-6 shadow-[0_18px_50px_rgba(92,63,39,0.08)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Raw Transcript</p>
              <h2 className="mt-2 font-[family-name:Georgia,serif] text-2xl text-[#31251d]">Linked conversation detail</h2>
            </div>
            <p className="text-sm text-[#7a6858]">{session.turnCount} turns captured</p>
          </div>

          <div className="mt-5 max-h-[40rem] overflow-y-auto">
            {session.transcriptRetained ? (
              <div className="space-y-4">
                {session.turns.map((turn) => (
                  <article
                    key={turn.id}
                    className={`max-w-[92%] rounded-[24px] border px-4 py-3 shadow-[0_8px_24px_rgba(111,81,56,0.08)] ${
                      turn.role === "USER"
                        ? "ml-auto border-[#d9b08d] bg-[#f7e5d4] text-[#3a2c22]"
                        : "mr-auto border-[#d6d8c7] bg-[#eef1e7] text-[#243126]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[11px] uppercase tracking-[0.26em] text-black/45">
                        {turn.role === "USER" ? "You" : "Companion"}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.24em] text-black/35">{turn.status.toLowerCase()}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{turn.text}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#d9cbb7] bg-[#fffaf1] p-8 text-center">
                <p className="font-[family-name:Georgia,serif] text-2xl text-[#382b22]">The raw transcript has been pruned.</p>
                <p className="mt-3 text-sm leading-7 text-[#756353]">
                  This entry still keeps its durable journal artifact, tasks, and themes, but full turn-by-turn transcript turns are
                  only retained for the latest five sessions.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
