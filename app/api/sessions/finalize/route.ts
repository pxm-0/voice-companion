import { finalizeSession } from "@/lib/session-finalizer"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = await finalizeSession(body)

    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to finalize session."
    return Response.json({ error: message }, { status: 400 })
  }
}
