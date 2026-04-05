import { getSessionById, validateSessionArtifactPatch, updateSessionArtifact } from "@/lib/session-finalizer"

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
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      entryDate: session.entryDate,
      inputType: session.inputType,
      mode: session.mode,
      status: session.status,
      turnCount: session.turnCount,
      transcriptRetained: session.transcriptRetained,
      processingError: session.processingError,
      artifact: session.artifact,
      tasks: session.tasks,
      turns: session.transcriptRetained ? session.turns : [],
    },
  })
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = await req.json()
    const changes = validateSessionArtifactPatch(body)
    const session = await updateSessionArtifact(id, changes)

    if (!session) {
      return Response.json({ error: "Session not found." }, { status: 404 })
    }

    return Response.json({ session })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update session."
    return Response.json({ error: message }, { status: 400 })
  }
}
