import { redirect } from "next/navigation"
import { MemoryList } from "@/app/_components/memory-list"
import { auth } from "@/lib/auth"
import { getProfileState } from "@/lib/session-finalizer"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const profile = await getProfileState(session.user.id)

  return (
    <main className="min-h-full bg-[linear-gradient(180deg,#f5ede2_0%,#efe4d6_45%,#e8ddcf_100%)] px-4 py-8 text-[#2f241d] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-[#dbcdb8] bg-[#fffaf2] p-6 shadow-[0_18px_50px_rgba(92,63,39,0.08)]">
          <p className="text-[11px] uppercase tracking-[0.34em] text-[#9f7c63]">Profile Memory</p>
          <h1 className="mt-2 font-[family-name:Georgia,serif] text-4xl text-[#31251d]">Your second brain, shaped over time</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#705d4e]">
            This page keeps the durable context that should survive beyond any single session: preferences, themes, routines,
            goals, and patterns that make future conversations feel like they remember you.
          </p>

          <div className="mt-6 rounded-[28px] border border-[#dfd2bf] bg-[#fff8ef] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Rolling Summary</p>
            <p className="mt-3 max-w-prose text-base leading-8 text-[#3b2f25]">
              {profile.snapshot?.summary || "No rolling profile summary has been generated yet."}
            </p>
          </div>
        </section>

        <section className="rounded-[32px] border border-[#dbcdb8] bg-[#fffaf2] p-6 shadow-[0_18px_50px_rgba(92,63,39,0.08)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7c63]">Durable Memory Items</p>
              <h2 className="mt-2 font-[family-name:Georgia,serif] text-2xl text-[#31251d]">Edit, pin, or archive what matters</h2>
            </div>

            <div className="rounded-full border border-[#dccdb8] bg-[#fff8ef] px-4 py-2 text-sm text-[#6e5b4d]">
              {profile.memories.length} {profile.memories.length === 1 ? "item" : "items"}
            </div>
          </div>

          <div className="mt-6">
            <MemoryList memories={profile.memories} />
          </div>
        </section>
      </div>
    </main>
  )
}
