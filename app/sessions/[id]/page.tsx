import { notFound } from "next/navigation"
import { SessionStatus, SessionTurnRole, SessionTurnStatus } from "@prisma/client"
import { formatDateTime } from "@/lib/format-date"
import { getSessionById, parseKeyThemes } from "@/lib/session-finalizer"

function getStatusLabel(status: SessionStatus) {
  switch (status) {
    case SessionStatus.COMPLETED:
      return "Complete"
    case SessionStatus.SUMMARY_FAILED:
      return "Summary failed"
    default:
      return "Processing"
  }
}

function getRoleLabel(role: SessionTurnRole) {
  return role === SessionTurnRole.USER ? "You" : "Companion"
}

function getTurnStyle(role: SessionTurnRole) {
  return role === SessionTurnRole.USER
    ? "ml-auto border-[#305287] bg-[linear-gradient(180deg,#1B3354,#13263f)] text-[#EDF4FF]"
    : "mr-auto border-white/10 bg-[linear-gradient(180deg,#1B1F29,#131722)] text-[#F3F6FA]"
}

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

  const keyThemes = parseKeyThemes(session.summary)

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top,#18253b_0%,#0d131d_35%,#06080d_100%)] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,25,36,0.95),rgba(11,15,23,0.98))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#7D93AE]">Session Detail</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Saved reflection session</h1>
              <p className="mt-3 text-sm text-[#A7B5C7]">
                {formatDateTime(session.startedAt)} to {formatDateTime(session.endedAt)}
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[#D9E2EE]">
              {getStatusLabel(session.status)}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#7D93AE]">Summary</p>
              <p className="mt-3 text-lg leading-8 text-white">
                {session.summary?.summary ?? "Summary is not available for this session yet."}
              </p>
              {session.processingError && (
                <p className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  Summary processing error: {session.processingError}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#7D93AE]">Mood</p>
                <p className="mt-3 text-lg text-white">{session.summary?.mood ?? "Unavailable"}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#7D93AE]">Themes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {keyThemes.length > 0 ? (
                    keyThemes.map((theme) => (
                      <span
                        key={theme}
                        className="rounded-full border border-[#7DA8FF]/30 bg-[#7DA8FF]/10 px-3 py-1 text-sm text-[#DDE9FF]"
                      >
                        {theme}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[#A7B5C7]">No themes were saved.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,21,31,0.95),rgba(9,13,20,0.98))] shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#7D93AE]">Raw Transcript</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Turn-by-turn conversation</h2>
            </div>

            <div className="text-right text-sm text-[#A8B6C7]">
              <p>{session.turnCount} turns</p>
              <p>{session.transcriptRetained ? "Transcript available" : "Transcript pruned"}</p>
            </div>
          </div>

          <div className="max-h-[min(70vh,44rem)] overflow-y-auto px-6 py-5">
            {session.transcriptRetained ? (
              <div className="space-y-4">
                {session.turns.map((turn) => (
                  <article
                    key={turn.id}
                    className={`max-w-[92%] rounded-3xl border px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.18)] ${getTurnStyle(turn.role)}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[11px] uppercase tracking-[0.26em] text-white/55">
                        {getRoleLabel(turn.role)}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-[0.24em] ${
                          turn.status === SessionTurnStatus.STREAMING ? "text-[#9DD3FF]" : "text-white/40"
                        }`}
                      >
                        {turn.status.toLowerCase()}
                      </span>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-inherit/95">{turn.text}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                <p className="text-lg font-medium text-white">The raw transcript has been pruned.</p>
                <p className="mt-3 text-sm leading-7 text-[#A7B5C7]">
                  This session remains in history through its durable summary and metadata, but full transcript turns are only retained for the latest five sessions.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
