import { updateTask, validateTaskPatch } from "@/lib/session-finalizer"

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const body = await req.json()
    const changes = validateTaskPatch(body)
    const task = await updateTask(id, changes)

    return Response.json({ task })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update task."
    return Response.json({ error: message }, { status: 400 })
  }
}
