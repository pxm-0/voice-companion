import { getProfileState } from "@/lib/session-finalizer"

export async function GET() {
  const profile = await getProfileState()

  return Response.json({
    profile: {
      summary: profile.snapshot?.summary ?? null,
      memories: profile.memories.map((memory) => ({
        id: memory.id,
        kind: memory.kind,
        content: memory.content,
        lastSeenAt: memory.lastSeenAt.toISOString(),
        active: memory.active,
      })),
    },
  })
}
