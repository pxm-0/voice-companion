"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { SessionTask } from "@/lib/session-types"

type TaskListProps = {
  tasks: SessionTask[]
  emptyCopy: string
  showSessionLink?: boolean
}

export function TaskList({ tasks, emptyCopy, showSessionLink = false }: TaskListProps) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDrafts(Object.fromEntries(tasks.map((task) => [task.id, task.content])))
  }, [tasks])

  async function patchTask(taskId: string, patch: { content?: string; completed?: boolean }) {
    setPendingId(taskId)
    setError(null)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update task.")
      }

      router.refresh()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update task.")
    } finally {
      setPendingId(null)
    }
  }

  if (tasks.length === 0) {
    return (
      <p className="py-2 text-sm leading-7 text-[#a89484]">{emptyCopy}</p>
    )
  }

  return (
    <div>
      <ul className="divide-y divide-[#e5d9ca]" role="list">
        {tasks.map((task) => {
          const draft = drafts[task.id] ?? task.content
          const hasChanges = draft.trim() !== task.content
          const isPending = pendingId === task.id

          return (
            <li key={task.id} className="flex items-start gap-3 py-4">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={(event) => void patchTask(task.id, { completed: event.target.checked })}
                disabled={isPending}
                aria-label={`Mark "${task.content}" as ${task.completed ? "incomplete" : "complete"}`}
                className="mt-[3px] h-4 w-4 flex-shrink-0 rounded border-[#c2b39a] text-[#8f5d44] accent-[#9c6648] focus:ring-[#c88862] focus-visible:ring-2"
              />

              <div className="min-w-0 flex-1">
                <input
                  value={draft}
                  onChange={(event) =>
                    setDrafts((current) => ({ ...current, [task.id]: event.target.value }))
                  }
                  onBlur={() => {
                    if (hasChanges) void patchTask(task.id, { content: draft })
                  }}
                  className={`w-full border-none bg-transparent p-0 text-sm leading-7 outline-none transition-opacity ${
                    task.completed ? "text-[#a89484] line-through" : "text-[#3a2c22]"
                  } ${isPending ? "opacity-50" : ""}`}
                />

                <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-[#a89484]">
                  {showSessionLink && task.sessionId && (
                    <Link
                      href={`/sessions/${task.sessionId}`}
                      className="underline decoration-[#d4c2ae] underline-offset-4 transition-colors hover:text-[#7d6959]"
                    >
                      {task.sessionTitle ?? "Source session"}
                    </Link>
                  )}

                  {hasChanges && (
                    <button
                      type="button"
                      onClick={() => void patchTask(task.id, { content: draft })}
                      disabled={isPending}
                      className="text-[#9c6648] underline decoration-[#d4a882] underline-offset-4 transition-colors hover:text-[#7d4f39]"
                    >
                      Save edit
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {error && (
        <p className="mt-3 text-sm text-[#9c4c40]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
