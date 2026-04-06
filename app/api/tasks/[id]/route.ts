import { updateTask, validateTaskPatch } from "@/lib/session-finalizer"
import { auth } from "@/lib/auth"

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const sessionAuth = await auth()
  if (!sessionAuth?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const body = await req.json()
    const changes = validateTaskPatch(body)
    const task = await updateTask(id, sessionAuth.user.id, changes)

    return Response.json({ task })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update task."
    return Response.json({ error: message }, { status: 400 })
  }
}
