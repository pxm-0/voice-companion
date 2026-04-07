import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const ALLOWED_VOICES = [
  "alloy",
  "breeze",
  "cinnamon",
  "echo",
  "juniper",
  "marin",
  "sage",
  "shimmer",
] as const

type AllowedVoice = (typeof ALLOWED_VOICES)[number]

function isAllowedVoice(value: unknown): value is AllowedVoice {
  return typeof value === "string" && (ALLOWED_VOICES as readonly string[]).includes(value)
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { voicePreference: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ voicePreference: user.voicePreference })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { voicePreference } = body

    if (!isAllowedVoice(voicePreference)) {
      return NextResponse.json(
        {
          error: `Invalid voicePreference. Must be one of: ${ALLOWED_VOICES.join(", ")}`,
        },
        { status: 400 }
      )
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { voicePreference },
      select: { voicePreference: true },
    })

    return NextResponse.json({ voicePreference: updated.voicePreference })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
