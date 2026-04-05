import { formatDateTime } from "@/lib/format-date"
import { getProfileState } from "@/lib/session-finalizer"

export default async function ProfilePage() {
  const profile = await getProfileState()

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top,#18253b_0%,#0d131d_35%,#06080d_100%)] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,25,36,0.95),rgba(11,15,23,0.98))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.34em] text-[#7D93AE]">Profile Memory</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Rolling personal context</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#A7B5C7]">
            This profile is the long-term layer that survives after older raw transcripts are pruned. It should only contain stable, reusable context rather than a full archive of every conversation.
          </p>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#7D93AE]">Profile Summary</p>
            <p className="mt-3 text-lg leading-8 text-white">
              {profile.snapshot?.summary ?? "No rolling profile summary has been generated yet."}
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,21,31,0.95),rgba(9,13,20,0.98))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#7D93AE]">Durable Memory Items</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Active context</h2>
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[#D7E1EE]">
              {profile.memories.length} {profile.memories.length === 1 ? "item" : "items"}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {profile.memories.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-[#A8B5C6] md:col-span-2">
                No durable memory items have been extracted yet. Finish a saved session and the profile will start filling in.
              </div>
            ) : (
              profile.memories.map((memory) => (
                <article
                  key={memory.id}
                  className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="rounded-full border border-[#7DA8FF]/30 bg-[#7DA8FF]/10 px-3 py-1 text-xs text-[#DDE9FF]">
                      {memory.kind.toLowerCase()}
                    </span>
                    <span className="text-xs text-[#8EA3BC]">Seen {formatDateTime(memory.lastSeenAt)}</span>
                  </div>

                  <p className="mt-4 text-base leading-7 text-white">{memory.content}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
