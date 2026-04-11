import { describe, it, expect } from "vitest"
import { groupSessions } from "@/lib/journal-grouping"
import type { SessionCard } from "@/lib/session-types"

function makeSession({ entryDate, ...rest }: Partial<SessionCard> & { entryDate: string }): SessionCard {
  return {
    id: "s1",
    startedAt: entryDate + "T10:00:00.000Z",
    endedAt: entryDate + "T10:30:00.000Z",
    entryDate: entryDate + "T00:00:00.000Z",
    inputType: "voice",
    mode: "reflect",
    status: "COMPLETED",
    turnCount: 5,
    transcriptRetained: true,
    artifact: null,
    tasks: [],
    processingError: null,
    ...rest,
  }
}

describe("groupSessions", () => {
  it("returns empty array for no sessions", () => {
    expect(groupSessions([])).toEqual([])
  })

  it("groups a single session into one week containing one day", () => {
    const sessions = [makeSession({ id: "s1", entryDate: "2026-04-07" })]
    const result = groupSessions(sessions)

    expect(result).toHaveLength(1)
    expect(result[0].days).toHaveLength(1)
    expect(result[0].days[0].sessions).toHaveLength(1)
    expect(result[0].days[0].dateKey).toBe("2026-04-07")
    expect(result[0].weekKey).toBe("2026-04-06") // Monday of that week (April 6 is the Monday for April 7)
  })

  it("groups two sessions on the same day into one DayGroup", () => {
    const sessions = [
      makeSession({ id: "s1", entryDate: "2026-04-07" }),
      makeSession({ id: "s2", entryDate: "2026-04-07" }),
    ]
    const result = groupSessions(sessions)

    expect(result).toHaveLength(1)
    expect(result[0].days).toHaveLength(1)
    expect(result[0].days[0].sessions).toHaveLength(2)
  })

  it("groups sessions on different days of the same week into one WeekGroup", () => {
    const sessions = [
      makeSession({ id: "s1", entryDate: "2026-04-07" }), // Tuesday
      makeSession({ id: "s2", entryDate: "2026-04-09" }), // Thursday
    ]
    const result = groupSessions(sessions)

    expect(result).toHaveLength(1)
    expect(result[0].days).toHaveLength(2)
  })

  it("groups sessions from different weeks into separate WeekGroups", () => {
    const sessions = [
      makeSession({ id: "s1", entryDate: "2026-04-07" }), // week of Apr 6
      makeSession({ id: "s2", entryDate: "2026-04-14" }), // week of Apr 13
    ]
    const result = groupSessions(sessions)

    expect(result).toHaveLength(2)
  })

  it("sorts weeks most-recent first", () => {
    const sessions = [
      makeSession({ id: "s1", entryDate: "2026-04-07" }),
      makeSession({ id: "s2", entryDate: "2026-04-14" }),
    ]
    const result = groupSessions(sessions)

    expect(result[0].weekKey > result[1].weekKey).toBe(true)
  })

  it("sorts days within a week most-recent first", () => {
    const sessions = [
      makeSession({ id: "s1", entryDate: "2026-04-07" }),
      makeSession({ id: "s2", entryDate: "2026-04-09" }),
    ]
    const result = groupSessions(sessions)

    expect(result[0].days[0].dateKey).toBe("2026-04-09")
    expect(result[0].days[1].dateKey).toBe("2026-04-07")
  })

  it("aggregates tasks across sessions in the same day and deduplicates by content", () => {
    const sessions = [
      makeSession({
        id: "s1",
        entryDate: "2026-04-07",
        tasks: [
          { id: "t1", sessionId: "s1", content: "Go for a run", completed: false, orderIndex: 0, updatedAt: "2026-04-07T10:00:00Z" },
          { id: "t2", sessionId: "s1", content: "Call doctor", completed: false, orderIndex: 1, updatedAt: "2026-04-07T10:00:00Z" },
        ],
      }),
      makeSession({
        id: "s2",
        entryDate: "2026-04-07",
        tasks: [
          { id: "t3", sessionId: "s2", content: "Go for a run", completed: false, orderIndex: 0, updatedAt: "2026-04-07T11:00:00Z" },
          { id: "t4", sessionId: "s2", content: "Write report", completed: false, orderIndex: 1, updatedAt: "2026-04-07T11:00:00Z" },
        ],
      }),
    ]
    const result = groupSessions(sessions)
    const tasks = result[0].days[0].aggregatedTasks

    expect(tasks).toHaveLength(3) // "Go for a run" deduplicated
    expect(tasks.map((t) => t.content)).toContain("Go for a run")
    expect(tasks.map((t) => t.content)).toContain("Call doctor")
    expect(tasks.map((t) => t.content)).toContain("Write report")
  })

  it("initializes dailySummary and weekSummary as null", () => {
    const sessions = [makeSession({ id: "s1", entryDate: "2026-04-07" })]
    const result = groupSessions(sessions)

    expect(result[0].weekSummary).toBeNull()
    expect(result[0].days[0].dailySummary).toBeNull()
  })

  it("formats dateLabel as 'Weekday, Month Day'", () => {
    const sessions = [makeSession({ id: "s1", entryDate: "2026-04-07" })]
    const result = groupSessions(sessions)

    // April 7, 2026 is a Tuesday
    expect(result[0].days[0].dateLabel).toBe("Tuesday, April 7")
  })

  it("formats weekLabel as 'Month Day – Month Day'", () => {
    const sessions = [makeSession({ id: "s1", entryDate: "2026-04-07" })]
    const result = groupSessions(sessions)

    expect(result[0].weekLabel).toBe("April 6 – April 12")
  })
})
