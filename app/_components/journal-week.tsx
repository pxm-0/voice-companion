import { JournalDay } from "@/app/_components/journal-day"
import type { WeekGroup } from "@/lib/session-types"

type Props = {
  week: WeekGroup
  isCurrentWeek: boolean
}

export function JournalWeek({ week, isCurrentWeek }: Props) {
  const totalSessions = week.days.reduce((acc, d) => acc + d.sessions.length, 0)

  return (
    <section>
      {/* Week header */}
      <div className="mb-4 flex items-baseline justify-between border-b border-[#e2d5c2] pb-3">
        <div>
          {isCurrentWeek && (
            <p className="text-[10px] uppercase tracking-[0.34em] text-[#9f7c63]">This week</p>
          )}
          <h2
            className={`font-[family-name:Georgia,serif] text-[#31251d] ${isCurrentWeek ? "mt-1 text-2xl" : "text-lg"}`}
          >
            {week.weekLabel}
          </h2>
        </div>
        <span className="text-xs text-[#9f7c63]">
          {totalSessions} {totalSessions === 1 ? "session" : "sessions"}
        </span>
      </div>

      {/* Weekly intelligence summary — only shown when AI generated it for this week */}
      {week.weekSummary && (
        <div className="mb-6 rounded-xl border border-[#dfd2bf] bg-[#fff8ef] px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#9f7c63]">This week</p>
          <p className="mt-2 text-sm leading-7 text-[#3b2f25]">{week.weekSummary}</p>
        </div>
      )}

      {/* Day blocks */}
      <div className="space-y-8">
        {week.days.map((day) => (
          <JournalDay key={day.dateKey} day={day} />
        ))}
      </div>
    </section>
  )
}
