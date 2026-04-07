import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { LogoutButton } from "@/components/ui/logout-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { cancelBookingAction, rescheduleBookingAction, submitReviewAction } from "@/app/compte/actions";
import {
  formatCurrencyDzd,
  formatDateTimeCompact,
  formatDuration,
} from "@/lib/format";
import { getCustomerDashboard, getSuggestedSlotsForBooking } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function ComptePage() {
  const dashboard = await getCustomerDashboard();

  if (!dashboard) {
    return (
      <PublicShell compactHeader>
        <section className="page-frame px-4 py-10 sm:px-6">
          <div className="max-w-3xl space-y-6 rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-6">
            <SectionHeading
              eyebrow="Espace client"
              title="Connectez-vous avec votre téléphone."
              description="Le compte est facultatif, mais il permet de gérer ses rendez-vous, suivre ses points et déposer un avis après une prestation terminée."
            />
            <Link
              href="/connexion"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--surface)]"
            >
              Ouvrir la connexion cliente
            </Link>
          </div>
        </section>
      </PublicShell>
    );
  }

  const suggestedSlots = await Promise.all(
    dashboard.bookings
      .filter((booking) => booking.canSelfManage)
      .map(async (booking) => [booking.id, await getSuggestedSlotsForBooking(booking)] as const),
  );

  const suggestedSlotsMap = new Map(suggestedSlots);
  const reviewedBookingIds = new Set(dashboard.reviews.map((review) => review.bookingId));

  return (
    <PublicShell compactHeader>
      <section className="page-frame px-4 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <aside className="rounded-[34px] border border-[var(--line)] bg-[rgba(36,26,19,0.94)] p-6 text-[var(--surface)]">
            <p className="text-xs uppercase tracking-[0.34em] text-[rgba(255,244,220,0.72)]">
              Mon compte
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-none">
              {dashboard.customer.name}
            </h1>
            <p className="mt-4 text-sm leading-7 text-[rgba(255,244,220,0.78)]">
              Téléphone principal: {dashboard.customer.phone}
              <br />
              Points disponibles: <strong>{dashboard.customer.points}</strong>
            </p>
            <p className="mt-6 rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-[rgba(255,244,220,0.8)]">
              Créez votre compte et gagnez 1 point maintenant, puis 1 point à chaque réservation.
              Vos points sont suivis ici et peuvent être convertis manuellement par l’administration.
            </p>
            <div className="mt-6">
              <LogoutButton redirectTo="/" label="Me déconnecter" />
            </div>
          </aside>

          <div className="space-y-6">
            <section className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-5 sm:p-6">
              <SectionHeading
                eyebrow="Réservations"
                title="Prochains rendez-vous"
                description="Les comptes clients peuvent annuler ou reporter jusqu’à 12 heures avant le créneau."
              />

              <div className="mt-8 space-y-4">
                {dashboard.bookings.filter((booking) => booking.status === "confirmed").length ? (
                  dashboard.bookings
                    .filter((booking) => booking.status === "confirmed")
                    .map((booking) => (
                      <article
                        key={booking.id}
                        className="rounded-[28px] border border-[var(--line)] bg-white/70 p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[var(--ink)]">
                              {booking.services.map((service) => service.name).join(" · ")}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-[var(--muted-ink)]">
                              {formatDateTimeCompact(booking.startsAt)} · {formatDuration(booking.totalDurationMinutes)} · {formatCurrencyDzd(booking.totalPriceDzd)}
                            </p>
                          </div>

                          {booking.canSelfManage ? (
                            <div className="flex flex-col gap-3 sm:items-end">
                              <form action={cancelBookingAction}>
                                <input type="hidden" name="bookingId" value={booking.id} />
                                <button
                                  type="submit"
                                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)]"
                                >
                                  Annuler
                                </button>
                              </form>

                              <form action={rescheduleBookingAction} className="flex flex-col gap-3">
                                <input type="hidden" name="bookingId" value={booking.id} />
                                <select
                                  name="startsAt"
                                  className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm text-[var(--ink)]"
                                  defaultValue={suggestedSlotsMap.get(booking.id)?.[0]?.startsAt ?? ""}
                                >
                                  {suggestedSlotsMap.get(booking.id)?.map((slot) => (
                                    <option key={slot.startsAt} value={slot.startsAt}>
                                      {slot.dateLabel} · {slot.timeLabel}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="submit"
                                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--gold)] px-4 text-sm font-semibold text-white"
                                >
                                  Reporter
                                </button>
                              </form>
                            </div>
                          ) : (
                            <p className="max-w-xs text-sm leading-7 text-[var(--muted-ink)]">
                              Le délai autonome est dépassé. Contactez le salon pour modifier ce rendez-vous.
                            </p>
                          )}
                        </div>
                      </article>
                    ))
                ) : (
                  <p className="rounded-[28px] border border-dashed border-[var(--line)] px-4 py-5 text-sm text-[var(--muted-ink)]">
                    Aucun rendez-vous confirmé pour le moment.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-5 sm:p-6">
              <SectionHeading
                eyebrow="Avis"
                title="Déposer un avis après votre visite"
                description="Seules les prestations terminées peuvent être notées. Les avis sont relus par l’administration avant publication."
              />

              <div className="mt-8 space-y-4">
                {dashboard.bookings
                  .filter((booking) => booking.status === "completed" && !reviewedBookingIds.has(booking.id))
                  .map((booking) => (
                    <form
                      key={booking.id}
                      action={submitReviewAction}
                      className="rounded-[28px] border border-[var(--line)] bg-white/70 p-4"
                    >
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        {booking.services.map((service) => service.name).join(" · ")}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted-ink)]">
                        {formatDateTimeCompact(booking.startsAt)}
                      </p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr_auto]">
                        <select
                          name="rating"
                          defaultValue="5"
                          className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm text-[var(--ink)]"
                        >
                          <option value="5">5 / 5</option>
                          <option value="4">4 / 5</option>
                          <option value="3">3 / 5</option>
                          <option value="2">2 / 5</option>
                          <option value="1">1 / 5</option>
                        </select>
                        <textarea
                          name="text"
                          required
                          className="min-h-24 rounded-[24px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none"
                          placeholder="Partagez votre expérience..."
                        />
                        <button
                          type="submit"
                          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--surface)]"
                        >
                          Envoyer
                        </button>
                      </div>
                    </form>
                  ))}

                {!dashboard.bookings.some(
                  (booking) => booking.status === "completed" && !reviewedBookingIds.has(booking.id),
                ) ? (
                  <p className="rounded-[28px] border border-dashed border-[var(--line)] px-4 py-5 text-sm text-[var(--muted-ink)]">
                    Aucun avis en attente. Après une prestation terminée, vous pourrez poster ici.
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
