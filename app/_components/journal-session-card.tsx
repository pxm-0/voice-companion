"use client"

import Link from "next/link"
import { useState } from "react"
import { getModeLabel } from "@/lib/brain"
import { formatDateTime } from "@/lib/format-date"
import type { SessionCard } from "@/lib/session-types"

type Props = {
  session: SessionCard
}

export function JournalSessionCard({ session }: Props) {
  const [expanded, setExpanded] = useState(false)
  const title = session.artifact?.title ?? `Entry from ${formatDateTime(session.endedAt)}`

  return (
    <div className="rounded-xl border border-[#e2d5c2] bg-[#fffaf2]">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-[#e1d4c2] px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] text-[#9f7c63]">
              {session.inputType === "voice" ? "Voice" : "Manual"}
            </span>
            <span className="rounded border border-[#e1d4c2] px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] text-[#9f7c63]">
              {getModeLabel(session.mode)}
            </span>
          </div>
          <p className="mt-2 font-[family-name:Georgia,serif] text-lg text-[#31251d]">{title}</p>
          <p className="mt-0.5 text-xs text-[#9f7c63]">{formatDateTime(session.endedAt)}</p>
        </div>

        <span className="mt-4 shrink-0 text-[#b0917b]" aria-hidden>
          {expanded ? "↑" : "↓"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-[#ede0cf] px-5 pb-5 pt-4">
          {session.artifact?.summary && (
            <p className="text-sm leading-7 text-[#695646]">{session.artifact.summary}</p>
          )}

          {session.artifact?.rapidLogBullets && session.artifact.rapidLogBullets.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-sm text-[#564539]">
              {session.artifact.rapidLogBullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b78063]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={`/sessions/${session.id}`}
            className="mt-4 inline-block text-xs text-[#9c6648] underline underline-offset-2"
            onClick={(e) => e.stopPropagation()}
          >
            Open full entry →
          </Link>
        </div>
      )}
    </div>
  )
}
