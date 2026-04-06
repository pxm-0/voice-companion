"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { ProfileMemoryView } from "@/lib/session-types"

type MemoryListProps = {
  memories: ProfileMemoryView[]
}

function memoryWeightOpacity(weight?: number): number {
  if (weight === undefined) return 0.75
  // 1.0 → 0.60 opacity, 5.0 → 1.0 opacity
  return Math.min(1, Math.max(0.45, 0.5 + weight * 0.1))
}

export function MemoryList({ memories }: MemoryListProps) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDrafts(Object.fromEntries(memories.map((memory) => [memory.id, memory.content])))
  }, [memories])

  async function patchMemory(memoryId: string, patch: { content?: string; pinned?: boolean; active?: boolean }) {
    setPendingId(memoryId)
    setError(null)

    try {
      const response = await fetch(`/api/profile/memories/${memoryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(data.error || "Failed to update memory.")
      }

      router.refresh()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update memory.")
    } finally {
      setPendingId(null)
    }
  }

  if (memories.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[#d9cbb7] bg-[#fffaf1] p-6 text-sm leading-7 text-[#756353]">
        No durable memory items have been extracted yet. Finish a session or add a manual log and this space will start feeling more like a second brain.
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {memories.map((memory) => {
        const draft = drafts[memory.id] ?? memory.content
        const hasChanges = draft.trim() !== memory.content
        const isPending = pendingId === memory.id

        return (
          <article
            key={memory.id}
            style={{ opacity: memoryWeightOpacity(memory.weight) }}
            className="rounded-[24px] border border-[#dfd2bf] bg-[#fffaf2] p-5 shadow-[0_8px_24px_rgba(111,81,56,0.06)] transition-opacity hover:!opacity-100"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-[#d7b79a] bg-[#f9efe2] px-3 py-1 text-xs text-[#7c5b45]">
                {memory.kind.toLowerCase()}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void patchMemory(memory.id, { pinned: !memory.pinned })}
                  disabled={isPending}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    memory.pinned
                      ? "border-[#c88862] bg-[#f2d7c2] text-[#704733]"
                      : "border-[#e1d4c2] bg-white text-[#8e7d6c] hover:bg-[#faf4ec]"
                  }`}
                >
                  {memory.pinned ? "Pinned" : "Pin"}
                </button>
                <button
                  type="button"
                  onClick={() => void patchMemory(memory.id, { active: false })}
                  disabled={isPending}
                  className="rounded-full border border-[#e1d4c2] bg-white px-3 py-1 text-xs text-[#8e6a58] transition-colors hover:bg-[#faf4ec]"
                >
                  Archive
                </button>
              </div>
            </div>

            <textarea
              value={draft}
              onChange={(event) =>
                setDrafts((current) => ({
                  ...current,
                  [memory.id]: event.target.value,
                }))
              }
              rows={4}
              className="mt-4 w-full resize-none rounded-2xl border border-transparent bg-transparent px-4 py-3 text-sm leading-7 text-[#3b2f25] transition-colors outline-none hover:border-[#eadfce] hover:bg-[#fffcf7] focus:border-[#d2a17f] focus:bg-[#fff] focus:shadow-sm"
            />

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#8f7f6e]">
              <span>Seen {new Date(memory.lastSeenAt).toLocaleDateString()}</span>
              {hasChanges && (
                <button
                  type="button"
                  onClick={() => void patchMemory(memory.id, { content: draft })}
                  disabled={isPending}
                  className="rounded-full border border-[#d7b79a] px-3 py-1 text-[#6b4a36] transition-colors hover:bg-[#f8ebde]"
                >
                  Save edit
                </button>
              )}
            </div>
          </article>
        )
      })}

      {error && <p className="text-sm text-[#9c4c40] md:col-span-2">{error}</p>}
    </div>
  )
}
