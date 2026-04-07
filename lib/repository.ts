import { addDays, addHours, endOfDay, isBefore, startOfDay, subHours } from "date-fns";
import { revalidatePath } from "next/cache";
import { getAdminSession, getCustomerSession, verifyPassword } from "@/lib/auth";
import { sendCustomerMagicLink } from "@/lib/customer-auth";
import { computeSlotsForDate, getDateKey, makeAlgiersDate, nextDays } from "@/lib/date";
import { formatCurrencyDzd, formatLongDate, formatTime } from "@/lib/format";
import { logEmail } from "@/lib/notifications";
import { getAppUrl } from "@/lib/supabase/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  AdminUser,
  Booking,
  BusinessSettings,
  CreateBookingInput,
  CustomerProfile,
  DashboardMetrics,
  GoogleReviewSnapshot,
  InstagramReelItem,
  MediaAsset,
  NotificationLog,
  NotificationType,
  ServiceCategory,
  ServiceItem,
  SiteReview,
} from "@/lib/types";
import { generateId, normalizePhone } from "@/lib/utils";

const BOOKING_SELECT = `
  id,
  customer_id,
  starts_at,
  ends_at,
  total_price_dzd,
  total_duration_minutes,
  status,
  source,
  notes,
  created_at,
  updated_at,
  customer:customer_profiles (
    id,
    auth_user_id,
    name,
    phone,
    email,
    points,
    has_account,
    created_at,
    updated_at
  ),
  booking_services (
    service_id,
    services (
      id,
      category_id,
      name,
      description,
      price_dzd,
      duration_minutes,
      active,
      featured,
      display_order
    )
  )
`;

function ensureData<T>(value: T | null, message: string) {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

function mapService(row: Record<string, unknown>): ServiceItem {
  return {
    id: String(row.id),
    categoryId: String(row.category_id) as ServiceItem["categoryId"],
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    priceDzd: Number(row.price_dzd ?? 0),
    durationMinutes: Number(row.duration_minutes ?? 0),
    active: Boolean(row.active),
    featured: Boolean(row.featured),
    order: Number(row.display_order ?? 1),
  };
}

function mapCategory(row: Record<string, unknown>): ServiceCategory {
  return {
    id: String(row.id) as ServiceCategory["id"],
    label: String(row.label ?? ""),
    description: String(row.description ?? ""),
  };
}

function mapBusinessSettings(row: Record<string, unknown>): BusinessSettings {
  return {
    salonName: String(row.salon_name ?? "Glam Lyn"),
    tagline: String(row.tagline ?? ""),
    heroEyebrow: String(row.hero_eyebrow ?? ""),
    heroTitle: String(row.hero_title ?? ""),
    heroDescription: String(row.hero_description ?? ""),
    announcement: String(row.announcement ?? ""),
    phone: String(row.phone ?? ""),
    whatsapp: String(row.whatsapp ?? ""),
    address: String(row.address ?? ""),
    city: String(row.city ?? ""),
    timezone: String(row.timezone ?? "Africa/Algiers"),
    bookingLeadHours: Number(row.booking_lead_hours ?? 2),
    selfServiceChangeHours: Number(row.self_service_change_hours ?? 12),
    openingHours: Array.isArray(row.opening_hours)
      ? (row.opening_hours as BusinessSettings["openingHours"])
      : [],
    closedDates: Array.isArray(row.closed_dates) ? (row.closed_dates as string[]) : [],
    loyaltyCopy: String(row.loyalty_copy ?? ""),
    instagramHandle: String(row.instagram_handle ?? ""),
    googlePlaceLabel: String(row.google_place_label ?? ""),
  };
}

function mapMediaAsset(row: Record<string, unknown>): MediaAsset {
  return {
    id: String(row.id),
    label: String(row.label ?? ""),
    alt: String(row.alt ?? ""),
    section: String(row.section) as MediaAsset["section"],
    src: String(row.src ?? ""),
    kind: String(row.kind) as MediaAsset["kind"],
    order: Number(row.display_order ?? 1),
    uploadedAt: String(row.uploaded_at ?? new Date().toISOString()),
    mimeType: row.mime_type ? String(row.mime_type) : undefined,
    storagePath: row.storage_path ? String(row.storage_path) : undefined,
  };
}

function mapCustomer(row: Record<string, unknown>): CustomerProfile {
  return {
    id: String(row.id),
    authUserId: row.auth_user_id ? String(row.auth_user_id) : null,
    name: String(row.name ?? "Cliente Glam Lyn"),
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    points: Number(row.points ?? 0),
    hasAccount: Boolean(row.has_account),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapBooking(row: Record<string, unknown>): Booking {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    serviceIds: Array.isArray(row.booking_services)
      ? (row.booking_services as Array<Record<string, unknown>>).map((entry) =>
          String(entry.service_id),
        )
      : [],
    totalPriceDzd: Number(row.total_price_dzd ?? 0),
    totalDurationMinutes: Number(row.total_duration_minutes ?? 0),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    status: String(row.status) as Booking["status"],
    source: String(row.source) as Booking["source"],
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapSiteReview(row: Record<string, unknown>): SiteReview {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    bookingId: String(row.booking_id),
    rating: Number(row.rating ?? 0),
    text: String(row.text ?? ""),
    status: String(row.status) as SiteReview["status"],
    createdAt: String(row.created_at),
  };
}

function mapGoogleReview(row: Record<string, unknown>): GoogleReviewSnapshot {
  return {
    id: String(row.id),
    authorName: String(row.author_name ?? ""),
    rating: Number(row.rating ?? 0),
    text: String(row.text ?? ""),
    relativeTimeDescription: String(row.relative_time_description ?? ""),
    createdAt: String(row.created_at),
  };
}

function mapReel(row: Record<string, unknown>): InstagramReelItem {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    caption: String(row.caption ?? ""),
    coverAssetId: row.cover_asset_id ? String(row.cover_asset_id) : undefined,
    externalCoverUrl: row.external_cover_url ? String(row.external_cover_url) : null,
    reelUrl: String(row.reel_url ?? ""),
    published: Boolean(row.published),
    order: Number(row.display_order ?? 1),
  };
}

function mapNotificationLog(row: Record<string, unknown>): NotificationLog {
  return {
    id: String(row.id),
    type: String(row.type) as NotificationLog["type"],
    channel: "email",
    recipient: String(row.recipient ?? ""),
    subject: String(row.subject ?? ""),
    message: String(row.message ?? ""),
    status: String(row.status) as NotificationLog["status"],
    provider: String(row.provider) as NotificationLog["provider"],
    createdAt: String(row.created_at),
    bookingId: row.booking_id ? String(row.booking_id) : null,
    customerId: row.customer_id ? String(row.customer_id) : null,
  };
}

function mapAdmin(row: Record<string, unknown>): AdminUser {
  return {
    id: String(row.id),
    username: String(row.username),
    passwordHash: String(row.password_hash),
    displayName: String(row.display_name),
    active: Boolean(row.active),
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
  };
}

function mapBookingWithRelations(row: Record<string, unknown>) {
  const booking = mapBooking(row);
  const customer = row.customer ? mapCustomer(row.customer as Record<string, unknown>) : undefined;
  const services = Array.isArray(row.booking_services)
    ? (row.booking_services as Array<Record<string, unknown>>)
        .map((entry) => entry.services as Record<string, unknown> | null)
        .filter(Boolean)
        .map((service) => mapService(service as Record<string, unknown>))
    : [];

  return {
    ...booking,
    customer,
    services,
  };
}

function summarizeSelection(services: ServiceItem[]) {
  return services.reduce(
    (accumulator, service) => ({
      totalPriceDzd: accumulator.totalPriceDzd + service.priceDzd,
      totalDurationMinutes: accumulator.totalDurationMinutes + service.durationMinutes,
    }),
    { totalPriceDzd: 0, totalDurationMinutes: 0 },
  );
}

function servicesSummary(services: ServiceItem[]) {
  return services.map((service) => service.name).join(", ");
}

function buildEmailCopy(input: {
  type: NotificationType;
  booking: Booking;
  services: ServiceItem[];
  settings: BusinessSettings;
}) {
  const serviceLabel = servicesSummary(input.services);
  const bookingUrl = `${getAppUrl()}/compte`;

  if (input.type === "booking_confirmation") {
    return {
      subject: `Glam Lyn • Réservation confirmée`,
      message: `
        Bonjour,
        <br /><br />
        Votre réservation pour ${serviceLabel} est confirmée le ${formatLongDate(
          input.booking.startsAt,
        )} à ${formatTime(input.booking.startsAt)}.
        <br />
        Total prévu : <strong>${formatCurrencyDzd(input.booking.totalPriceDzd)}</strong>.
        <br /><br />
        Vous pouvez retrouver votre rendez-vous dans votre espace cliente :
        <br />
        <a href="${bookingUrl}">${bookingUrl}</a>
      `,
    };
  }

  if (input.type === "booking_reminder") {
    return {
      subject: `Glam Lyn • Rappel de rendez-vous`,
      message: `
        Bonjour,
        <br /><br />
        Petit rappel : votre rendez-vous pour ${serviceLabel} est prévu le ${formatLongDate(
          input.booking.startsAt,
        )} à ${formatTime(input.booking.startsAt)}.
        <br /><br />
        À bientôt chez Glam Lyn.
      `,
    };
  }

  if (input.type === "booking_cancelled") {
    return {
      subject: `Glam Lyn • Réservation annulée`,
      message: `
        Bonjour,
        <br /><br />
        Votre réservation du ${formatLongDate(input.booking.startsAt)} a été annulée.
        <br />
        Contactez le salon si vous souhaitez reprogrammer un nouveau créneau.
      `,
    };
  }

  if (input.type === "booking_rescheduled") {
    return {
      subject: `Glam Lyn • Réservation reprogrammée`,
      message: `
        Bonjour,
        <br /><br />
        Votre réservation a été reportée au ${formatLongDate(
          input.booking.startsAt,
        )} à ${formatTime(input.booking.startsAt)}.
        <br /><br />
        Retrouvez le détail dans votre espace cliente :
        <br />
        <a href="${bookingUrl}">${bookingUrl}</a>
      `,
    };
  }

  return {
    subject: `Glam Lyn • Votre avis nous aide`,
    message: `
      Bonjour,
      <br /><br />
      Merci pour votre visite chez Glam Lyn.
      <br />
      Vous pouvez laisser votre avis directement depuis votre espace cliente :
      <br />
      <a href="${bookingUrl}">${bookingUrl}</a>
    `,
  };
}

async function getBusinessSettingsRecord() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("business_settings")
    .select("*")
    .eq("id", true)
    .single();

  if (error) {
    throw new Error(`Lecture des réglages impossible: ${error.message}`);
  }

  return data as Record<string, unknown>;
}

async function getServicesByIds(serviceIds: string[]) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .in("id", serviceIds)
    .eq("active", true);

  if (error) {
    throw new Error(`Lecture des services impossible: ${error.message}`);
  }

  const mapped = ((data ?? []) as Array<Record<string, unknown>>).map(mapService);
  return serviceIds
    .map((serviceId) => mapped.find((service) => service.id === serviceId))
    .filter(Boolean) as ServiceItem[];
}

async function getBookingRow(bookingId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", bookingId)
    .single();

  if (error) {
    throw new Error(`Lecture de la réservation impossible: ${error.message}`);
  }

  return mapBookingWithRelations(data as Record<string, unknown>);
}

async function sendBookingEmailIfPossible(input: {
  type: NotificationType;
  booking: Booking;
  services: ServiceItem[];
  customer: CustomerProfile;
  settings: BusinessSettings;
}) {
  if (!input.customer.email) {
    return { status: "skipped" as const };
  }

  const copy = buildEmailCopy(input);
  const log = await logEmail({
    type: input.type,
    recipient: input.customer.email,
    subject: copy.subject,
    message: copy.message,
    bookingId: input.booking.id,
    customerId: input.customer.id,
  });

  return log;
}

function getDashboardMetrics(input: {
  bookings: Booking[];
  customers: CustomerProfile[];
  reviews: SiteReview[];
  services: ServiceItem[];
}) {
  const now = new Date();
  const weekAhead = addDays(now, 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const upcoming = input.bookings.filter(
    (booking) =>
      booking.status === "confirmed" &&
      new Date(booking.startsAt) >= now &&
      new Date(booking.startsAt) <= weekAhead,
  );
  const cancelled = input.bookings.filter(
    (booking) =>
      booking.status === "cancelled" &&
      new Date(booking.updatedAt) >= now &&
      new Date(booking.updatedAt) <= weekAhead,
  );
  const openingWindows = 6;
  const occupancyRate = openingWindows
    ? Math.min(
        100,
        Math.round(
          (upcoming.reduce((total, booking) => total + booking.totalDurationMinutes, 0) /
            (openingWindows * 8 * 60)) *
            100,
        ),
      )
    : 0;

  const newAccountsThisMonth = input.customers.filter(
    (customer) => customer.hasAccount && new Date(customer.createdAt) >= monthStart,
  ).length;

  const topServicesMap = new Map<string, { id: string; name: string; count: number }>();
  input.bookings
    .filter((booking) => booking.status !== "cancelled")
    .forEach((booking) => {
      booking.serviceIds.forEach((serviceId) => {
        const service = input.services.find((entry) => entry.id === serviceId);
        if (!service) {
          return;
        }

        const current = topServicesMap.get(service.id) ?? {
          id: service.id,
          name: service.name,
          count: 0,
        };
        current.count += 1;
        topServicesMap.set(service.id, current);
      });
    });

  const metrics: DashboardMetrics = {
    bookingsThisWeek: upcoming.length,
    cancellationsThisWeek: cancelled.length,
    occupancyRate,
    newAccountsThisMonth,
    pendingReviews: input.reviews.filter((review) => review.status === "pending").length,
    topServices: [...topServicesMap.values()]
      .sort((left, right) => right.count - left.count)
      .slice(0, 4),
  };

  return metrics;
}

export async function getPublicData() {
  const supabase = getSupabaseAdmin();
  const [settingsRow, categoriesResult, servicesResult, mediaResult, reviewsResult, googleResult, reelsResult] =
    await Promise.all([
      getBusinessSettingsRecord(),
      supabase.from("service_categories").select("*").order("label"),
      supabase.from("services").select("*").eq("active", true).order("display_order"),
      supabase.from("media_assets").select("*").order("display_order"),
      supabase
        .from("site_reviews")
        .select(
          "id, customer_id, booking_id, rating, text, status, created_at, customer:customer_profiles(id, name)",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false }),
      supabase
        .from("google_review_snapshots")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("instagram_reels")
        .select("*")
        .eq("published", true)
        .order("display_order"),
    ]);

  if (categoriesResult.error) {
    throw new Error(`Lecture des catégories impossible: ${categoriesResult.error.message}`);
  }
  if (servicesResult.error) {
    throw new Error(`Lecture des services impossible: ${servicesResult.error.message}`);
  }
  if (mediaResult.error) {
    throw new Error(`Lecture des médias impossible: ${mediaResult.error.message}`);
  }
  if (reviewsResult.error) {
    throw new Error(`Lecture des avis impossible: ${reviewsResult.error.message}`);
  }
  if (googleResult.error) {
    throw new Error(`Lecture des avis Google impossible: ${googleResult.error.message}`);
  }
  if (reelsResult.error) {
    throw new Error(`Lecture des reels impossible: ${reelsResult.error.message}`);
  }

  return {
    businessSettings: mapBusinessSettings(settingsRow),
    categories: ((categoriesResult.data ?? []) as Array<Record<string, unknown>>).map(mapCategory),
    services: ((servicesResult.data ?? []) as Array<Record<string, unknown>>).map(mapService),
    heroMedia: ((mediaResult.data ?? []) as Array<Record<string, unknown>>)
      .map(mapMediaAsset)
      .filter((asset) => asset.section === "hero"),
    galleryMedia: ((mediaResult.data ?? []) as Array<Record<string, unknown>>)
      .map(mapMediaAsset)
      .filter((asset) => asset.section === "gallery"),
    siteReviews: ((reviewsResult.data ?? []) as Array<Record<string, unknown>>)
      .slice(0, 4)
      .map((row) => ({
        ...mapSiteReview(row),
        customer: row.customer ? { name: String((row.customer as Record<string, unknown>).name) } : null,
      })),
    googleReviews: ((googleResult.data ?? []) as Array<Record<string, unknown>>)
      .slice(0, 3)
      .map(mapGoogleReview),
    reels: ((reelsResult.data ?? []) as Array<Record<string, unknown>>).map(mapReel),
  };
}

export async function getBookingBootstrap() {
  const supabase = getSupabaseAdmin();
  const [settingsRow, categoriesResult, servicesResult] = await Promise.all([
    getBusinessSettingsRecord(),
    supabase.from("service_categories").select("*").order("label"),
    supabase.from("services").select("*").eq("active", true).order("display_order"),
  ]);

  if (categoriesResult.error) {
    throw new Error(`Lecture des catégories impossible: ${categoriesResult.error.message}`);
  }
  if (servicesResult.error) {
    throw new Error(`Lecture des services impossible: ${servicesResult.error.message}`);
  }

  const settings = mapBusinessSettings(settingsRow);
  const availableDates = nextDays(6).map((date) => ({
    key: getDateKey(date),
    label: new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: settings.timezone,
    }).format(date),
  }));

  return {
    settings,
    categories: ((categoriesResult.data ?? []) as Array<Record<string, unknown>>).map(mapCategory),
    services: ((servicesResult.data ?? []) as Array<Record<string, unknown>>).map(mapService),
    availableDates,
  };
}

export async function getAvailability(date: string, serviceIds: string[]) {
  const settings = mapBusinessSettings(await getBusinessSettingsRecord());
  const services = await getServicesByIds(serviceIds);
  if (!services.length) {
    return { slots: [], totalDurationMinutes: 0, totalPriceDzd: 0 };
  }

  const totals = summarizeSelection(services);
  const dayStart = startOfDay(makeAlgiersDate(date, "00:00"));
  const dayEnd = endOfDay(makeAlgiersDate(date, "23:59"));
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, customer_id, starts_at, ends_at, total_price_dzd, total_duration_minutes, status, source, notes, created_at, updated_at")
    .eq("status", "confirmed")
    .lt("starts_at", dayEnd.toISOString())
    .gt("ends_at", dayStart.toISOString());

  if (error) {
    throw new Error(`Lecture du planning impossible: ${error.message}`);
  }

  const bookings = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    customerId: String(row.customer_id),
    serviceIds: [],
    totalPriceDzd: Number(row.total_price_dzd ?? 0),
    totalDurationMinutes: Number(row.total_duration_minutes ?? 0),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    status: String(row.status) as Booking["status"],
    source: String(row.source) as Booking["source"],
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  return {
    slots: computeSlotsForDate({
      date: makeAlgiersDate(date, "09:00"),
      durationMinutes: totals.totalDurationMinutes,
      settings,
      bookings,
    }),
    ...totals,
  };
}

export async function createBooking(input: CreateBookingInput) {
  const settings = mapBusinessSettings(await getBusinessSettingsRecord());
  const services = await getServicesByIds(input.serviceIds);
  if (!services.length) {
    throw new Error("Aucun service sélectionné.");
  }

  const currentCustomer = await getCustomerSession();
  const start = makeAlgiersDate(input.date, input.time);
  const now = addHours(new Date(), settings.bookingLeadHours);
  if (isBefore(start, now)) {
    throw new Error("Ce créneau ne respecte plus le préavis minimum.");
  }

  const bookingEmail =
    currentCustomer?.email ??
    (input.createAccount && input.email ? input.email.trim().toLowerCase() : null);

  const supabase = getSupabaseAdmin();
  const { data: bookingId, error } = await supabase.rpc("create_booking_with_services", {
    p_customer_id: currentCustomer?.id ?? null,
    p_customer_name: input.name.trim(),
    p_customer_phone: normalizePhone(input.phone),
    p_customer_email: bookingEmail,
    p_service_ids: input.serviceIds,
    p_starts_at: start.toISOString(),
    p_notes: input.notes?.trim() || null,
    p_source: currentCustomer ? "account" : "guest",
  });

  if (error) {
    throw new Error(error.message);
  }

  const hydratedBooking = await getBookingRow(String(bookingId));
  const booking = hydratedBooking as Booking & {
    customer?: CustomerProfile;
    services: ServiceItem[];
  };
  const customer = ensureData(booking.customer, "Cliente introuvable après la réservation.");

  let notificationStatus: NotificationLog["status"] = "skipped";
  let accountLinkStatus: NotificationLog["status"] = "skipped";
  let accountLinkMessage: string | null = null;
  if (bookingEmail) {
    if (input.createAccount && !currentCustomer) {
      try {
        await sendCustomerMagicLink({
          email: bookingEmail,
          name: input.name,
        });
        accountLinkStatus = "sent";
      } catch (caughtError) {
        accountLinkStatus = "failed";
        accountLinkMessage =
          caughtError instanceof Error
            ? caughtError.message
            : "Le lien de connexion n'a pas pu être envoyé pour le moment.";
      }
    }

    const notification = await sendBookingEmailIfPossible({
      type: "booking_confirmation",
      booking,
      services: booking.services,
      customer: {
        ...customer,
        email: bookingEmail,
      },
      settings,
    });

    notificationStatus = notification.status;
  }

  revalidatePath("/");
  revalidatePath("/reservation");
  revalidatePath("/admin");
  revalidatePath("/compte");

  return {
    booking,
    customer: {
      ...customer,
      email: bookingEmail ?? customer.email,
    },
    summary: servicesSummary(booking.services),
    notification: {
      status: notificationStatus,
    },
    accountLink: {
      status: accountLinkStatus,
      message: accountLinkMessage,
    },
  };
}

export async function loginAdmin(input: { username: string; password: string }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("username", input.username)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Lecture admin impossible: ${error.message}`);
  }

  const admin = data ? mapAdmin(data as Record<string, unknown>) : null;
  if (!admin || !verifyPassword(input.password, admin.passwordHash)) {
    throw new Error("Identifiant admin ou mot de passe incorrect.");
  }

  await supabase
    .from("admin_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", admin.id);

  return { admin };
}

export async function getCustomerDashboard() {
  const customer = await getCustomerSession();
  if (!customer) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const [settingsRow, bookingsResult, reviewsResult] = await Promise.all([
    getBusinessSettingsRecord(),
    supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("customer_id", customer.id)
      .order("starts_at", { ascending: false }),
    supabase
      .from("site_reviews")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
  ]);

  if (bookingsResult.error) {
    throw new Error(`Lecture des réservations impossible: ${bookingsResult.error.message}`);
  }
  if (reviewsResult.error) {
    throw new Error(`Lecture des avis impossible: ${reviewsResult.error.message}`);
  }

  const settings = mapBusinessSettings(settingsRow);
  const bookings = ((bookingsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const booking = mapBookingWithRelations(row);
    return {
      ...booking,
      canSelfManage:
        booking.status === "confirmed" &&
        new Date(booking.startsAt) >
          addHours(new Date(), settings.selfServiceChangeHours),
    };
  });

  return {
    customer,
    bookings,
    reviews: ((reviewsResult.data ?? []) as Array<Record<string, unknown>>).map(mapSiteReview),
    settings,
  };
}

export async function getAdminDashboard() {
  const admin = await getAdminSession();
  if (!admin) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const [
    settingsRow,
    bookingsResult,
    servicesResult,
    mediaResult,
    reelsResult,
    reviewsResult,
    customersResult,
    notificationsResult,
  ] = await Promise.all([
    getBusinessSettingsRecord(),
    supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .order("starts_at", { ascending: true }),
    supabase.from("services").select("*").order("display_order"),
    supabase.from("media_assets").select("*").order("display_order"),
    supabase.from("instagram_reels").select("*").order("display_order"),
    supabase
      .from("site_reviews")
      .select("*, customer:customer_profiles(name, email)")
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_profiles")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase
      .from("notification_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (bookingsResult.error) {
    throw new Error(`Lecture des réservations impossible: ${bookingsResult.error.message}`);
  }
  if (servicesResult.error) {
    throw new Error(`Lecture des services impossible: ${servicesResult.error.message}`);
  }
  if (mediaResult.error) {
    throw new Error(`Lecture des médias impossible: ${mediaResult.error.message}`);
  }
  if (reelsResult.error) {
    throw new Error(`Lecture des reels impossible: ${reelsResult.error.message}`);
  }
  if (reviewsResult.error) {
    throw new Error(`Lecture des avis impossible: ${reviewsResult.error.message}`);
  }
  if (customersResult.error) {
    throw new Error(`Lecture des clientes impossible: ${customersResult.error.message}`);
  }
  if (notificationsResult.error) {
    throw new Error(`Lecture des notifications impossible: ${notificationsResult.error.message}`);
  }

  const bookings = ((bookingsResult.data ?? []) as Array<Record<string, unknown>>).map(
    mapBookingWithRelations,
  );
  const services = ((servicesResult.data ?? []) as Array<Record<string, unknown>>).map(mapService);
  const customers = ((customersResult.data ?? []) as Array<Record<string, unknown>>).map(mapCustomer);
  const reviews = ((reviewsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    ...mapSiteReview(row),
    customer: row.customer
      ? {
          name: String((row.customer as Record<string, unknown>).name ?? ""),
          email: (row.customer as Record<string, unknown>).email
            ? String((row.customer as Record<string, unknown>).email)
            : null,
        }
      : null,
  }));

  const lastBookingsByCustomer = new Map<string, string>();
  bookings.forEach((booking) => {
    const current = lastBookingsByCustomer.get(booking.customerId);
    if (!current || new Date(current) < new Date(booking.startsAt)) {
      lastBookingsByCustomer.set(booking.customerId, booking.startsAt);
    }
  });

  return {
    admin,
    metrics: getDashboardMetrics({
      bookings: bookings.map((booking) => booking as Booking),
      customers,
      reviews: reviews.map((review) => review as SiteReview),
      services,
    }),
    upcomingBookings: bookings
      .filter(
        (booking) => booking.status === "confirmed" && new Date(booking.startsAt) >= new Date(),
      )
      .slice(0, 8),
    services,
    mediaAssets: ((mediaResult.data ?? []) as Array<Record<string, unknown>>).map(mapMediaAsset),
    instagramReels: ((reelsResult.data ?? []) as Array<Record<string, unknown>>).map(mapReel),
    reviews,
    customers: customers.map((customer) => ({
      ...customer,
      lastBookingAt: lastBookingsByCustomer.get(customer.id) ?? null,
      totalBookings: bookings.filter((booking) => booking.customerId === customer.id).length,
    })),
    notificationLogs: ((notificationsResult.data ?? []) as Array<Record<string, unknown>>).map(
      mapNotificationLog,
    ),
    businessSettings: mapBusinessSettings(settingsRow),
  };
}

export async function submitSiteReview(input: {
  customerId: string;
  bookingId: string;
  rating: number;
  text: string;
}) {
  const supabase = getSupabaseAdmin();
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, customer_id, status")
    .eq("id", input.bookingId)
    .eq("customer_id", input.customerId)
    .maybeSingle();

  if (bookingError) {
    throw new Error(`Lecture de la réservation impossible: ${bookingError.message}`);
  }
  if (!booking || booking.status !== "completed") {
    throw new Error("Seules les prestations terminées peuvent recevoir un avis.");
  }

  const existing = await supabase
    .from("site_reviews")
    .select("id")
    .eq("booking_id", input.bookingId)
    .eq("customer_id", input.customerId)
    .maybeSingle();

  if (existing.error) {
    throw new Error(`Lecture des avis impossible: ${existing.error.message}`);
  }
  if (existing.data) {
    throw new Error("Un avis existe déjà pour cette prestation.");
  }

  const { error } = await supabase.from("site_reviews").insert({
    id: generateId("review"),
    customer_id: input.customerId,
    booking_id: input.bookingId,
    rating: input.rating,
    text: input.text.trim(),
    status: "pending",
  });

  if (error) {
    throw new Error(`Envoi de l'avis impossible: ${error.message}`);
  }

  revalidatePath("/avis");
  revalidatePath("/admin");
  revalidatePath("/compte");
}

export async function cancelBookingByCustomer(bookingId: string, customerId: string) {
  const bookingRow = await getBookingRow(bookingId);
  if (bookingRow.customerId !== customerId || bookingRow.status !== "confirmed") {
    throw new Error("Réservation introuvable.");
  }

  const settings = mapBusinessSettings(await getBusinessSettingsRecord());
  if (
    new Date(bookingRow.startsAt) <
    addHours(new Date(), settings.selfServiceChangeHours)
  ) {
    throw new Error("Le délai de modification en libre-service est dépassé.");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    throw new Error(`Annulation impossible: ${error.message}`);
  }

  if (bookingRow.customer?.email) {
    await sendBookingEmailIfPossible({
      type: "booking_cancelled",
      booking: {
        ...bookingRow,
        status: "cancelled",
      },
      services: bookingRow.services,
      customer: bookingRow.customer,
      settings,
    });
  }

  revalidatePath("/compte");
  revalidatePath("/admin");
  revalidatePath("/reservation");
}

export async function rescheduleBookingForCustomer(input: {
  bookingId: string;
  customerId: string;
  startsAt: string;
}) {
  const bookingRow = await getBookingRow(input.bookingId);
  if (bookingRow.customerId !== input.customerId || bookingRow.status !== "confirmed") {
    throw new Error("Réservation introuvable.");
  }

  const settings = mapBusinessSettings(await getBusinessSettingsRecord());
  const start = new Date(input.startsAt);
  if (start < addHours(new Date(), settings.selfServiceChangeHours)) {
    throw new Error("Le nouveau créneau ne respecte pas le délai minimum.");
  }

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + bookingRow.totalDurationMinutes);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("bookings")
    .update({
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.bookingId);

  if (error) {
    throw new Error(
      error.message.includes("bookings_no_overlap")
        ? "Le nouveau créneau n'est plus disponible."
        : `Report impossible: ${error.message}`,
    );
  }

  if (bookingRow.customer?.email) {
    await sendBookingEmailIfPossible({
      type: "booking_rescheduled",
      booking: {
        ...bookingRow,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      },
      services: bookingRow.services,
      customer: bookingRow.customer,
      settings,
    });
  }

  revalidatePath("/compte");
  revalidatePath("/admin");
  revalidatePath("/reservation");
}

export async function getSuggestedSlotsForBooking(booking: Booking) {
  const settings = mapBusinessSettings(await getBusinessSettingsRecord());
  const current = new Date(booking.startsAt);
  const dates = nextDays(8)
    .map((date) => getDateKey(date))
    .filter((dateKey) => dateKey !== getDateKey(current));

  const supabase = getSupabaseAdmin();
  const suggestions = await Promise.all(
    dates.map(async (dateKey) => {
      const dayStart = startOfDay(makeAlgiersDate(dateKey, "00:00"));
      const dayEnd = endOfDay(makeAlgiersDate(dateKey, "23:59"));
      const { data, error } = await supabase
        .from("bookings")
        .select("id, customer_id, starts_at, ends_at, total_price_dzd, total_duration_minutes, status, source, notes, created_at, updated_at")
        .eq("status", "confirmed")
        .lt("starts_at", dayEnd.toISOString())
        .gt("ends_at", dayStart.toISOString());

      if (error) {
        throw new Error(`Lecture du planning impossible: ${error.message}`);
      }

      const bookings = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        customerId: String(row.customer_id),
        serviceIds: [],
        totalPriceDzd: Number(row.total_price_dzd ?? 0),
        totalDurationMinutes: Number(row.total_duration_minutes ?? 0),
        startsAt: String(row.starts_at),
        endsAt: String(row.ends_at),
        status: String(row.status) as Booking["status"],
        source: String(row.source) as Booking["source"],
        notes: row.notes ? String(row.notes) : null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      }));

      return computeSlotsForDate({
        date: makeAlgiersDate(dateKey, "09:00"),
        durationMinutes: booking.totalDurationMinutes,
        settings,
        bookings,
      }).slice(0, 2);
    }),
  );

  return suggestions.flat().slice(0, 6);
}

export async function completeBookingByAdmin(bookingId: string) {
  const booking = await getBookingRow(bookingId);
  if (booking.status === "completed") {
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    throw new Error(`Clôture impossible: ${error.message}`);
  }

  if (booking.customer?.hasAccount) {
    const { error: pointsError } = await supabase.rpc("increment_customer_points", {
      p_customer_id: booking.customer.id,
      p_points: 1,
    });
    if (pointsError) {
      throw new Error(`Mise à jour des points impossible: ${pointsError.message}`);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/compte");
}

export async function cancelBookingByAdmin(bookingId: string) {
  const booking = await getBookingRow(bookingId);
  const settings = mapBusinessSettings(await getBusinessSettingsRecord());
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    throw new Error(`Annulation impossible: ${error.message}`);
  }

  if (booking.customer?.email) {
    await sendBookingEmailIfPossible({
      type: "booking_cancelled",
      booking: {
        ...booking,
        status: "cancelled",
      },
      services: booking.services,
      customer: booking.customer,
      settings,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/compte");
  revalidatePath("/reservation");
}

export async function rescheduleBookingByAdmin(input: {
  bookingId: string;
  date: string;
  time: string;
}) {
  const booking = await getBookingRow(input.bookingId);
  const settings = mapBusinessSettings(await getBusinessSettingsRecord());
  const start = makeAlgiersDate(input.date, input.time);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + booking.totalDurationMinutes);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("bookings")
    .update({
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.bookingId);

  if (error) {
    throw new Error(
      error.message.includes("bookings_no_overlap")
        ? "Ce nouveau créneau est déjà pris."
        : `Report impossible: ${error.message}`,
    );
  }

  if (booking.customer?.email) {
    await sendBookingEmailIfPossible({
      type: "booking_rescheduled",
      booking: {
        ...booking,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      },
      services: booking.services,
      customer: booking.customer,
      settings,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/compte");
  revalidatePath("/reservation");
}

export async function upsertService(
  input: Partial<ServiceItem> & {
    name: string;
    categoryId: ServiceItem["categoryId"];
  },
) {
  const supabase = getSupabaseAdmin();
  const payload = {
    id: input.id ?? generateId("service"),
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    category_id: input.categoryId,
    price_dzd: Number(input.priceDzd ?? 0),
    duration_minutes: Number(input.durationMinutes ?? 30),
    active: input.active ?? true,
    featured: input.featured ?? false,
    display_order: Number(input.order ?? 1),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("services").upsert(payload);
  if (error) {
    throw new Error(`Enregistrement du service impossible: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/reservation");
  revalidatePath("/admin");
}

export async function moderateReview(input: {
  reviewId: string;
  status: "published" | "rejected";
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("site_reviews")
    .update({ status: input.status })
    .eq("id", input.reviewId);

  if (error) {
    throw new Error(`Modération impossible: ${error.message}`);
  }

  revalidatePath("/avis");
  revalidatePath("/admin");
}

export async function upsertReel(input: {
  id?: string;
  title: string;
  caption: string;
  reelUrl: string;
  order: number;
  published: boolean;
  externalCoverUrl?: string;
}) {
  const supabase = getSupabaseAdmin();
  const payload = {
    id: input.id ?? generateId("reel"),
    title: input.title.trim(),
    caption: input.caption.trim(),
    reel_url: input.reelUrl.trim(),
    external_cover_url: input.externalCoverUrl?.trim() || null,
    display_order: Number(input.order),
    published: input.published,
  };

  const { error } = await supabase.from("instagram_reels").upsert(payload);
  if (error) {
    throw new Error(`Enregistrement du reel impossible: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function upsertBusinessSettings(input: {
  announcement: string;
  phone: string;
  whatsapp: string;
  address: string;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("business_settings")
    .update({
      announcement: input.announcement.trim(),
      phone: input.phone.trim(),
      whatsapp: input.whatsapp.trim(),
      address: input.address.trim(),
    })
    .eq("id", true);

  if (error) {
    throw new Error(`Mise à jour des réglages impossible: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/reservation");
  revalidatePath("/admin");
}

export async function addUploadedMedia(asset: MediaAsset) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("media_assets").insert({
    id: asset.id,
    label: asset.label,
    alt: asset.alt,
    section: asset.section,
    src: asset.src,
    kind: asset.kind,
    mime_type: asset.mimeType ?? null,
    storage_path: asset.storagePath ?? null,
    display_order: asset.order,
    uploaded_at: asset.uploadedAt,
  });

  if (error) {
    throw new Error(`Enregistrement du média impossible: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteMedia(mediaId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("media_assets").delete().eq("id", mediaId);
  if (error) {
    throw new Error(`Suppression du média impossible: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function exportBookingsCsv() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("bookings").select(BOOKING_SELECT);
  if (error) {
    throw new Error(`Export des réservations impossible: ${error.message}`);
  }

  const rows = [
    ["id", "cliente", "telephone", "email", "date", "heure", "statut", "prix_dzd", "duree_min", "services"],
    ...((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const booking = mapBookingWithRelations(row);
      const start = new Date(booking.startsAt);
      return [
        booking.id,
        booking.customer?.name ?? "",
        booking.customer?.phone ?? "",
        booking.customer?.email ?? "",
        getDateKey(start),
        formatTime(booking.startsAt),
        booking.status,
        booking.totalPriceDzd.toString(),
        booking.totalDurationMinutes.toString(),
        servicesSummary(booking.services),
      ];
    }),
  ];

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export async function exportCustomersCsv() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customer_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Export des clientes impossible: ${error.message}`);
  }

  const rows = [
    ["id", "nom", "telephone", "email", "points", "compte", "cree_le"],
    ...((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const customer = mapCustomer(row);
      return [
        customer.id,
        customer.name,
        customer.phone ?? "",
        customer.email ?? "",
        customer.points.toString(),
        customer.hasAccount ? "oui" : "non",
        customer.createdAt,
      ];
    }),
  ];

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export async function processScheduledNotifications() {
  const supabase = getSupabaseAdmin();
  const settings = mapBusinessSettings(await getBusinessSettingsRecord());
  const now = new Date();
  const reminderStart = addHours(now, 23);
  const reminderEnd = addHours(now, 25);
  const reviewThreshold = subHours(now, 24);

  const [reminderCandidates, reviewCandidates, existingLogs] = await Promise.all([
    supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("status", "confirmed")
      .gte("starts_at", reminderStart.toISOString())
      .lte("starts_at", reminderEnd.toISOString()),
    supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("status", "completed")
      .lte("ends_at", reviewThreshold.toISOString()),
    supabase
      .from("notification_logs")
      .select("booking_id, type")
      .in("type", ["booking_reminder", "review_request"]),
  ]);

  if (reminderCandidates.error) {
    throw new Error(`Lecture des rappels impossible: ${reminderCandidates.error.message}`);
  }
  if (reviewCandidates.error) {
    throw new Error(`Lecture des demandes d'avis impossible: ${reviewCandidates.error.message}`);
  }
  if (existingLogs.error) {
    throw new Error(`Lecture du journal impossible: ${existingLogs.error.message}`);
  }

  const seen = new Set(
    ((existingLogs.data ?? []) as Array<Record<string, unknown>>).map(
      (row) => `${String(row.type)}:${String(row.booking_id ?? "")}`,
    ),
  );

  let sent = 0;
  for (const row of (reminderCandidates.data ?? []) as Array<Record<string, unknown>>) {
    const booking = mapBookingWithRelations(row);
    if (!booking.customer?.email) {
      continue;
    }

    const key = `booking_reminder:${booking.id}`;
    if (seen.has(key)) {
      continue;
    }

    await sendBookingEmailIfPossible({
      type: "booking_reminder",
      booking,
      services: booking.services,
      customer: booking.customer,
      settings,
    });
    seen.add(key);
    sent += 1;
  }

  for (const row of (reviewCandidates.data ?? []) as Array<Record<string, unknown>>) {
    const booking = mapBookingWithRelations(row);
    if (!booking.customer?.email || !booking.customer.hasAccount) {
      continue;
    }

    const key = `review_request:${booking.id}`;
    if (seen.has(key)) {
      continue;
    }

    await sendBookingEmailIfPossible({
      type: "review_request",
      booking,
      services: booking.services,
      customer: booking.customer,
      settings,
    });
    seen.add(key);
    sent += 1;
  }

  return {
    processedAt: now.toISOString(),
    sent,
  };
}
