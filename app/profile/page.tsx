import { redirect } from "next/navigation"
import { MemoryList } from "@/app/_components/memory-list"
import { VoiceSettings } from "@/app/_components/voice-settings"
import { auth } from "@/lib/auth"
import { getProfileState } from "@/lib/session-finalizer"
import type { ProfileMemoryView } from "@/lib/session-types"

const PATTERN_KINDS = new Set(["THEME", "ROUTINE"])
const GOAL_KINDS = new Set(["GOAL"])
const FRAGMENT_KINDS = new Set(["IDENTITY", "PREFERENCE", "RELATIONSHIP", "EMOTION"])

function filterBy(memories: ProfileMemoryView[], kinds: Set<string>): ProfileMemoryView[] {
  return memories.filter((m) => m.active && kinds.has(m.kind))
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const profile = await getProfileState(session.user.id)
  const activeMemories = profile.memories.filter((m) => m.active)

  const patterns = filterBy(activeMemories, PATTERN_KINDS)
  const goals = filterBy(activeMemories, GOAL_KINDS)
  const fragments = filterBy(activeMemories, FRAGMENT_KINDS)

  return (
    <main className="min-h-full bg-[linear-gradient(180deg,#f5ede2_0%,#efe4d6_45%,#e8ddcf_100%)] px-4 py-8 text-[#2f241d] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">

        {/* Rolling summary */}
        <section>
          <p className="text-[11px] uppercase tracking-[0.34em] text-[#9f7c63]">Profile</p>
          <h1 className="mt-2 font-[family-name:Georgia,serif] text-4xl text-[#31251d]">
            How Eli sees you
          </h1>

          <div className="mt-6 rounded-xl border border-[#dfd2bf] bg-[#fff8ef] px-5 py-5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#9f7c63]">Rolling summary</p>
            <p className="mt-3 text-base leading-8 text-[#3b2f25]">
              {profile.snapshot?.summary ||
                "No profile summary has been generated yet. Complete a few sessions and Eli will start building its understanding of you."}
            </p>
          </div>
        </section>

        {/* Patterns */}
        {patterns.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#9f7c63]">Patterns</p>
            <h2 className="mt-1 font-[family-name:Georgia,serif] text-2xl text-[#31251d]">
              Recurring tendencies
            </h2>
            <p className="mt-2 text-sm text-[#705d4e]">
              Slow-moving truths about how you work, think, and move through the world.
            </p>
            <div className="mt-4">
              <MemoryList memories={patterns} />
            </div>
          </section>
        )}

        {/* Inferred goals */}
        {goals.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#9f7c63]">Inferred goals</p>
            <h2 className="mt-1 font-[family-name:Georgia,serif] text-2xl text-[#31251d]">
              What you seem to be working toward
            </h2>
            <p className="mt-2 text-sm text-[#705d4e]">
              Discovered from what you talk about — not declared.
            </p>
            <div className="mt-4">
              <MemoryList memories={goals} />
            </div>
          </section>
        )}

        {/* Memory fragments */}
        {fragments.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#9f7c63]">Memory fragments</p>
            <h2 className="mt-1 font-[family-name:Georgia,serif] text-2xl text-[#31251d]">
              Beliefs, preferences, and signals
            </h2>
            <p className="mt-2 text-sm text-[#705d4e]">
              Raw signals from your sessions — not yet patterns, but worth keeping.
            </p>
            <div className="mt-4">
              <MemoryList memories={fragments} />
            </div>
          </section>
        )}

        {/* Empty state */}
        {activeMemories.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#d9cbb7] bg-[#fffaf1] p-8 text-center text-[#756353]">
            No memories have been captured yet. Complete a few sessions and Eli will start building its model of you.
          </div>
        )}

        {/* Voice settings */}
        <section>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#9f7c63]">Voice</p>
          <h2 className="mt-1 font-[family-name:Georgia,serif] text-2xl text-[#31251d]">
            Companion voice
          </h2>
          <div className="mt-4 max-w-sm">
            <VoiceSettings initialVoice={profile.voicePreference} />
          </div>
        </section>
      </div>
    </main>
  )
}
