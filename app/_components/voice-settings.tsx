"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

const VOICES = [
  { value: "alloy", label: "Alloy — Warm and friendly" },
  { value: "breeze", label: "Breeze — Calm and soothing" },
  { value: "cinnamon", label: "Cinnamon — Warm and grounded" },
  { value: "echo", label: "Echo — Clear and balanced" },
  { value: "juniper", label: "Juniper — Gentle and thoughtful" },
  { value: "marin", label: "Marin — Bright and engaging" },
  { value: "sage", label: "Sage — Wise and grounded" },
  { value: "shimmer", label: "Shimmer — Energetic and uplifting" },
] as const

type VoiceValue = (typeof VOICES)[number]["value"]

type VoiceSettingsProps = {
  initialVoice: string
}

export function VoiceSettings({ initialVoice }: VoiceSettingsProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<string>(initialVoice)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const voice = event.target.value as VoiceValue
    setSelected(voice)
    setSaving(true)
    setError(null)

    try {
      const response = await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voicePreference: voice }),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save voice preference.")
      }

      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save voice preference.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <label htmlFor="voice-select" className="block text-xs uppercase tracking-[0.28em] text-[#9f7c63]">
        Select voice
      </label>
      <div className="relative">
        <select
          id="voice-select"
          value={selected}
          onChange={(e) => void handleChange(e)}
          disabled={saving}
          aria-busy={saving}
          className="w-full appearance-none rounded-2xl border border-[#dfd2bf] bg-white px-4 py-3 text-sm text-[#3b2f25] shadow-sm transition-colors outline-none hover:border-[#c9a98a] focus:border-[#c9a98a] focus:ring-2 focus:ring-[#c9a98a]/20 disabled:cursor-wait disabled:opacity-60"
        >
          {VOICES.map((voice) => (
            <option key={voice.value} value={voice.value}>
              {voice.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#9f7c63]" aria-hidden="true">
          {saving ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
      {saving && (
        <p className="text-xs text-[#9f7c63]" role="status" aria-live="polite">
          Saving…
        </p>
      )}
      {error && (
        <p className="text-xs text-[#9c4c40]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
