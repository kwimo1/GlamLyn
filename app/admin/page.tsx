import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/ui/logout-button";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  cancelBookingAdminAction,
  completeBookingAction,
  deleteMediaAction,
  moderateReviewAction,
  rescheduleBookingAdminAction,
  uploadMediaAction,
  upsertBusinessSettingsAction,
  upsertReelAction,
  upsertServiceAction,
} from "@/app/admin/actions";
import { formatCurrencyDzd, formatDateTimeCompact, formatDuration } from "@/lib/format";
import { getAdminDashboard } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const dashboard = await getAdminDashboard();

  if (!dashboard) {
    return (
      <main className="min-h-screen bg-[var(--surface)] px-4 py-10 sm:px-6">
        <div className="page-frame max-w-3xl rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-6">
          <SectionHeading
            eyebrow="Administration"
            title="Connexion admin requise."
            description="Connectez-vous avec l’identifiant admin spécifique depuis la page de connexion pour ouvrir le tableau de bord."
          />
          <Link
            href="/connexion"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--surface)]"
          >
            Aller à la connexion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--surface)] px-4 py-8 sm:px-6">
      <div className="page-frame space-y-8">
        <section className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <aside className="rounded-[34px] border border-[var(--line)] bg-[rgba(36,26,19,0.94)] p-6 text-[var(--surface)]">
            <p className="text-xs uppercase tracking-[0.34em] text-[rgba(255,244,220,0.72)]">
              Tableau de bord
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-none">
              {dashboard.admin.displayName}
            </h1>
            <p className="mt-4 text-sm leading-7 text-[rgba(255,244,220,0.78)]">
              Pilotage du site, du planning, des clientes, des visuels, des reels et des avis depuis
              une seule interface responsive.
            </p>
            <div className="mt-6">
              <LogoutButton redirectTo="/connexion" label="Déconnexion admin" />
            </div>
          </aside>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                label: "Réservations semaine",
                value: dashboard.metrics.bookingsThisWeek.toString(),
              },
              {
                label: "Annulations semaine",
                value: dashboard.metrics.cancellationsThisWeek.toString(),
              },
              {
                label: "Taux d’occupation",
                value: `${dashboard.metrics.occupancyRate}%`,
              },
              {
                label: "Nouveaux comptes",
                value: dashboard.metrics.newAccountsThisMonth.toString(),
              },
              {
                label: "Avis en attente",
                value: dashboard.metrics.pendingReviews.toString(),
              },
              {
                label: "Top services",
                value: dashboard.metrics.topServices.length.toString(),
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-[30px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-5"
              >
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted-ink)]">
                  {metric.label}
                </p>
                <p className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--ink)]">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-5 sm:p-6">
          <SectionHeading
            eyebrow="Planning"
            title="Réservations à venir"
            description="Reprogrammez, annulez ou marquez une prestation comme terminée. Les e-mails correspondants partent automatiquement quand une adresse est liée au compte."
          />
          <div className="mt-8 space-y-4">
            {dashboard.upcomingBookings.map((booking) => {
              const defaultDate = booking.startsAt.slice(0, 10);
              const defaultTime = booking.startsAt.slice(11, 16);

              return (
                <article
                  key={booking.id}
                  className="rounded-[28px] border border-[var(--line)] bg-white/70 p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        {booking.customer?.name ?? "Cliente"} · {booking.customer?.phone ?? "n/a"}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted-ink)]">
                        {booking.customer?.email ?? "Pas d’e-mail lié"}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted-ink)]">
                        {booking.services.map((service) => service.name).join(" · ")}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted-ink)]">
                        {formatDateTimeCompact(booking.startsAt)} ·{" "}
                        {formatDuration(booking.totalDurationMinutes)} ·{" "}
                        {formatCurrencyDzd(booking.totalPriceDzd)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 lg:min-w-[280px]">
                      <div className="flex gap-3">
                        <form action={completeBookingAction} className="flex-1">
                          <input type="hidden" name="bookingId" value={booking.id} />
                          <button
                            type="submit"
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--surface)]"
                          >
                            Terminer
                          </button>
                        </form>
                        <form action={cancelBookingAdminAction} className="flex-1">
                          <input type="hidden" name="bookingId" value={booking.id} />
                          <button
                            type="submit"
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)]"
                          >
                            Annuler
                          </button>
                        </form>
                      </div>

                      <form action={rescheduleBookingAdminAction} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input
                          type="date"
                          name="date"
                          defaultValue={defaultDate}
                          className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm text-[var(--ink)]"
                        />
                        <input
                          type="time"
                          name="time"
                          defaultValue={defaultTime}
                          className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm text-[var(--ink)]"
                        />
                        <button
                          type="submit"
                          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--gold)] px-4 text-sm font-semibold text-white"
                        >
                          Reporter
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-5 sm:p-6">
            <SectionHeading
              eyebrow="Services"
              title="Catalogue, durée et prix"
              description="Chaque ligne reste éditable. Désactivez un service sans le supprimer du suivi historique."
            />

            <div className="mt-8 space-y-3">
              {dashboard.services.map((service) => (
                <form
                  key={service.id}
                  action={upsertServiceAction}
                  className="grid gap-3 rounded-[24px] border border-[var(--line)] bg-white/70 p-4"
                >
                  <input type="hidden" name="id" value={service.id} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      name="name"
                      defaultValue={service.name}
                      className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm text-[var(--ink)]"
                    />
                    <select
                      name="categoryId"
                      defaultValue={service.categoryId}
                      className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm text-[var(--ink)]"
                    >
                      <option value="cheveux">Cheveux</option>
                      <option value="beaute_bien_etre">Beauté et bien-être</option>
                    </select>
                  </div>
                  <textarea
                    name="description"
                    defaultValue={service.description}
                    className="min-h-20 rounded-[24px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)]"
                  />
                  <div className="grid gap-3 md:grid-cols-4">
                    <input
                      name="priceDzd"
                      defaultValue={service.priceDzd}
                      className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm text-[var(--ink)]"
                    />
                    <input
                      name="durationMinutes"
                      defaultValue={service.durationMinutes}
                      className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm text-[var(--ink)]"
                    />
                    <input
                      name="order"
                      defaultValue={service.order}
                      className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm text-[var(--ink)]"
                    />
                    <div className="flex items-center gap-4 rounded-full border border-[var(--line)] bg-white px-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="active" defaultChecked={service.active} />
                        Actif
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="featured" defaultChecked={service.featured} />
                        Vedette
                      </label>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--surface)]"
                  >
                    Enregistrer
                  </button>
                </form>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-5 sm:p-6">
              <SectionHeading
                eyebrow="Médias"
                title="Photos du site"
                description="Téléversez, réordonnez ou retirez les visuels des sections publiques."
              />

              <form action={uploadMediaAction} className="mt-8 grid gap-3 rounded-[24px] border border-[var(--line)] bg-white/70 p-4">
                <input name="label" placeholder="Label média" className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm" />
                <input name="alt" placeholder="Texte alternatif" className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm" />
                <div className="grid gap-3 md:grid-cols-2">
                  <select name="section" className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm">
                    <option value="hero">Hero</option>
                    <option value="gallery">Galerie</option>
                    <option value="instagram">Instagram</option>
                    <option value="reviews">Avis</option>
                  </select>
                  <input name="order" defaultValue="10" className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm" />
                </div>
                <input type="file" name="file" className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
                <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--surface)]">
                  Ajouter le média
                </button>
              </form>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {dashboard.mediaAssets.map((asset) => (
                  <article key={asset.id} className="rounded-[24px] border border-[var(--line)] bg-white/70 p-3">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[20px]">
                      <Image src={asset.src} alt={asset.alt} fill className="object-cover" />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ink)]">{asset.label}</p>
                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-ink)]">
                          {asset.section} · ordre {asset.order}
                        </p>
                      </div>
                      {asset.kind === "upload" ? (
                        <form action={deleteMediaAction}>
                          <input type="hidden" name="mediaId" value={asset.id} />
                          <input type="hidden" name="storagePath" value={asset.storagePath ?? ""} />
                          <button type="submit" className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-3 text-xs font-semibold text-[var(--ink)]">
                            Supprimer
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-5 sm:p-6">
              <SectionHeading
                eyebrow="Instagram"
                title="Reels mis en avant"
                description="Le contenu est entièrement curé par l’admin: titre, lien, visuel de couverture et ordre."
              />

              <div className="mt-8 space-y-3">
                {dashboard.instagramReels.map((reel) => (
                  <form key={reel.id} action={upsertReelAction} className="grid gap-3 rounded-[24px] border border-[var(--line)] bg-white/70 p-4">
                    <input type="hidden" name="id" value={reel.id} />
                    <input name="title" defaultValue={reel.title} className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm" />
                    <input name="reelUrl" defaultValue={reel.reelUrl} className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm" />
                    <input name="externalCoverUrl" defaultValue={reel.externalCoverUrl ?? ""} className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm" />
                    <textarea name="caption" defaultValue={reel.caption} className="min-h-20 rounded-[24px] border border-[var(--line)] bg-white px-4 py-3 text-sm" />
                    <div className="grid gap-3 md:grid-cols-[120px_auto_auto]">
                      <input name="order" defaultValue={reel.order} className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm" />
                      <label className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 text-sm">
                        <input type="checkbox" name="published" defaultChecked={reel.published} />
                        Publié
                      </label>
                      <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--surface)]">
                        Mettre à jour
                      </button>
                    </div>
                  </form>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
          <section className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-5 sm:p-6">
            <SectionHeading
              eyebrow="Clientes"
              title="Comptes et historique"
              description="Retrouvez les inscrites, leur statut de compte, leurs points et leur dernier rendez-vous."
            />
            <div className="mt-8 space-y-3">
              {dashboard.customers.map((customer) => (
                <article key={customer.id} className="rounded-[24px] border border-[var(--line)] bg-white/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">{customer.name}</p>
                      <p className="mt-1 text-sm text-[var(--muted-ink)]">
                        {customer.email ?? "Pas d’e-mail"} · {customer.phone ?? "Pas de téléphone"}
                      </p>
                    </div>
                    <span className="inline-flex min-h-10 items-center rounded-full bg-[rgba(181,138,71,0.12)] px-4 text-xs uppercase tracking-[0.24em] text-[var(--gold-deep)]">
                      {customer.hasAccount ? "Compte actif" : "Invitée"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-ink)]">Points</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{customer.points}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-ink)]">Dernier rendez-vous</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                        {customer.lastBookingAt ? formatDateTimeCompact(customer.lastBookingAt) : "Aucun"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-ink)]">Total réservations</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{customer.totalBookings}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-5 sm:p-6">
              <SectionHeading
                eyebrow="Avis"
                title="Modération"
                description="Les avis venant du site restent en attente jusqu’à validation explicite."
              />
              <div className="mt-8 space-y-4">
                {dashboard.reviews.map((review) => (
                  <article key={review.id} className="rounded-[24px] border border-[var(--line)] bg-white/70 p-4">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {review.customer?.name ?? "Cliente"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted-ink)]">
                      {review.customer?.email ?? "Pas d’e-mail"}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted-ink)]">{review.text}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <form action={moderateReviewAction}>
                        <input type="hidden" name="reviewId" value={review.id} />
                        <input type="hidden" name="status" value="published" />
                        <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--surface)]">
                          Publier
                        </button>
                      </form>
                      <form action={moderateReviewAction}>
                        <input type="hidden" name="reviewId" value={review.id} />
                        <input type="hidden" name="status" value="rejected" />
                        <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)]">
                          Rejeter
                        </button>
                      </form>
                      <span className="inline-flex min-h-11 items-center rounded-full bg-[rgba(181,138,71,0.12)] px-4 text-xs uppercase tracking-[0.24em] text-[var(--gold-deep)]">
                        {review.status}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-5 sm:p-6">
              <SectionHeading
                eyebrow="Réglages"
                title="Coordonnées et texte d’annonce"
                description="Le bloc le plus visible sur le site public est éditable ici."
              />

              <form action={upsertBusinessSettingsAction} className="mt-8 grid gap-3">
                <textarea
                  name="announcement"
                  defaultValue={dashboard.businessSettings.announcement}
                  className="min-h-24 rounded-[24px] border border-[var(--line)] bg-white px-4 py-3 text-sm"
                />
                <div className="grid gap-3 md:grid-cols-3">
                  <input name="phone" defaultValue={dashboard.businessSettings.phone} className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm" />
                  <input name="whatsapp" defaultValue={dashboard.businessSettings.whatsapp} className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm" />
                  <input name="address" defaultValue={dashboard.businessSettings.address} className="min-h-11 rounded-full border border-[var(--line)] bg-white px-4 text-sm" />
                </div>
                <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--surface)]">
                  Enregistrer les réglages
                </button>
              </form>
            </div>

            <div className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-5 sm:p-6">
              <SectionHeading
                eyebrow="Exports"
                title="CSV réservations et clientes"
                description="Le salon peut extraire les données clés pour un suivi externe."
              />
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/api/exports/bookings" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--gold)] px-4 text-sm font-semibold text-white">
                  Export réservations
                </a>
                <a href="/api/exports/clients" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)]">
                  Export clientes
                </a>
              </div>
            </div>

            <div className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-5 sm:p-6">
              <SectionHeading
                eyebrow="Derniers e-mails"
                title="Journal de notifications"
                description="Les confirmations, rappels, annulations, reports et demandes d’avis sont archivés ici."
              />
              <div className="mt-8 space-y-3">
                {dashboard.notificationLogs.map((log) => (
                  <div key={log.id} className="rounded-[24px] border border-[var(--line)] bg-white/70 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em] text-[var(--muted-ink)]">
                      <span>{log.type}</span>
                      <span>•</span>
                      <span>{log.status}</span>
                      <span>•</span>
                      <span>{log.provider}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{log.recipient}</p>
                    <p className="mt-1 text-sm text-[var(--muted-ink)]">{log.subject}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted-ink)]">{log.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
