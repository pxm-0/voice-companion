import Link from "next/link"

export function Landing() {
  return (
    <div className="min-h-[100dvh] bg-[#faf7f3] text-[#2f241d]">
      {/* Minimal top bar — wordmark only, no nav */}
      <header className="absolute left-0 right-0 top-0 z-10 px-8 py-6 sm:px-12">
        <span className="font-[family-name:Georgia,serif] text-xl tracking-tight text-[#2f241d]">eli</span>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex min-h-[100dvh] flex-col justify-end overflow-hidden pb-20 pl-8 pr-8 pt-24 sm:pl-16 sm:pr-16 lg:pl-24">
        {/* Breathing orb — large, behind text, upper-right */}
        <div
          className="animate-breathe-gentle pointer-events-none absolute right-[-10%] top-[8%] h-[520px] w-[520px] rounded-full opacity-55 sm:right-[2%] sm:top-[10%] sm:h-[640px] sm:w-[640px] lg:right-[8%] lg:h-[720px] lg:w-[720px]"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, #e8cdb4 0%, #d4aa8a 35%, #c49070 60%, #b07858 80%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        {/* Subtle grain overlay on orb */}
        <div
          className="pointer-events-none absolute right-[-10%] top-[8%] h-[520px] w-[520px] rounded-full opacity-[0.07] mix-blend-multiply sm:right-[2%] sm:top-[10%] sm:h-[640px] sm:w-[640px] lg:right-[8%] lg:h-[720px] lg:w-[720px]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
          }}
          aria-hidden="true"
        />

        {/* Hero text — left-aligned, lower portion */}
        <div className="relative z-10 max-w-xl animate-slide-up">
          <h1 className="font-[family-name:Georgia,serif] text-[clamp(3.5rem,9vw,7rem)] leading-[0.9] tracking-tighter text-[#2f241d]">
            eli
          </h1>
          <p className="mt-5 max-w-sm font-[family-name:Georgia,serif] text-[clamp(1.1rem,2.5vw,1.4rem)] leading-snug text-[#5c432e]">
            A companion that listens<br className="hidden sm:block" /> and grows.
          </p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#a89484]">
            Speak freely. Eli remembers what matters — and learns who you are over time.
          </p>
          <div className="mt-10">
            <Link
              href="/login"
              className="pressable inline-flex items-center gap-2 rounded-lg bg-[#2f241d] px-7 py-3.5 text-sm font-medium text-[#f5ede2] transition-colors hover:bg-[#4a3828]"
            >
              Start journaling
              <svg
                width="13"
                height="13"
                viewBox="0 0 14 14"
                fill="none"
                className="opacity-60"
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
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-25" aria-hidden="true">
          <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
            <rect x="1" y="1" width="18" height="26" rx="9" stroke="#2f241d" strokeWidth="1.2" />
            <rect x="9" y="5" width="2" height="6" rx="1" fill="#2f241d" className="animate-bounce" />
          </svg>
        </div>
      </section>

      {/* ── Features ── asymmetric editorial grid */}
      <section className="bg-[#f3ede5] px-8 py-24 sm:px-16 lg:px-24" aria-label="How Eli works">
        <p className="mb-16 text-xs font-medium uppercase tracking-[0.2em] text-[#a89484]">
          How it works
        </p>

        <div className="grid gap-0 lg:grid-cols-[1fr_1px_1fr_1px_1fr]">
          {/* Column 1 */}
          <div className="pb-12 pr-0 lg:pb-0 lg:pr-12">
            <span className="font-[family-name:Georgia,serif] text-[3.5rem] leading-none text-[#d4aa8a]">
              01
            </span>
            <h2 className="mt-6 font-[family-name:Georgia,serif] text-2xl tracking-tight text-[#2f241d]">
              Speak freely.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#7d6959]">
              No typing, no prompts. Just talk. Eli listens through a live voice session and follows
              where you go — venting, reflecting, or thinking out loud.
            </p>
          </div>

          {/* Divider */}
          <div className="hidden bg-[#e5d9ca] lg:block" aria-hidden="true" />

          {/* Column 2 */}
          <div className="border-t border-[#e5d9ca] py-12 lg:border-0 lg:px-12 lg:py-0">
            <span className="font-[family-name:Georgia,serif] text-[3.5rem] leading-none text-[#c49070]">
              02
            </span>
            <h2 className="mt-6 font-[family-name:Georgia,serif] text-2xl tracking-tight text-[#2f241d]">
              Eli remembers.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#7d6959]">
              Every session builds a living memory — your goals, patterns, moods, and moments that
              matter. Nothing gets lost. Signals fade naturally if they stop being true.
            </p>
          </div>

          {/* Divider */}
          <div className="hidden bg-[#e5d9ca] lg:block" aria-hidden="true" />

          {/* Column 3 */}
          <div className="border-t border-[#e5d9ca] pt-12 lg:border-0 lg:pl-12 lg:pt-0">
            <span className="font-[family-name:Georgia,serif] text-[3.5rem] leading-none text-[#b07858]">
              03
            </span>
            <h2 className="mt-6 font-[family-name:Georgia,serif] text-2xl tracking-tight text-[#2f241d]">
              And grows with you.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#7d6959]">
              Eli adapts its voice to how you show up — gentle when you&apos;re tender, curious when
              you&apos;re thinking. The more you talk, the better it knows you.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pull quote ── */}
      <section className="bg-[#2f241d] px-8 py-24 sm:px-16 lg:px-24">
        <blockquote className="mx-auto max-w-2xl">
          <p className="font-[family-name:Georgia,serif] text-[clamp(1.3rem,3vw,1.9rem)] leading-relaxed text-[#e8d8c4]">
            &ldquo;Not a chatbot with memory. Not therapy-lite. A system that continuously evolves
            its understanding of who you are.&rdquo;
          </p>
          <footer className="mt-8 text-sm text-[#7d6959]">— What Eli is built to be</footer>
        </blockquote>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#faf7f3] px-8 py-28 text-center sm:px-16">
        <p className="font-[family-name:Georgia,serif] text-[clamp(1.8rem,4vw,3rem)] tracking-tight text-[#2f241d]">
          Ready to start?
        </p>
        <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-[#a89484]">
          Your journal, your memories. Private, personal, and always yours.
        </p>
        <Link
          href="/login"
          className="pressable mt-10 inline-flex items-center gap-2 rounded-lg bg-[#9c6648] px-8 py-4 text-sm font-medium text-white transition-colors hover:bg-[#7d5239]"
        >
          Open Eli
          <svg
            width="13"
            height="13"
            viewBox="0 0 14 14"
            fill="none"
            className="opacity-75"
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
      <footer className="border-t border-[#e5d9ca] bg-[#faf7f3] px-8 py-8 sm:px-16">
        <div className="flex items-center justify-between">
          <span className="font-[family-name:Georgia,serif] text-base tracking-tight text-[#2f241d]">eli</span>
          <p className="text-xs text-[#a89484]">Your voice, your story.</p>
        </div>
      </footer>
    </div>
  )
}
