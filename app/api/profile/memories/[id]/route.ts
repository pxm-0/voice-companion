import { updateProfileMemory, validateMemoryPatch } from "@/lib/session-finalizer"

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = await req.json()
    const changes = validateMemoryPatch(body)
    const memory = await updateProfileMemory(id, changes)

    return Response.json({ memory })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update memory."
    return Response.json({ error: message }, { status: 400 })
  }
}
