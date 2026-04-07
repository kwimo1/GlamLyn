import { PublicShell } from "@/components/layout/public-shell";
import { RatingStars } from "@/components/ui/rating-stars";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPublicData } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function AvisPage() {
  const data = await getPublicData();

  return (
    <PublicShell compactHeader>
      <section className="page-frame px-4 py-10 sm:px-6">
        <SectionHeading
          eyebrow="Avis"
          title="Retours clients vérifiés et preuve sociale Google."
          description="Les clientes avec compte peuvent déposer un avis après une prestation terminée. Les retours sont relus par l’admin avant publication."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.34em] text-[var(--gold-deep)]">
              Avis Glam Lyn
            </p>
            <div className="mt-6 space-y-4">
              {data.siteReviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-[24px] border border-[var(--line)] bg-white/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        {review.customer?.name ?? "Cliente Glam Lyn"}
                      </p>
                      <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted-ink)]">
                        Compte du site
                      </p>
                    </div>
                    <RatingStars rating={review.rating} />
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[var(--muted-ink)]">
                    {review.text}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] border border-[var(--line)] bg-[rgba(36,26,19,0.94)] p-5 text-[var(--surface)] sm:p-6">
            <p className="text-xs uppercase tracking-[0.34em] text-[rgba(255,244,220,0.72)]">
              Google
            </p>
            <div className="mt-6 space-y-4">
              {data.googleReviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{review.authorName}</p>
                      <p className="text-xs uppercase tracking-[0.28em] text-[rgba(255,244,220,0.62)]">
                        {review.relativeTimeDescription}
                      </p>
                    </div>
                    <RatingStars rating={review.rating} />
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[rgba(255,244,220,0.78)]">
                    {review.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
