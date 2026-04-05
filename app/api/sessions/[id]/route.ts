import { getSessionById, getSummaryPreview, parseKeyThemes } from "@/lib/session-finalizer"

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const session = await getSessionById(id)

  if (!session) {
    return Response.json({ error: "Session not found." }, { status: 404 })
  }

  return Response.json({
    session: {
      id: session.id,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt.toISOString(),
      status: session.status,
      turnCount: session.turnCount,
      transcriptRetained: session.transcriptRetained,
      processingError: session.processingError,
      summary: session.summary
        ? {
            summary: getSummaryPreview(session.summary),
            mood: session.summary.mood,
            keyThemes: parseKeyThemes(session.summary),
          }
        : null,
      turns: session.transcriptRetained
        ? session.turns.map((turn) => ({
            id: turn.id,
            orderIndex: turn.orderIndex,
            role: turn.role,
            text: turn.text,
            status: turn.status,
          }))
        : [],
    },
  })
}
