import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { RatingStars } from "@/components/ui/rating-stars";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatCurrencyDzd, formatDuration } from "@/lib/format";
import { getPublicData } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getPublicData();
  const featuredServices = data.services.filter((service) => service.featured).slice(0, 5);
  const heroPrimary = data.heroMedia[0];
  const heroSecondary = data.heroMedia[1] ?? data.heroMedia[0];

  return (
    <PublicShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 ambient-grid opacity-30" />
        <div className="page-frame grid min-h-[calc(100svh-70px)] gap-10 px-4 pb-20 pt-8 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-end lg:pb-16 lg:pt-14">
          <div className="relative z-10 flex flex-col justify-end gap-6 reveal-up">
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--gold-deep)]">
              {data.businessSettings.heroEyebrow}
            </p>
            <div className="space-y-4">
              <h1 className="max-w-xl font-[family-name:var(--font-display)] text-6xl leading-[0.9] text-[var(--ink)] sm:text-7xl">
                Glam Lyn
              </h1>
              <p className="max-w-xl text-3xl leading-tight text-[var(--ink)] sm:text-4xl">
                {data.businessSettings.heroTitle}
              </p>
              <p className="max-w-lg text-base leading-8 text-[var(--muted-ink)] sm:text-lg">
                {data.businessSettings.heroDescription}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/reservation"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--gold-deep)] bg-[linear-gradient(135deg,var(--gold),#d3b179)] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(137,97,42,0.24)]"
              >
                Réserver maintenant
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/connexion"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--line)] bg-white/60 px-5 text-sm font-semibold text-[var(--ink)]"
              >
                Créer mon compte
              </Link>
            </div>

            <p className="max-w-lg rounded-[28px] border border-[rgba(181,138,71,0.18)] bg-[rgba(255,251,244,0.74)] px-5 py-4 text-sm leading-7 text-[var(--muted-ink)]">
              {data.businessSettings.loyaltyCopy}
            </p>
          </div>

          <div className="relative flex items-end justify-end lg:min-h-[720px]">
            {heroPrimary ? (
              <div className="relative h-[66svh] w-full overflow-hidden rounded-[36px] border border-white/60 poster-shadow shimmer sm:h-[74svh] lg:h-[82svh]">
                <Image src={heroPrimary.src} alt={heroPrimary.alt} fill priority className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(36,26,19,0.46)] via-transparent to-transparent" />
              </div>
            ) : null}

            {heroSecondary ? (
              <div className="poster-shadow absolute -bottom-6 left-0 hidden w-52 overflow-hidden rounded-[28px] border border-white/60 bg-white/80 p-3 sm:block lg:-left-6 lg:w-60">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[22px]">
                  <Image src={heroSecondary.src} alt={heroSecondary.alt} fill className="object-cover" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="page-frame px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="Parcours simple"
          title="Réserver depuis son téléphone, sans friction."
          description="Glam Lyn affiche clairement la durée, le prix total, les créneaux disponibles et les notifications e-mail, tout en gardant un ton local et premium."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: Clock3,
              title: "Prix + durée cumulés",
              text: "Chaque prestation sélectionnée met à jour le total immédiatement.",
            },
            {
              icon: ShieldCheck,
              title: "Disponibilité en direct",
              text: "Le calendrier ne montre que les créneaux réellement libres.",
            },
            {
              icon: Mail,
              title: "Suivi par e-mail",
              text: "Confirmation, rappel, annulation, report et demande d’avis.",
            },
            {
              icon: Sparkles,
              title: "Compte facultatif",
              text: "Créer un compte rapporte 1 point, puis 1 point à chaque réservation terminée.",
            },
          ].map((item) => (
            <div key={item.title} className="elevated-card rounded-[30px] p-5">
              <item.icon className="h-5 w-5 text-[var(--gold-deep)]" />
              <p className="mt-5 text-lg font-semibold text-[var(--ink)]">{item.title}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted-ink)]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-frame px-4 py-12 sm:px-6">
        <SectionHeading
          eyebrow="Prestations"
          title="Cheveux, beauté et bien-être en une seule réservation."
          description="Le panier unique permet de combiner librement les services. Durée et prix total suivent la sélection, sans surprise."
        />

        <div className="mt-10 space-y-4">
          {featuredServices.map((service, index) => (
            <div
              key={service.id}
              className="grid gap-4 rounded-[30px] border border-[var(--line)] bg-[rgba(255,252,248,0.82)] px-5 py-5 sm:grid-cols-[64px_1fr_auto] sm:items-center"
            >
              <div className="font-[family-name:var(--font-display)] text-4xl text-[rgba(181,138,71,0.64)]">
                {(index + 1).toString().padStart(2, "0")}
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--ink)]">{service.name}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted-ink)]">{service.description}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-base font-semibold text-[var(--gold-deep)]">
                  {formatCurrencyDzd(service.priceDzd)}
                </p>
                <p className="mt-1 text-sm text-[var(--muted-ink)]">
                  {formatDuration(service.durationMinutes)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="page-frame grid gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <SectionHeading
            eyebrow="Galerie"
            title="Le site est prêt pour vos vraies photos du salon."
            description="L’admin peut téléverser, remplacer, réordonner et retirer les images des sections principales à tout moment."
          />
          <p className="max-w-md text-sm leading-7 text-[var(--muted-ink)]">
            Les visuels ci-dessous sont des placeholders premium. Remplacez-les par vos propres
            photos pour refléter le travail réel du salon et renforcer la confiance dès le premier
            écran.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {data.galleryMedia.map((asset, index) => (
            <div
              key={asset.id}
              className={`relative overflow-hidden rounded-[30px] border border-white/60 poster-shadow ${
                index === 0 ? "col-span-2 aspect-[1.4/1]" : "aspect-[4/5]"
              }`}
            >
              <Image src={asset.src} alt={asset.alt} fill className="object-cover" />
            </div>
          ))}
        </div>
      </section>

      <section className="page-frame px-4 py-14 sm:px-6">
        <SectionHeading
          eyebrow="Avis"
          title="Des retours de clientes du site et de Google."
          description="Les avis du site sont publiés après validation admin. Les extraits Google renforcent la preuve sociale autour du salon."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {[...data.siteReviews, ...data.googleReviews].map((review) => {
            const author =
              "customer" in review ? review.customer?.name ?? "Cliente Glam Lyn" : review.authorName;
            const source = "customer" in review ? "Compte Glam Lyn" : "Google";

            return (
              <article
                key={review.id}
                className="rounded-[30px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{author}</p>
                    <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted-ink)]">
                      {source}
                    </p>
                  </div>
                  <RatingStars rating={review.rating} />
                </div>
                <p className="mt-5 text-sm leading-7 text-[var(--muted-ink)]">{review.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="reels" className="page-frame scroll-mt-32 px-4 py-14 sm:px-6">
        <SectionHeading
          eyebrow="Instagram"
          title="Reels mis en avant par l’administration."
          description="La section contenu est prête pour une curation admin simple: couverture, titre, lien reel et ordre d’affichage."
        />

        <div className="mt-10 flex snap-x gap-4 overflow-x-auto pb-4">
          {data.reels.map((reel) => (
            <a
              key={reel.id}
              href={reel.reelUrl}
              target="_blank"
              rel="noreferrer"
              className="group relative min-w-[260px] snap-start overflow-hidden rounded-[30px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)]"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={reel.externalCoverUrl ?? data.galleryMedia[0]?.src ?? "/placeholders/hero-detail.svg"}
                  alt={reel.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(36,26,19,0.65)] via-transparent to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="text-lg font-semibold">{reel.title}</p>
                <p className="mt-1 text-sm text-[rgba(255,255,255,0.82)]">{reel.caption}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="page-frame px-4 pb-18 pt-6 sm:px-6">
        <div className="overflow-hidden rounded-[40px] border border-[rgba(181,138,71,0.18)] bg-[rgba(255,252,248,0.92)] p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.38em] text-[var(--gold-deep)]">
                Prête à réserver
              </p>
              <h2 className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-none text-[var(--ink)]">
                Une réservation claire pour la cliente, un suivi complet pour la gérante.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted-ink)]">
                Réservez sans paiement en ligne, recevez vos e-mails, créez votre compte si vous le
                souhaitez et laissez l’administration gérer photos, services, avis et planning depuis
                un seul tableau de bord.
              </p>
            </div>
            <Link
              href="/reservation"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--gold)] px-6 text-sm font-semibold text-white"
            >
              Réserver maintenant
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
