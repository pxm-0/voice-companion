import Link from "next/link"
import { SessionStatus } from "@prisma/client"
import { formatDateTime } from "@/lib/format-date"
import { getSessionList, getSummaryPreview } from "@/lib/session-finalizer"

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

function getStatusClasses(status: SessionStatus) {
  switch (status) {
    case SessionStatus.COMPLETED:
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    case SessionStatus.SUMMARY_FAILED:
      return "border-amber-400/30 bg-amber-400/10 text-amber-200"
    default:
      return "border-white/10 bg-white/5 text-[#B8C5D6]"
  }
}

export default async function SessionsPage() {
  const sessions = await getSessionList()

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top,#18253b_0%,#0d131d_35%,#06080d_100%)] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#7D93AE]">Saved Sessions</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Conversation history</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#AAB9CB]">
              Raw transcripts are retained for the latest five sessions. Older sessions remain visible through their durable summaries and metadata.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#C9D5E4]">
            {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {sessions.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-[#A8B5C6]">
              No sessions saved yet. Finish a live voice session and it will appear here.
            </div>
          ) : (
            sessions.map((session) => (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className="block rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,25,36,0.95),rgba(11,15,23,0.98))] p-5 shadow-[0_16px_60px_rgba(0,0,0,0.22)] transition-transform hover:-translate-y-0.5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs ${getStatusClasses(session.status)}`}>
                        {getStatusLabel(session.status)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-[#B8C5D6]">
                        {session.turnCount} turns
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-[#B8C5D6]">
                        {session.transcriptRetained ? "Transcript retained" : "Summary only"}
                      </span>
                    </div>

                    <p className="mt-4 text-lg font-medium text-white">{getSummaryPreview(session.summary)}</p>
                    <p className="mt-3 text-sm text-[#8FA2BA]">
                      {formatDateTime(session.startedAt)} to {formatDateTime(session.endedAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#D7E1EE]">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#7D93AE]">Mood</p>
                    <p className="mt-2">{session.summary?.mood ?? "Unavailable"}</p>
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
