"use client";

import { CalendarDays, Clock3, LoaderCircle, Mail, Sparkles, UserRound } from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useEffectEvent, useState } from "react";
import { formatCurrencyDzd, formatDuration } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AvailabilitySlot, BusinessSettings, ServiceCategory, ServiceItem } from "@/lib/types";

interface BookingWizardProps {
  categories: ServiceCategory[];
  services: ServiceItem[];
  availableDates: Array<{
    key: string;
    label: string;
  }>;
  settings: BusinessSettings;
}

interface BookingSuccessState {
  bookingId: string;
  customerName: string;
  startsAt: string;
  totalPriceDzd: number;
  totalDurationMinutes: number;
  summary: string;
  notificationStatus: string;
  accountLinkStatus: string;
  accountLinkMessage?: string | null;
}

export function BookingWizard({
  categories,
  services,
  availableDates,
  settings,
}: BookingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(availableDates[0]?.key ?? "");
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<BookingSuccessState | null>(null);
  const [contact, setContact] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
    createAccount: false,
  });

  const deferredDate = useDeferredValue(selectedDate);
  const deferredSelection = useDeferredValue(selectedServiceIds.join(","));

  const selectedServices = services.filter((service) => selectedServiceIds.includes(service.id));
  const totals = selectedServices.reduce(
    (accumulator, service) => ({
      totalPriceDzd: accumulator.totalPriceDzd + service.priceDzd,
      totalDurationMinutes: accumulator.totalDurationMinutes + service.durationMinutes,
    }),
    { totalPriceDzd: 0, totalDurationMinutes: 0 },
  );

  const fetchAvailability = useEffectEvent(async () => {
    if (!deferredDate || !deferredSelection) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);
    setError(null);

    try {
      const query = new URLSearchParams({
        date: deferredDate,
        serviceIds: deferredSelection,
      });
      const response = await fetch(`/api/availability?${query.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Impossible de charger les créneaux.");
      }

      setSlots(payload.slots);
      setSelectedSlot((current) =>
        current && payload.slots.some((slot: AvailabilitySlot) => slot.startsAt === current.startsAt)
          ? current
          : null,
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Impossible de charger les créneaux.";
      setError(message);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  });

  useEffect(() => {
    void fetchAvailability();
  }, [deferredDate, deferredSelection]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel("glam-lyn-booking-events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "booking_events",
        },
        () => {
          void fetchAvailability();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  function toggleService(serviceId: string) {
    startTransition(() => {
      setSelectedSlot(null);
      setCurrentStep(1);
      setSelectedServiceIds((current) =>
        current.includes(serviceId)
          ? current.filter((entry) => entry !== serviceId)
          : [...current, serviceId],
      );
    });
  }

  function handleContactChange(field: keyof typeof contact, value: string | boolean) {
    setContact((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit() {
    if (!selectedServiceIds.length) {
      setError("Choisissez au moins une prestation.");
      setCurrentStep(1);
      return;
    }

    if (!selectedSlot) {
      setError("Choisissez un créneau disponible.");
      setCurrentStep(2);
      return;
    }

    if (!contact.name || !contact.phone) {
      setError("Le nom et le téléphone sont obligatoires.");
      setCurrentStep(3);
      return;
    }

    if (contact.createAccount && !contact.email) {
      setError("L’e-mail est requis pour créer un compte.");
      setCurrentStep(3);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const date = selectedSlot.startsAt.slice(0, 10);
      const time = selectedSlot.startsAt.slice(11, 16);

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceIds: selectedServiceIds,
          date,
          time,
          name: contact.name,
          phone: contact.phone,
          email: contact.email || undefined,
          notes: contact.notes || undefined,
          createAccount: contact.createAccount,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "La réservation a échoué.");
      }

      setSuccess(payload);
      setCurrentStep(4);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "La réservation a échoué.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const legacyNotificationText =
    success?.notificationStatus === "sent"
      ? "Une confirmation a été envoyée par e-mail."
      : contact.createAccount
        ? "Votre réservation est enregistrée et votre lien de connexion a été envoyé par e-mail."
        : "Votre réservation est enregistrée. Aucun e-mail automatique n’est lié à ce rendez-vous invité.";

  const notificationText = success
    ? [
        success.notificationStatus === "sent"
          ? "Une confirmation a Ã©tÃ© envoyÃ©e par e-mail."
          : success.notificationStatus === "failed"
            ? "La rÃ©servation est enregistrÃ©e, mais l'e-mail de confirmation n'a pas pu Ãªtre envoyÃ©."
            : contact.createAccount
              ? "La rÃ©servation est enregistrÃ©e."
              : "Votre rÃ©servation est enregistrÃ©e. Aucun e-mail automatique nâ€™est liÃ© Ã  ce rendez-vous invitÃ©.",
        contact.createAccount
          ? success.accountLinkStatus === "sent"
            ? "Votre lien de connexion a Ã©tÃ© envoyÃ© par e-mail."
            : success.accountLinkStatus === "failed"
              ? "Le lien de connexion n'a pas pu Ãªtre envoyÃ© pour le moment. RÃ©essayez depuis la page de connexion."
              : ""
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    : legacyNotificationText;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-6">
        <div className="rounded-[28px] border border-[var(--line)] bg-[rgba(255,252,248,0.84)] p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-[var(--muted-ink)]">
            <span className={currentStep >= 1 ? "text-[var(--gold-deep)]" : ""}>1. Services</span>
            <span className={currentStep >= 2 ? "text-[var(--gold-deep)]" : ""}>2. Créneau</span>
            <span className={currentStep >= 3 ? "text-[var(--gold-deep)]" : ""}>3. Coordonnées</span>
            <span className={currentStep >= 4 ? "text-[var(--gold-deep)]" : ""}>4. Confirmation</span>
          </div>
        </div>

        <article className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[var(--gold-deep)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Choisissez vos prestations</p>
              <p className="text-sm text-[var(--muted-ink)]">
                Le temps et le prix s’additionnent automatiquement.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {categories.map((category) => (
              <div key={category.id} className="space-y-3">
                <div className="border-b border-[var(--line)] pb-3">
                  <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
                    {category.label}
                  </h2>
                  <p className="text-sm leading-6 text-[var(--muted-ink)]">
                    {category.description}
                  </p>
                </div>

                <div className="space-y-3">
                  {services
                    .filter((service) => service.categoryId === category.id)
                    .map((service) => {
                      const isSelected = selectedServiceIds.includes(service.id);
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleService(service.id)}
                          className={`w-full rounded-[26px] border p-4 text-left transition ${
                            isSelected
                              ? "border-[var(--gold)] bg-[rgba(181,138,71,0.08)]"
                              : "border-[var(--line)] bg-white/70"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                              <p className="text-base font-semibold text-[var(--ink)]">
                                {service.name}
                              </p>
                              <p className="text-sm leading-6 text-[var(--muted-ink)]">
                                {service.description}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold text-[var(--gold-deep)]">
                                {formatCurrencyDzd(service.priceDzd)}
                              </p>
                              <p className="text-xs text-[var(--muted-ink)]">
                                {formatDuration(service.durationMinutes)}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-[var(--gold-deep)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Choisissez un créneau</p>
              <p className="text-sm text-[var(--muted-ink)]">
                Disponibilités recalculées dès qu’une réservation est créée, annulée ou reportée.
              </p>
            </div>
          </div>

          <div className="mb-5 flex gap-3 overflow-x-auto pb-2">
            {availableDates.map((date) => (
              <button
                key={date.key}
                type="button"
                onClick={() => {
                  setSelectedDate(date.key);
                  setCurrentStep(2);
                }}
                className={`min-h-12 shrink-0 rounded-full border px-4 text-sm ${
                  selectedDate === date.key
                    ? "border-[var(--gold)] bg-[var(--gold)] text-white"
                    : "border-[var(--line)] bg-white/70 text-[var(--ink)]"
                }`}
              >
                {date.label}
              </button>
            ))}
          </div>

          {loadingSlots ? (
            <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-[var(--muted-ink)]">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Calcul des créneaux...
            </div>
          ) : slots.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {slots.map((slot) => (
                <button
                  key={slot.startsAt}
                  type="button"
                  onClick={() => {
                    setSelectedSlot(slot);
                    setCurrentStep(3);
                  }}
                  className={`min-h-14 rounded-[22px] border px-4 py-3 text-left transition ${
                    selectedSlot?.startsAt === slot.startsAt
                      ? "border-[var(--gold)] bg-[rgba(181,138,71,0.08)]"
                      : "border-[var(--line)] bg-white/70"
                  }`}
                >
                  <p className="text-sm font-semibold text-[var(--ink)]">{slot.timeLabel}</p>
                  <p className="text-xs text-[var(--muted-ink)]">{slot.dateLabel}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white/40 p-5 text-sm leading-7 text-[var(--muted-ink)]">
              {selectedServiceIds.length
                ? "Aucun créneau disponible pour cette sélection. Essayez une autre date."
                : "Choisissez d’abord vos prestations pour afficher les disponibilités."}
            </div>
          )}
        </article>

        <article className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,252,248,0.88)] p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <UserRound className="h-5 w-5 text-[var(--gold-deep)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Vos coordonnées</p>
              <p className="text-sm text-[var(--muted-ink)]">
                Nom et téléphone sont requis. L’e-mail devient nécessaire si vous créez un compte.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-[var(--ink)]">
              <span>Nom complet</span>
              <input
                value={contact.name}
                onChange={(event) => handleContactChange("name", event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 outline-none transition focus:border-[var(--gold)]"
                placeholder="Ex: Nadia K."
              />
            </label>

            <label className="space-y-2 text-sm text-[var(--ink)]">
              <span>Téléphone</span>
              <input
                value={contact.phone}
                onChange={(event) => handleContactChange("phone", event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 outline-none transition focus:border-[var(--gold)]"
                placeholder="+213..."
              />
            </label>

            <label className="space-y-2 text-sm text-[var(--ink)] sm:col-span-2">
              <span>E-mail</span>
              <input
                type="email"
                value={contact.email}
                onChange={(event) => handleContactChange("email", event.target.value)}
                className="min-h-12 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 outline-none transition focus:border-[var(--gold)]"
                placeholder="vous@exemple.com"
              />
            </label>

            <label className="space-y-2 text-sm text-[var(--ink)] sm:col-span-2">
              <span>Note pour le salon (facultatif)</span>
              <textarea
                value={contact.notes}
                onChange={(event) => handleContactChange("notes", event.target.value)}
                className="min-h-28 w-full rounded-[24px] border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--gold)]"
                placeholder="Précision utile pour la réservation..."
              />
            </label>
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-[24px] border border-[var(--line)] bg-white/60 p-4">
            <input
              type="checkbox"
              checked={contact.createAccount}
              onChange={(event) =>
                handleContactChange("createAccount", event.target.checked)
              }
              className="mt-1 h-4 w-4 accent-[var(--gold)]"
            />
            <span className="text-sm leading-6 text-[var(--muted-ink)]">
              <strong className="text-[var(--ink)]">
                Créez votre compte et gagnez 1 point maintenant
              </strong>
              , puis 1 point à chaque réservation. Un lien magique vous sera envoyé par e-mail.
            </span>
          </label>

          {error ? (
            <p className="mt-4 rounded-2xl bg-[#fff1eb] px-4 py-3 text-sm text-[#8d3f21]">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--surface)] disabled:opacity-60"
          >
            {submitting ? "Confirmation en cours..." : "Confirmer ma réservation"}
          </button>
        </article>

        {success ? (
          <article className="rounded-[34px] border border-[rgba(181,138,71,0.26)] bg-[rgba(255,252,248,0.92)] p-4 sm:p-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.34em] text-[var(--gold-deep)]">
                Confirmation
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-4xl leading-none text-[var(--ink)]">
                Réservation enregistrée.
              </h2>
              <p className="text-sm leading-7 text-[var(--muted-ink)]">
                {success.customerName}, votre réservation est confirmée pour {success.summary}.
                <br />
                {notificationText}
              </p>
            </div>
          </article>
        ) : null}
      </section>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[34px] border border-[var(--line)] bg-[rgba(36,26,19,0.94)] p-5 text-[var(--surface)]">
          <p className="text-xs uppercase tracking-[0.34em] text-[rgba(255,244,220,0.72)]">
            Résumé mobile
          </p>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Prestations</span>
              <span>{selectedServices.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Durée totale</span>
              <span>{formatDuration(totals.totalDurationMinutes)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Prix total</span>
              <span>{formatCurrencyDzd(totals.totalPriceDzd)}</span>
            </div>
            <div className="flex items-start justify-between gap-3 border-t border-white/10 pt-4 text-sm">
              <span className="flex items-center gap-2 text-[rgba(255,244,220,0.74)]">
                <Clock3 className="h-4 w-4" />
                Créneau
              </span>
              <span className="text-right">
                {selectedSlot ? `${selectedSlot.dateLabel} · ${selectedSlot.timeLabel}` : "À choisir"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3 border-t border-white/10 pt-4 text-sm">
              <span className="flex items-center gap-2 text-[rgba(255,244,220,0.74)]">
                <Mail className="h-4 w-4" />
                Notification
              </span>
              <span className="text-right">
                {contact.createAccount ? "E-mail automatique" : "Aucune en invité"}
              </span>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-sm leading-7 text-[rgba(255,244,220,0.8)]">
              Réservation possible jusqu’à {settings.bookingLeadHours}h avant le rendez-vous.
              Modification autonome jusqu’à {settings.selfServiceChangeHours}h avant pour les
              clientes avec compte.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
