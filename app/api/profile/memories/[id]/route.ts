import { updateProfileMemory, validateMemoryPatch } from "@/lib/session-finalizer"
import { auth } from "@/lib/auth"

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await req.json()
    const changes = validateMemoryPatch(body)
    const memory = await updateProfileMemory(id, session.user.id, changes)

    return Response.json({ memory })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update memory."
    return Response.json({ error: message }, { status: 400 })
  }
}
