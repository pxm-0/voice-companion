import type { SessionCard, SessionTask, DayGroup, WeekGroup, GroupedJournal } from "@/lib/session-types"

function toDateKey(isoString: string): string {
  return isoString.slice(0, 10)
}

function toMondayKey(dateKey: string): string {
  const date = new Date(dateKey + "T00:00:00Z")
  const dayOfWeek = date.getUTCDay() // 0 = Sunday, 1 = Monday ...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() - daysFromMonday)
  return monday.toISOString().slice(0, 10)
}

function toSundayKey(mondayKey: string): string {
  const monday = new Date(mondayKey + "T00:00:00Z")
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return sunday.toISOString().slice(0, 10)
}

function formatDateLabel(dateKey: string): string {
  const date = new Date(dateKey + "T00:00:00Z")
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function formatWeekLabel(mondayKey: string): string {
  const sundayKey = toSundayKey(mondayKey)
  const start = new Date(mondayKey + "T00:00:00Z")
  const end = new Date(sundayKey + "T00:00:00Z")
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(d)
  return `${fmt(start)} \u2013 ${fmt(end)}`
}

function aggregateTasks(sessions: SessionCard[]): SessionTask[] {
  const seen = new Set<string>()
  const tasks: SessionTask[] = []
  for (const session of sessions) {
    for (const task of session.tasks) {
      if (!seen.has(task.content)) {
        seen.add(task.content)
        tasks.push(task)
      }
    }
  }
  return tasks.sort((a, b) => a.orderIndex - b.orderIndex)
}

export function groupSessions(sessions: SessionCard[]): GroupedJournal {
  if (sessions.length === 0) return []

  // Group sessions by day
  const dayMap = new Map<string, SessionCard[]>()
  for (const session of sessions) {
    const dateKey = toDateKey(session.entryDate)
    dayMap.set(dateKey, [...(dayMap.get(dateKey) ?? []), session])
  }

  // Group days by week (keyed by Monday's date)
  const weekMap = new Map<string, Set<string>>()
  for (const dateKey of dayMap.keys()) {
    const weekKey = toMondayKey(dateKey)
    if (!weekMap.has(weekKey)) weekMap.set(weekKey, new Set())
    weekMap.get(weekKey)!.add(dateKey)
  }

  // Sort weeks descending
  const sortedWeekKeys = Array.from(weekMap.keys()).sort().reverse()

  return sortedWeekKeys.map((weekKey): WeekGroup => {
    const dateKeys = Array.from(weekMap.get(weekKey) ?? []).sort().reverse()

    const days: DayGroup[] = dateKeys.map((dateKey): DayGroup => {
      const daySessions = dayMap.get(dateKey) ?? []
      return {
        dateKey,
        dateLabel: formatDateLabel(dateKey),
        dailySummary: null,
        sessions: daySessions,
        aggregatedTasks: aggregateTasks(daySessions),
      }
    })

    return {
      weekKey,
      weekLabel: formatWeekLabel(weekKey),
      weekSummary: null,
      days,
    }
  })
}
