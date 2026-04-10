import Link from "next/link"

export function Landing() {
  return (
    <div className="min-h-screen bg-[#f5ede2] text-[#2f241d]">
      {/* Minimal top bar — wordmark only, no nav */}
      <header className="absolute left-0 right-0 top-0 z-10 px-8 py-6 sm:px-12">
        <span className="font-[family-name:Georgia,serif] text-xl text-[#2f241d]">eli</span>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen flex-col justify-end overflow-hidden pb-20 pl-8 pr-8 pt-24 sm:pl-16 sm:pr-16 lg:pl-24">
        {/* Breathing orb — large, behind text, upper-right */}
        <div
          className="animate-breathe-gentle pointer-events-none absolute right-[-10%] top-[8%] h-[520px] w-[520px] rounded-full opacity-60 sm:right-[2%] sm:top-[10%] sm:h-[640px] sm:w-[640px] lg:right-[8%] lg:h-[720px] lg:w-[720px]"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, #e8cdb4 0%, #d4aa8a 35%, #c49070 60%, #b07858 80%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        {/* Subtle grain overlay on orb */}
        <div
          className="pointer-events-none absolute right-[-10%] top-[8%] h-[520px] w-[520px] rounded-full opacity-10 mix-blend-multiply sm:right-[2%] sm:top-[10%] sm:h-[640px] sm:w-[640px] lg:right-[8%] lg:h-[720px] lg:w-[720px]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
          }}
          aria-hidden="true"
        />

        {/* Hero text — left-aligned, lower portion */}
        <div className="relative z-10 max-w-xl animate-slide-up">
          <h1 className="font-[family-name:Georgia,serif] text-[clamp(3.5rem,9vw,7rem)] leading-[0.9] tracking-tight text-[#2f241d]">
            eli
          </h1>
          <p className="mt-5 max-w-sm font-[family-name:Georgia,serif] text-[clamp(1.1rem,2.5vw,1.5rem)] leading-snug text-[#5c432e]">
            A companion that listens<br className="hidden sm:block" /> and grows.
          </p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#8a6e56]">
            Speak freely. Eli remembers what matters — and learns who you are over time.
          </p>
          <div className="mt-10">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-[#2f241d] px-7 py-3.5 text-sm font-medium text-[#f5ede2] transition-all hover:bg-[#4a3828] hover:shadow-[0_8px_24px_rgba(47,36,29,0.25)] active:scale-[0.98]"
            >
              Start journaling
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="opacity-70"
                aria-hidden="true"
              >
                <path
                  d="M1 7h12M8 2l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-30" aria-hidden="true">
          <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
            <rect x="1" y="1" width="18" height="26" rx="9" stroke="#2f241d" strokeWidth="1.2" />
            <rect x="9" y="5" width="2" height="6" rx="1" fill="#2f241d" className="animate-bounce" />
          </svg>
        </div>
      </section>

      {/* ── Features ── asymmetric editorial grid */}
      <section className="bg-[#efe4d6] px-8 py-24 sm:px-16 lg:px-24" aria-label="How Eli works">
        {/* Section label */}
        <p className="mb-16 text-xs font-medium uppercase tracking-[0.2em] text-[#9c7a62]">
          How it works
        </p>

        <div className="grid gap-0 lg:grid-cols-[1fr_1px_1fr_1px_1fr]">
          {/* Column 1 */}
          <div className="pb-12 pr-0 lg:pb-0 lg:pr-12">
            <span className="font-[family-name:Georgia,serif] text-[3.5rem] leading-none text-[#d4aa8a]">
              01
            </span>
            <h2 className="mt-6 font-[family-name:Georgia,serif] text-2xl text-[#2f241d]">
              Speak freely.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#6b5040]">
              No typing, no prompts. Just talk. Eli listens through a live voice session and follows
              where you go — venting, reflecting, or thinking out loud.
            </p>
          </div>

          {/* Divider */}
          <div className="hidden bg-[#dccdb8] lg:block" aria-hidden="true" />

          {/* Column 2 */}
          <div className="border-t border-[#dccdb8] py-12 lg:border-0 lg:px-12 lg:py-0">
            <span className="font-[family-name:Georgia,serif] text-[3.5rem] leading-none text-[#c49070]">
              02
            </span>
            <h2 className="mt-6 font-[family-name:Georgia,serif] text-2xl text-[#2f241d]">
              Eli remembers.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#6b5040]">
              Every session builds a living memory — your goals, patterns, moods, and moments that
              matter. Nothing gets lost. Signals fade naturally if they stop being true.
            </p>
          </div>

          {/* Divider */}
          <div className="hidden bg-[#dccdb8] lg:block" aria-hidden="true" />

          {/* Column 3 */}
          <div className="border-t border-[#dccdb8] pt-12 lg:border-0 lg:pl-12 lg:pt-0">
            <span className="font-[family-name:Georgia,serif] text-[3.5rem] leading-none text-[#b07858]">
              03
            </span>
            <h2 className="mt-6 font-[family-name:Georgia,serif] text-2xl text-[#2f241d]">
              And grows with you.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#6b5040]">
              Eli adapts its voice to how you show up — gentle when you&apos;re tender, curious when
              you&apos;re thinking. The more you talk, the better it knows you.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pull quote ── */}
      <section className="bg-[#2f241d] px-8 py-24 sm:px-16 lg:px-24">
        <blockquote className="mx-auto max-w-2xl">
          <p className="font-[family-name:Georgia,serif] text-[clamp(1.4rem,3vw,2rem)] leading-relaxed text-[#e8d8c4]">
            &ldquo;Not a chatbot with memory. Not therapy-lite. A system that continuously evolves
            its understanding of who you are.&rdquo;
          </p>
          <footer className="mt-8 text-sm text-[#9c7a62]">— What Eli is built to be</footer>
        </blockquote>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#f5ede2] px-8 py-28 text-center sm:px-16">
        <p className="font-[family-name:Georgia,serif] text-[clamp(1.8rem,4vw,3rem)] text-[#2f241d]">
          Ready to start?
        </p>
        <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-[#8a6e56]">
          Your journal, your memories. Private, personal, and always yours.
        </p>
        <Link
          href="/login"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#9c6648] px-8 py-4 text-sm font-medium text-white transition-all hover:bg-[#7d5239] hover:shadow-[0_8px_28px_rgba(156,102,72,0.35)] active:scale-[0.98]"
        >
          Open Eli
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="opacity-80"
            aria-hidden="true"
          >
            <path
              d="M1 7h12M8 2l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#dccdb8] bg-[#f5ede2] px-8 py-8 sm:px-16">
        <div className="flex items-center justify-between">
          <span className="font-[family-name:Georgia,serif] text-base text-[#2f241d]">eli</span>
          <p className="text-xs text-[#b09a86]">Your voice, your story.</p>
        </div>
      </footer>
    </div>
  )
}
