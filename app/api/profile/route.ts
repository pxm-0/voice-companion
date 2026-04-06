import { getProfileState } from "@/lib/session-finalizer"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await getProfileState(session.user.id)

    return NextResponse.json({
      profile: {
        summary: profile.snapshot?.summary ?? null,
        memories: profile.memories,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
