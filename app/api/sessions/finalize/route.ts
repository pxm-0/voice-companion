import { finalizeSession } from "@/lib/session-finalizer"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const sessionAuth = await auth()
    if (!sessionAuth?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const existingSessionId = typeof body?.sessionId === "string" ? body.sessionId : undefined
    const result = await finalizeSession(body, sessionAuth.user.id, existingSessionId)

    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to finalize session."
    return Response.json({ error: message }, { status: 400 })
  }
}
