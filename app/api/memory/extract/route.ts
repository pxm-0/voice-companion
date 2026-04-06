import { NextResponse } from "next/server"
import { ProfileMemoryKind } from "@prisma/client"
import { extractSignalsFromTurns } from "@/lib/extractor"
import { upsertMemories } from "@/lib/memory"
import type { SignalType } from "@/lib/extractor"

const SIGNAL_KIND: Record<SignalType, ProfileMemoryKind> = {
  emotion: ProfileMemoryKind.EMOTION,
  pattern: ProfileMemoryKind.THEME,
  preference: ProfileMemoryKind.PREFERENCE,
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { turns?: unknown }

    if (!Array.isArray(body.turns) || body.turns.length === 0) {
      return NextResponse.json({ extracted: 0 })
    }

    const turns = body.turns
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((text) => ({ role: "user" as const, text }))

    if (turns.length === 0) {
      return NextResponse.json({ extracted: 0 })
    }

    const signals = await extractSignalsFromTurns(turns)

    if (signals.length === 0) {
      return NextResponse.json({ extracted: 0 })
    }

    const memories = signals.map((signal) => ({
      kind: SIGNAL_KIND[signal.type],
      content: signal.value,
    }))

    // No sessionId for live extraction — sourceSessionId stays null
    await upsertMemories(null, new Date(), memories)

    return NextResponse.json({ extracted: signals.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signal extraction failed"
    // Return 200 even on error — caller is fire-and-forget
    return NextResponse.json({ extracted: 0, error: message })
  }
}
