import Link from "next/link";

export function MobileBookBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/60 bg-[rgba(249,244,236,0.96)] px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 shadow-[0_-18px_36px_rgba(36,26,19,0.12)] backdrop-blur-xl sm:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted-ink)]">
            Glam Lyn
          </p>
          <p className="truncate text-sm text-[var(--ink)]">
            Réservation rapide et confirmation par e-mail
          </p>
        </div>
        <Link
          href="/reservation"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--gold),#d3b179)] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(137,97,42,0.24)]"
        >
          Réserver
        </Link>
      </div>
    </div>
  );
}
