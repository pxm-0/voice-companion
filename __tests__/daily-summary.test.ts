import { describe, it, expect, vi, beforeEach } from "vitest"
import type { SessionCard } from "@/lib/session-types"

// Must mock fetch before dynamic import
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)
vi.stubEnv("OPENAI_API_KEY", "test-key")

const { generateDailySummary, generateWeeklySummary } = await import("@/lib/daily-summary")

function makeSession(artifact: SessionCard["artifact"] = null): SessionCard {
  return {
    id: "s1",
    startedAt: "2026-04-07T10:00:00Z",
    endedAt: "2026-04-07T10:30:00Z",
    entryDate: "2026-04-07T00:00:00Z",
    inputType: "voice",
    mode: "reflect",
    status: "COMPLETED",
    turnCount: 5,
    transcriptRetained: true,
    artifact,
    tasks: [],
    processingError: null,
  }
}

const SESSION_WITH_ARTIFACT = makeSession({
  title: "Running on Empty",
  summary: "Felt drained but kept going.",
  mood: "tired but steady",
  themes: ["exhaustion", "perseverance"],
  rapidLogBullets: ["woke up late, started slow", "finished the report anyway"],
  patternSummary: null,
})

describe("generateDailySummary", () => {
  beforeEach(() => mockFetch.mockReset())

  it("returns null when sessions array is empty", async () => {
    const result = await generateDailySummary([])
    expect(result).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("returns null when all sessions have no artifact", async () => {
    const result = await generateDailySummary([makeSession(null)])
    expect(result).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("calls OpenAI and returns the generated text on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "You focused on finishing work despite low energy." } }],
      }),
    })

    const result = await generateDailySummary([SESSION_WITH_ARTIFACT])
    expect(result).toBe("You focused on finishing work despite low energy.")
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it("returns null when the fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    const result = await generateDailySummary([SESSION_WITH_ARTIFACT])
    expect(result).toBeNull()
  })
})

describe("generateWeeklySummary", () => {
  beforeEach(() => mockFetch.mockReset())

  it("returns null when sessions array is empty", async () => {
    const result = await generateWeeklySummary([])
    expect(result).toBeNull()
  })

  it("returns null when sessions have no artifacts with themes", async () => {
    const result = await generateWeeklySummary([makeSession(null)])
    expect(result).toBeNull()
  })

  it("calls OpenAI and returns weekly summary text", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "You showed resilience this week, though energy was a recurring theme." } }],
      }),
    })

    const result = await generateWeeklySummary([SESSION_WITH_ARTIFACT])
    expect(result).toBe("You showed resilience this week, though energy was a recurring theme.")
  })
})
