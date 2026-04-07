import { PublicShell } from "@/components/layout/public-shell";

export default function ConfidentialitePage() {
  return (
    <PublicShell compactHeader>
      <section className="page-frame px-4 py-10 sm:px-6">
        <div className="max-w-3xl space-y-6 rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-6">
          <p className="text-xs uppercase tracking-[0.38em] text-[var(--gold-deep)]">
            Confidentialité
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-none text-[var(--ink)]">
            Données de réservation et notifications e-mail
          </h1>
          <p className="text-sm leading-8 text-[var(--muted-ink)]">
            Cette page documente les données traitées pour la réservation, l’authentification par
            lien magique reçu par e-mail, les points fidélité, les avis et les notifications
            transactionnelles. Elle doit être enrichie avant mise en production avec la politique
            réelle du salon, les mentions Supabase Auth et le fournisseur d’e-mails transactionnels.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
