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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(data.error || "Failed to update task.")
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
      <div className="rounded-[24px] border border-dashed border-[#d9cbb7] bg-[#fffaf1] p-6 text-sm leading-7 text-[#756353]">
        {emptyCopy}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const draft = drafts[task.id] ?? task.content
        const hasChanges = draft.trim() !== task.content
        const isPending = pendingId === task.id

        return (
          <article
            key={task.id}
            className="rounded-[24px] border border-[#dfd2bf] bg-[#fffaf2] p-4 shadow-[0_8px_24px_rgba(111,81,56,0.06)]"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={(event) => void patchTask(task.id, { completed: event.target.checked })}
                disabled={isPending}
                className="mt-1 h-4 w-4 rounded border-[#c2b39a] text-[#8f5d44] focus:ring-[#c88862]"
              />

              <div className="min-w-0 flex-1">
                <input
                  value={draft}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [task.id]: event.target.value,
                    }))
                  }
                  onBlur={() => {
                    if (hasChanges) {
                      void patchTask(task.id, { content: draft })
                    }
                  }}
                  className={`w-full border-none bg-transparent p-0 text-sm leading-7 outline-none ${
                    task.completed ? "text-[#9d8d7d] line-through" : "text-[#3b2f25]"
                  }`}
                />

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#8f7f6e]">
                  {showSessionLink && task.sessionId && (
                    <Link href={`/sessions/${task.sessionId}`} className="underline decoration-[#cf9c7d] underline-offset-4">
                      {task.sessionTitle ?? "Open source session"}
                    </Link>
                  )}

                  {hasChanges && (
                    <button
                      type="button"
                      onClick={() => void patchTask(task.id, { content: draft })}
                      disabled={isPending}
                      className="rounded-full border border-[#d7b79a] px-3 py-1 text-[#6b4a36] transition-colors hover:bg-[#f8ebde]"
                    >
                      Save edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          </article>
        )
      })}

      {error && <p className="text-sm text-[#9c4c40]">{error}</p>}
    </div>
  )
}
