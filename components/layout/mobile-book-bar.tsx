import Link from "next/link";

export function MobileBookBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/60 bg-[rgba(249,244,236,0.92)] px-4 py-3 shadow-[0_-18px_36px_rgba(36,26,19,0.08)] backdrop-blur-xl sm:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted-ink)]">
            Glam Lyn
          </p>
          <p className="truncate text-sm text-[var(--ink)]">
            Réservation rapide et confirmation SMS
          </p>
        </div>
        <Link
          href="/reservation"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--surface)]"
        >
          Book now
        </Link>
      </div>
    </div>
  );
}
