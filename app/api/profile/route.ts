import { getProfileState } from "@/lib/session-finalizer"

export async function GET() {
  const profile = await getProfileState()

  return Response.json({
    profile: {
      summary: profile.snapshot?.summary ?? null,
      memories: profile.memories,
    },
  })
}
