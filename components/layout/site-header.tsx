import Link from "next/link";
import { PUBLIC_NAV } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-white/50 bg-[rgba(248,243,234,0.82)] backdrop-blur-xl",
        compact ? "bg-[rgba(253,250,245,0.92)]" : "",
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 flex-col">
            <span className="font-[family-name:var(--font-display)] text-[1.4rem] leading-none text-[var(--ink)]">
              Glam Lyn
            </span>
            <span className="text-[10px] uppercase tracking-[0.38em] text-[var(--muted-ink)]">
              Beauté à Alger
            </span>
          </Link>

          <nav className="hidden items-center gap-5 text-sm text-[var(--muted-ink)] sm:flex">
            {PUBLIC_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-[var(--ink)]">
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/reservation"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--gold-deep)] bg-[linear-gradient(135deg,var(--gold),#d3b179)] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(137,97,42,0.22)] transition hover:brightness-105"
          >
            Réserver
          </Link>
        </div>

        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 text-sm sm:hidden">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-white/70 px-4 text-[var(--ink)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
