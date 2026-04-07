import { PublicShell } from "@/components/layout/public-shell";

export default function MentionsLegalesPage() {
  return (
    <PublicShell compactHeader>
      <section className="page-frame px-4 py-10 sm:px-6">
        <div className="max-w-3xl space-y-6 rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-6">
          <p className="text-xs uppercase tracking-[0.38em] text-[var(--gold-deep)]">
            Mentions légales
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-none text-[var(--ink)]">
            Informations légales minimales
          </h1>
          <p className="text-sm leading-8 text-[var(--muted-ink)]">
            Cette page sert de base à compléter avec l’identité juridique de l’exploitant, l’adresse exacte, les moyens de contact, l’hébergement et toute obligation réglementaire applicable en Algérie.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
