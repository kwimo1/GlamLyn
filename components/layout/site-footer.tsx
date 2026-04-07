import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[rgba(36,26,19,0.08)] bg-[var(--surface-strong)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 pb-28 sm:px-6 sm:pb-12">
        <div className="flex flex-col gap-3">
          <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Glam Lyn
          </p>
          <p className="max-w-md text-sm leading-6 text-[var(--muted-ink)]">
            Réservation fluide, galerie éditoriale et suivi e-mail pour un centre de beauté
            local pensé d’abord pour le téléphone.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-[var(--muted-ink)]">
          <Link href="/mentions-legales" className="transition hover:text-[var(--ink)]">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="transition hover:text-[var(--ink)]">
            Confidentialité
          </Link>
          <Link href="/connexion" className="transition hover:text-[var(--ink)]">
            Connexion cliente / admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
