import { redirect } from "next/navigation"
import { JournalWeek } from "@/app/_components/journal-week"
import { auth } from "@/lib/auth"
import { getGroupedSessionList } from "@/lib/session-finalizer"

export default async function SessionsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const grouped = await getGroupedSessionList(session.user.id)

  const totalSessions = grouped.flatMap((w) => w.days.flatMap((d) => d.sessions)).length

  return (
    <main className="min-h-full bg-[linear-gradient(180deg,#f5ede2_0%,#efe4d6_45%,#e8ddcf_100%)] px-4 py-8 text-[#2f241d] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#9f7c63]">Journal</p>
            <h1 className="mt-2 font-[family-name:Georgia,serif] text-4xl text-[#31251d]">
              Your sessions
            </h1>
          </div>
          <span className="text-sm text-[#9f7c63]">
            {totalSessions} {totalSessions === 1 ? "entry" : "entries"}
          </span>
        </div>

        {grouped.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-[#d9cbb7] bg-[#fffaf1] p-8 text-center text-[#756353]">
            No sessions saved yet. Start a voice check-in and your journal will begin here.
          </div>
        ) : (
          <div className="space-y-12">
            {grouped.map((week, i) => (
              <JournalWeek key={week.weekKey} week={week} isCurrentWeek={i === 0} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
