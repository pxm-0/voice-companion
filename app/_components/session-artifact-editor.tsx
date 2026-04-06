"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { SessionArtifact } from "@/lib/session-types"

type SessionArtifactEditorProps = {
  sessionId: string
  artifact: SessionArtifact
}

export function SessionArtifactEditor({ sessionId, artifact }: SessionArtifactEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(artifact.title)
  const [summary, setSummary] = useState(artifact.summary)
  const [bullets, setBullets] = useState(artifact.rapidLogBullets.join("\n"))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          summary,
          rapidLogBullets: bullets
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        }),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(data.error || "Failed to update journal artifact.")
      }

      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update journal artifact.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-[28px] border border-[#dfd2bf] bg-[#fffaf2] p-6 shadow-[0_12px_40px_rgba(111,81,56,0.08)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Journal Artifact</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#31251d]">Polish the saved entry</h2>
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-full bg-[#8f5d44] px-5 py-2 text-sm font-medium text-[#fff8ef] transition-colors hover:bg-[#7b4d38] disabled:cursor-wait disabled:opacity-70"
        >
          {saving ? "Saving" : "Save changes"}
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-[#5f4d40]">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-transparent bg-[#fffcf7] px-4 py-3 text-[#2f241d] transition-colors outline-none hover:border-[#e2d4c3] hover:bg-white focus:border-[#d2a17f] focus:bg-white focus:shadow-sm"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#5f4d40]">Summary</span>
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={5}
            className="mt-2 w-full resize-none rounded-2xl border border-transparent bg-[#fffcf7] px-4 py-3 text-sm leading-7 text-[#2f241d] transition-colors outline-none hover:border-[#e2d4c3] hover:bg-white focus:border-[#d2a17f] focus:bg-white focus:shadow-sm"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#5f4d40]">Rapid log bullets</span>
          <textarea
            value={bullets}
            onChange={(event) => setBullets(event.target.value)}
            rows={6}
            className="mt-2 w-full resize-none rounded-2xl border border-transparent bg-[#fffcf7] px-4 py-3 text-sm leading-7 text-[#2f241d] transition-colors outline-none hover:border-[#e2d4c3] hover:bg-white focus:border-[#d2a17f] focus:bg-white focus:shadow-sm"
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-[#9c4c40]">{error}</p>}
    </section>
  )
}
