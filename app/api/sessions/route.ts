import { getSessionList, getSummaryPreview } from "@/lib/session-finalizer"

export async function GET() {
  const sessions = await getSessionList()

  return Response.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt.toISOString(),
      status: session.status,
      turnCount: session.turnCount,
      transcriptRetained: session.transcriptRetained,
      summaryPreview: getSummaryPreview(session.summary),
      mood: session.summary?.mood ?? null,
    })),
  })
}
