import Link from "next/link"
import { getModeLabel } from "@/lib/brain"
import { formatDateTime } from "@/lib/format-date"
import { getSessionList } from "@/lib/session-finalizer"

export default async function SessionsPage() {
  const sessions = await getSessionList()

  return (
    <main className="min-h-full bg-[linear-gradient(180deg,#f5ede2_0%,#efe4d6_45%,#e8ddcf_100%)] px-4 py-8 text-[#2f241d] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#9f7c63]">Archive</p>
            <h1 className="mt-2 font-[family-name:Georgia,serif] text-4xl text-[#31251d]">Your saved session entries</h1>
            <p className="mt-3 text-sm leading-7 text-[#705d4e]">
              Sessions stay as the primary journal artifact. Recent ones keep full transcript turns; older ones still live on
              through their title, summary, bullets, tasks, and themes.
            </p>
          </div>

          <div className="rounded-[24px] border border-[#dccdb8] bg-[#fff8ef] px-5 py-4 text-sm text-[#6e5b4d] shadow-[0_8px_24px_rgba(111,81,56,0.06)]">
            {sessions.length} {sessions.length === 1 ? "entry" : "entries"}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {sessions.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#d9cbb7] bg-[#fffaf1] p-8 text-center text-[#756353]">
              No sessions saved yet. Start a voice check-in or save a manual log and your archive will begin here.
            </div>
          ) : (
            sessions.map((session) => (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className="block rounded-[32px] border border-[#dbcdb8] bg-[#fffaf2] p-6 shadow-[0_18px_50px_rgba(92,63,39,0.08)] transition-transform hover:-translate-y-0.5"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#d7b79a] bg-[#f9efe2] px-3 py-1 text-xs text-[#7c5b45]">
                        {session.inputType === "voice" ? "Voice" : "Manual"}
                      </span>
                      <span className="rounded-full border border-[#e1d4c2] bg-white px-3 py-1 text-xs text-[#8e7d6c]">
                        {getModeLabel(session.mode)}
                      </span>
                      <span className="rounded-full border border-[#e1d4c2] bg-white px-3 py-1 text-xs text-[#8e7d6c]">
                        {session.transcriptRetained ? "Transcript retained" : "Summary only"}
                      </span>
                    </div>

                    <h2 className="mt-4 font-[family-name:Georgia,serif] text-3xl text-[#31251d]">
                      {session.artifact?.title || `Entry from ${formatDateTime(session.endedAt)}`}
                    </h2>
                    <p className="mt-3 max-w-prose text-sm leading-7 text-[#695646]">
                      {session.artifact?.summary || "This entry was saved, but the artifact still needs processing."}
                    </p>

                    {session.artifact?.rapidLogBullets.length ? (
                      <ul className="mt-4 space-y-2 text-sm text-[#564539]">
                        {session.artifact.rapidLogBullets.slice(0, 3).map((bullet) => (
                          <li key={bullet} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#b78063]" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:min-w-56">
                    <div className="rounded-[24px] border border-[#e1d4c2] bg-[#fff8ef] px-4 py-3 text-sm text-[#6c5848]">
                      <p className="text-[11px] uppercase tracking-[0.26em] text-[#9f7c63]">Mood</p>
                      <p className="mt-2">{session.artifact?.mood ?? "Unavailable"}</p>
                    </div>
                    <div className="rounded-[24px] border border-[#e1d4c2] bg-[#fff8ef] px-4 py-3 text-sm text-[#6c5848]">
                      <p className="text-[11px] uppercase tracking-[0.26em] text-[#9f7c63]">Tasks</p>
                      <p className="mt-2">
                        {session.tasks.filter((task) => !task.completed).length} open / {session.tasks.length} total
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-[#e1d4c2] bg-[#fff8ef] px-4 py-3 text-sm text-[#6c5848]">
                      <p className="text-[11px] uppercase tracking-[0.26em] text-[#9f7c63]">Captured</p>
                      <p className="mt-2">{formatDateTime(session.endedAt)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
