import { auth } from "@/lib/auth"
import { startSession } from "@/lib/session-finalizer"
import { isCompanionMode } from "@/lib/session-types"

export async function POST(req: Request) {
  const sessionAuth = await auth()
  if (!sessionAuth?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as { mode?: unknown }
    const mode = isCompanionMode(body.mode) ? body.mode : "think_with_me"
    const result = await startSession(sessionAuth.user.id, mode)
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start session."
    return Response.json({ error: message }, { status: 500 })
  }
}
