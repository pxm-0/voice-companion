import { JournalSessionCard } from "@/app/_components/journal-session-card"
import type { DayGroup } from "@/lib/session-types"

type Props = {
  day: DayGroup
}

export function JournalDay({ day }: Props) {
  const openTaskCount = day.aggregatedTasks.filter((t) => !t.completed).length

  return (
    <section>
      {/* Day header */}
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-[family-name:Georgia,serif] text-xl text-[#31251d]">
          {day.dateLabel}
        </h2>
        {openTaskCount > 0 && (
          <span className="text-xs text-[#9f7c63]">
            {openTaskCount} open {openTaskCount === 1 ? "task" : "tasks"}
          </span>
        )}
      </div>

      {/* Daily synthesis */}
      {day.dailySummary && (
        <p className="mb-4 text-sm leading-7 text-[#705d4e]">{day.dailySummary}</p>
      )}

      {/* Sessions */}
      <div className="space-y-2">
        {day.sessions.map((session) => (
          <JournalSessionCard key={session.id} session={session} />
        ))}
      </div>

      {/* Aggregated tasks (if any) */}
      {day.aggregatedTasks.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#e2d5c2] bg-[#fdf7ee] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#9f7c63]">Tasks from today</p>
          <ul className="mt-2 divide-y divide-[#ede0cf]">
            {day.aggregatedTasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3 py-2 text-sm text-[#564539]">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${task.completed ? "bg-[#b0917b] opacity-40" : "bg-[#b78063]"}`}
                />
                <span className={task.completed ? "line-through opacity-50" : ""}>{task.content}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
