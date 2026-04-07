import { LoginPanels } from "@/components/auth/login-panels";
import { PublicShell } from "@/components/layout/public-shell";
import { SectionHeading } from "@/components/ui/section-heading";

export const dynamic = "force-dynamic";

export default function ConnexionPage() {
  return (
    <PublicShell compactHeader>
      <section className="page-frame px-4 py-10 sm:px-6">
        <SectionHeading
          eyebrow="Connexion"
          title="Cliente et administration utilisent des parcours distincts."
          description="Le compte client fonctionne par lien magique reçu par e-mail. L’admin accède au tableau de bord avec son identifiant spécifique et son mot de passe."
        />

        <div className="mt-10">
          <LoginPanels />
        </div>
      </section>
    </PublicShell>
  );
}
