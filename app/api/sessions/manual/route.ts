import { finalizeSession } from "@/lib/session-finalizer"
import type { CompanionMode } from "@/lib/session-types"
import { isCompanionMode } from "@/lib/session-types"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      text?: unknown
      mode?: unknown
    }

    if (typeof body.text !== "string" || body.text.trim().length === 0) {
      return Response.json({ error: "text is required." }, { status: 400 })
    }

    const mode: CompanionMode = isCompanionMode(body.mode) ? body.mode : "think_with_me"
    const now = new Date().toISOString()

    const result = await finalizeSession({
      startedAt: now,
      endedAt: now,
      inputType: "manual",
      mode,
      turns: [
        {
          id: `manual-${Date.now()}`,
          role: "user",
          text: body.text.trim(),
          status: "final",
        },
      ],
    })

    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save manual entry."
    return Response.json({ error: message }, { status: 400 })
  }
}
