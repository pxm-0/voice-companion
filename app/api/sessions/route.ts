import { getSessionList, getSummaryPreview } from "@/lib/session-finalizer"

export async function GET() {
  const sessions = await getSessionList()

  return Response.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      entryDate: session.entryDate,
      inputType: session.inputType,
      mode: session.mode,
      status: session.status,
      turnCount: session.turnCount,
      transcriptRetained: session.transcriptRetained,
      title: session.artifact?.title ?? "Untitled session",
      summaryPreview: getSummaryPreview(session.artifact),
      mood: session.artifact?.mood ?? null,
      themes: session.artifact?.themes ?? [],
      rapidLogBullets: session.artifact?.rapidLogBullets ?? [],
      tasks: session.tasks,
    })),
  })
}
