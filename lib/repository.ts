import { addDays, addHours, isBefore } from "date-fns";
import { revalidatePath } from "next/cache";
import { getAdminSession, getCustomerSession, verifyPassword } from "@/lib/auth";
import { createSessionRecord } from "@/lib/auth";
import { computeSlotsForDate, getDateKey, makeAlgiersDate, nextDays } from "@/lib/date";
import {
  formatCurrencyDzd,
  formatLongDate,
  formatTime,
} from "@/lib/format";
import { readDb, updateDb } from "@/lib/mock-db";
import { logSms } from "@/lib/notifications";
import type {
  Booking,
  CreateBookingInput,
  CustomerProfile,
  DashboardMetrics,
  DatabaseShape,
  ServiceItem,
} from "@/lib/types";
import { generateId, normalizePhone } from "@/lib/utils";

function getServicesByIds(db: DatabaseShape, ids: string[]) {
  return ids
    .map((id) => db.services.find((service) => service.id === id && service.active))
    .filter(Boolean) as ServiceItem[];
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

function findOrCreateCustomer(
  db: DatabaseShape,
  input: {
    name: string;
    phone: string;
    email?: string;
    createAccount?: boolean;
  },
) {
  const normalizedPhone = normalizePhone(input.phone);
  const existing = db.customers.find((customer) => customer.phone === normalizedPhone);

  if (existing) {
    existing.name = input.name || existing.name;
    existing.email = input.email || existing.email;
    existing.updatedAt = new Date().toISOString();

    if (input.createAccount && !existing.hasAccount) {
      existing.hasAccount = true;
      existing.points += 1;
    }

    return existing;
  }

  const now = new Date().toISOString();
  const customer: CustomerProfile = {
    id: generateId("customer"),
    name: input.name,
    phone: normalizedPhone,
    email: input.email,
    points: input.createAccount ? 1 : 0,
    hasAccount: Boolean(input.createAccount),
    createdAt: now,
    updatedAt: now,
  };

  db.customers.unshift(customer);
  return customer;
}

function getUpcomingBookings(db: DatabaseShape) {
  return db.bookings
    .filter((booking) => booking.status === "confirmed" && new Date(booking.startsAt) > new Date())
    .sort((left, right) => +new Date(left.startsAt) - +new Date(right.startsAt));
}

function getDashboardMetrics(db: DatabaseShape): DashboardMetrics {
  const now = new Date();
  const weekAhead = addDays(now, 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const upcoming = db.bookings.filter(
    (booking) =>
      booking.status === "confirmed" &&
      new Date(booking.startsAt) >= now &&
      new Date(booking.startsAt) <= weekAhead,
  );
  const cancelled = db.bookings.filter(
    (booking) =>
      booking.status === "cancelled" &&
      new Date(booking.updatedAt) >= now &&
      new Date(booking.updatedAt) <= weekAhead,
  );

  const estimatedRevenueDzd = upcoming.reduce(
    (total, booking) => total + booking.totalPriceDzd,
    0,
  );

  const openingWindows = db.businessSettings.openingHours.filter(
    (entry) => entry.open && entry.close,
  ).length;

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

  const newAccountsThisMonth = db.customers.filter(
    (customer) => customer.hasAccount && new Date(customer.createdAt) >= monthStart,
  ).length;

  const topServicesMap = new Map<string, { id: string; name: string; count: number }>();
  db.bookings
    .filter((booking) => booking.status !== "cancelled")
    .forEach((booking) => {
      booking.serviceIds.forEach((serviceId) => {
        const service = db.services.find((entry) => entry.id === serviceId);
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

  return {
    estimatedRevenueDzd,
    bookingsThisWeek: upcoming.length,
    cancellationsThisWeek: cancelled.length,
    occupancyRate,
    newAccountsThisMonth,
    pendingReviews: db.siteReviews.filter((review) => review.status === "pending").length,
    topServices: [...topServicesMap.values()]
      .sort((left, right) => right.count - left.count)
      .slice(0, 4),
  };
}

function formatBookingSmsMessage(
  type: "booking_cancelled" | "booking_rescheduled" | "review_request",
  booking: Booking,
  db: DatabaseShape,
) {
  const salonName = db.businessSettings.salonName;

  if (type === "booking_cancelled") {
    return `${salonName}: votre rendez-vous du ${formatLongDate(
      booking.startsAt,
    )} a ete annule. Contactez le salon si besoin.`;
  }

  if (type === "booking_rescheduled") {
    return `${salonName}: votre rendez-vous a ete reporte au ${formatLongDate(
      booking.startsAt,
    )} a ${formatTime(booking.startsAt)}.`;
  }

  return `${salonName}: merci pour votre visite. Laissez votre avis sur Glam Lyn pour aider de futures clientes.`;
}

export async function getPublicData() {
  const db = await readDb();
  return {
    businessSettings: db.businessSettings,
    services: db.services
      .filter((service) => service.active)
      .sort((left, right) => left.order - right.order),
    categories: db.serviceCategories,
    heroMedia: db.mediaAssets
      .filter((asset) => asset.section === "hero")
      .sort((left, right) => left.order - right.order),
    galleryMedia: db.mediaAssets
      .filter((asset) => asset.section === "gallery")
      .sort((left, right) => left.order - right.order),
    siteReviews: db.siteReviews
      .filter((review) => review.status === "published")
      .slice(0, 4)
      .map((review) => ({
        ...review,
        customer: db.customers.find((customer) => customer.id === review.customerId),
      })),
    googleReviews: db.googleReviewSnapshots.slice(0, 3),
    reels: db.instagramReels
      .filter((item) => item.published)
      .sort((left, right) => left.order - right.order),
  };
}

export async function getBookingBootstrap() {
  const db = await readDb();
  const availableDates = nextDays(6).map((date) => ({
    key: getDateKey(date),
    label: new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: db.businessSettings.timezone,
    }).format(date),
  }));

  return {
    settings: db.businessSettings,
    categories: db.serviceCategories,
    services: db.services
      .filter((service) => service.active)
      .sort((left, right) => left.order - right.order),
    availableDates,
  };
}

export async function getAvailability(date: string, serviceIds: string[]) {
  const db = await readDb();
  const services = getServicesByIds(db, serviceIds);
  if (!services.length) {
    return {
      slots: [],
      totalDurationMinutes: 0,
      totalPriceDzd: 0,
    };
  }

  const totals = summarizeSelection(services);
  const slots = computeSlotsForDate({
    date: makeAlgiersDate(date, "09:00"),
    durationMinutes: totals.totalDurationMinutes,
    settings: db.businessSettings,
    bookings: db.bookings,
  });

  return {
    slots,
    ...totals,
  };
}

export async function createBooking(input: CreateBookingInput) {
  return updateDb(async (db) => {
    const services = getServicesByIds(db, input.serviceIds);
    if (!services.length) {
      throw new Error("Aucun service selectionne.");
    }

    const totals = summarizeSelection(services);
    const start = makeAlgiersDate(input.date, input.time);
    const now = addHours(new Date(), db.businessSettings.bookingLeadHours);
    if (isBefore(start, now)) {
      throw new Error("Ce creneau ne respecte plus le preavis minimum.");
    }

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + totals.totalDurationMinutes);

    const overlaps = db.bookings.some((booking) => {
      if (booking.status !== "confirmed") {
        return false;
      }

      const bookingStart = new Date(booking.startsAt);
      const bookingEnd = new Date(booking.endsAt);
      return start < bookingEnd && end > bookingStart;
    });

    if (overlaps) {
      throw new Error("Ce creneau vient d'etre reserve. Choisissez un autre horaire.");
    }

    const customer = findOrCreateCustomer(db, {
      name: input.name,
      phone: input.phone,
      email: input.email,
      createAccount: input.createAccount,
    });

    const nowIso = new Date().toISOString();
    const booking: Booking = {
      id: generateId("booking"),
      customerId: customer.id,
      serviceIds: services.map((service) => service.id),
      totalPriceDzd: totals.totalPriceDzd,
      totalDurationMinutes: totals.totalDurationMinutes,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      status: "confirmed",
      source: customer.hasAccount ? "account" : "guest",
      notes: input.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.bookings.unshift(booking);

    const summary = services.map((service) => service.name).join(", ");
    const confirmationMessage = `${db.businessSettings.salonName}: reservation confirmee pour ${summary} le ${formatLongDate(
      booking.startsAt,
    )} a ${formatTime(booking.startsAt)}. Total ${formatCurrencyDzd(booking.totalPriceDzd)}.`;
    const notification = await logSms(
      db,
      "booking_confirmation",
      customer.phone,
      confirmationMessage,
    );

    return {
      booking,
      customer,
      summary,
      notification,
    };
  });
}

export async function requestOtp(phone: string, name?: string) {
  return updateDb(async (db) => {
    const normalizedPhone = normalizePhone(phone);
    const code =
      process.env.SMS_PROVIDER === "twilio"
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : "123456";

    db.otpSessions = db.otpSessions.filter(
      (session) => session.phone !== normalizedPhone || Boolean(session.consumedAt),
    );
    db.otpSessions.unshift({
      id: generateId("otp"),
      phone: normalizedPhone,
      code,
      name,
      createdAt: new Date().toISOString(),
      expiresAt: addHours(new Date(), 0.25).toISOString(),
    });

    const sms = await logSms(
      db,
      "otp",
      normalizedPhone,
      `Glam Lyn: votre code de connexion est ${code}. Il reste valide 15 minutes.`,
    );

    return {
      phone: normalizedPhone,
      demoCode: sms.demoCode,
    };
  });
}

export async function verifyOtp(phone: string, code: string, name?: string) {
  return updateDb(async (db) => {
    const normalizedPhone = normalizePhone(phone);
    const otp = db.otpSessions.find(
      (entry) =>
        entry.phone === normalizedPhone &&
        !entry.consumedAt &&
        new Date(entry.expiresAt) > new Date(),
    );

    if (!otp || otp.code !== code) {
      throw new Error("Code de verification invalide.");
    }

    otp.consumedAt = new Date().toISOString();
    const customer = findOrCreateCustomer(db, {
      name: name || otp.name || "Cliente Glam Lyn",
      phone: normalizedPhone,
      createAccount: true,
    });

    const existingSession = db.customerSessions.find(
      (session) => session.subjectId === customer.id,
    );
    const session = existingSession ?? createSessionRecord(customer.id);

    if (!existingSession) {
      db.customerSessions.unshift(session);
    }

    return {
      customer,
      session,
    };
  });
}

export async function loginAdmin(input: { username: string; password: string }) {
  return updateDb(async (db) => {
    const admin = db.adminUsers.find(
      (user) => user.username === input.username && user.active,
    );
    if (!admin || !verifyPassword(input.password, admin.passwordHash)) {
      throw new Error("Identifiant admin ou mot de passe incorrect.");
    }

    admin.lastLoginAt = new Date().toISOString();
    const session = createSessionRecord(admin.id);
    db.adminSessions.unshift(session);

    return {
      admin,
      session,
    };
  });
}

export async function clearSession(token: string, kind: "admin" | "customer") {
  return updateDb((db) => {
    if (kind === "admin") {
      db.adminSessions = db.adminSessions.filter((session) => session.token !== token);
      return;
    }

    db.customerSessions = db.customerSessions.filter((session) => session.token !== token);
  });
}

export async function getCustomerDashboard() {
  const db = await readDb();
  const customer = await getCustomerSession(db);
  if (!customer) {
    return null;
  }

  const bookings = db.bookings
    .filter((booking) => booking.customerId === customer.id)
    .sort((left, right) => +new Date(right.startsAt) - +new Date(left.startsAt))
    .map((booking) => ({
      ...booking,
      services: getServicesByIds(db, booking.serviceIds),
      canSelfManage:
        booking.status === "confirmed" &&
        new Date(booking.startsAt) >
          addHours(new Date(), db.businessSettings.selfServiceChangeHours),
    }));

  const reviews = db.siteReviews.filter((review) => review.customerId === customer.id);

  return {
    customer,
    bookings,
    reviews,
    settings: db.businessSettings,
  };
}

export async function getAdminDashboard() {
  const db = await readDb();
  const admin = await getAdminSession(db);
  if (!admin) {
    return null;
  }

  return {
    admin,
    metrics: getDashboardMetrics(db),
    upcomingBookings: getUpcomingBookings(db).slice(0, 8).map((booking) => ({
      ...booking,
      customer: db.customers.find((customer) => customer.id === booking.customerId),
      services: getServicesByIds(db, booking.serviceIds),
    })),
    services: db.services.sort((left, right) => left.order - right.order),
    mediaAssets: db.mediaAssets.sort((left, right) => left.order - right.order),
    instagramReels: db.instagramReels.sort((left, right) => left.order - right.order),
    reviews: db.siteReviews.map((review) => ({
      ...review,
      customer: db.customers.find((customer) => customer.id === review.customerId),
    })),
    customers: db.customers.sort(
      (left, right) => +new Date(right.updatedAt) - +new Date(left.updatedAt),
    ),
    notificationLogs: db.notificationLogs.slice(0, 10),
    businessSettings: db.businessSettings,
  };
}

export async function submitSiteReview(input: {
  customerId: string;
  bookingId: string;
  rating: number;
  text: string;
}) {
  return updateDb((db) => {
    db.siteReviews.unshift({
      id: generateId("review"),
      customerId: input.customerId,
      bookingId: input.bookingId,
      rating: input.rating,
      text: input.text,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    revalidatePath("/avis");
    revalidatePath("/admin");
  });
}

export async function cancelBookingByCustomer(bookingId: string, customerId: string) {
  return updateDb(async (db) => {
    const booking = db.bookings.find(
      (entry) => entry.id === bookingId && entry.customerId === customerId,
    );
    if (!booking || booking.status !== "confirmed") {
      throw new Error("Reservation introuvable.");
    }

    if (
      new Date(booking.startsAt) <
      addHours(new Date(), db.businessSettings.selfServiceChangeHours)
    ) {
      throw new Error("Le delai de modification en libre-service est depasse.");
    }

    booking.status = "cancelled";
    booking.updatedAt = new Date().toISOString();
    const customer = db.customers.find((entry) => entry.id === customerId);
    if (customer) {
      await logSms(
        db,
        "booking_cancelled",
        customer.phone,
        formatBookingSmsMessage("booking_cancelled", booking, db),
      );
    }

    revalidatePath("/compte");
    revalidatePath("/admin");
    revalidatePath("/reservation");
  });
}

export async function rescheduleBookingForCustomer(input: {
  bookingId: string;
  customerId: string;
  startsAt: string;
}) {
  return updateDb(async (db) => {
    const booking = db.bookings.find(
      (entry) => entry.id === input.bookingId && entry.customerId === input.customerId,
    );
    if (!booking || booking.status !== "confirmed") {
      throw new Error("Reservation introuvable.");
    }

    const start = new Date(input.startsAt);
    if (start < addHours(new Date(), db.businessSettings.selfServiceChangeHours)) {
      throw new Error("Le nouveau creneau ne respecte pas le delai minimum.");
    }

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + booking.totalDurationMinutes);

    const overlaps = db.bookings.some((entry) => {
      if (entry.id === booking.id || entry.status !== "confirmed") {
        return false;
      }

      const bookingStart = new Date(entry.startsAt);
      const bookingEnd = new Date(entry.endsAt);
      return start < bookingEnd && end > bookingStart;
    });

    if (overlaps) {
      throw new Error("Le nouveau creneau n'est plus disponible.");
    }

    booking.startsAt = start.toISOString();
    booking.endsAt = end.toISOString();
    booking.updatedAt = new Date().toISOString();
    const customer = db.customers.find((entry) => entry.id === input.customerId);
    if (customer) {
      await logSms(
        db,
        "booking_rescheduled",
        customer.phone,
        formatBookingSmsMessage("booking_rescheduled", booking, db),
      );
    }

    revalidatePath("/compte");
    revalidatePath("/admin");
    revalidatePath("/reservation");
  });
}

export async function getSuggestedSlotsForBooking(booking: Booking) {
  const db = await readDb();
  const current = new Date(booking.startsAt);
  const dates = nextDays(8)
    .map((date) => getDateKey(date))
    .filter((dateKey) => dateKey !== getDateKey(current));

  return dates
    .flatMap((dateKey) =>
      computeSlotsForDate({
        date: makeAlgiersDate(dateKey, "09:00"),
        durationMinutes: booking.totalDurationMinutes,
        settings: db.businessSettings,
        bookings: db.bookings,
      }).slice(0, 2),
    )
    .slice(0, 6);
}

export async function completeBookingByAdmin(bookingId: string) {
  return updateDb(async (db) => {
    const booking = db.bookings.find((entry) => entry.id === bookingId);
    if (!booking) {
      throw new Error("Reservation introuvable.");
    }

    booking.status = "completed";
    booking.updatedAt = new Date().toISOString();
    const customer = db.customers.find((entry) => entry.id === booking.customerId);
    if (customer) {
      customer.points += 1;
      customer.updatedAt = new Date().toISOString();
      await logSms(
        db,
        "review_request",
        customer.phone,
        formatBookingSmsMessage("review_request", booking, db),
      );
    }

    revalidatePath("/admin");
    revalidatePath("/compte");
  });
}

export async function cancelBookingByAdmin(bookingId: string) {
  return updateDb(async (db) => {
    const booking = db.bookings.find((entry) => entry.id === bookingId);
    if (!booking) {
      throw new Error("Reservation introuvable.");
    }

    booking.status = "cancelled";
    booking.updatedAt = new Date().toISOString();
    const customer = db.customers.find((entry) => entry.id === booking.customerId);
    if (customer) {
      await logSms(
        db,
        "booking_cancelled",
        customer.phone,
        formatBookingSmsMessage("booking_cancelled", booking, db),
      );
    }

    revalidatePath("/admin");
    revalidatePath("/compte");
    revalidatePath("/reservation");
  });
}

export async function rescheduleBookingByAdmin(input: {
  bookingId: string;
  date: string;
  time: string;
}) {
  return updateDb(async (db) => {
    const booking = db.bookings.find((entry) => entry.id === input.bookingId);
    if (!booking) {
      throw new Error("Reservation introuvable.");
    }

    const start = makeAlgiersDate(input.date, input.time);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + booking.totalDurationMinutes);

    const overlaps = db.bookings.some((entry) => {
      if (entry.id === booking.id || entry.status !== "confirmed") {
        return false;
      }

      const bookingStart = new Date(entry.startsAt);
      const bookingEnd = new Date(entry.endsAt);
      return start < bookingEnd && end > bookingStart;
    });

    if (overlaps) {
      throw new Error("Ce nouveau creneau est deja pris.");
    }

    booking.startsAt = start.toISOString();
    booking.endsAt = end.toISOString();
    booking.updatedAt = new Date().toISOString();
    const customer = db.customers.find((entry) => entry.id === booking.customerId);
    if (customer) {
      await logSms(
        db,
        "booking_rescheduled",
        customer.phone,
        formatBookingSmsMessage("booking_rescheduled", booking, db),
      );
    }

    revalidatePath("/admin");
    revalidatePath("/compte");
    revalidatePath("/reservation");
  });
}

export async function upsertService(
  input: Partial<ServiceItem> & {
    name: string;
    categoryId: ServiceItem["categoryId"];
  },
) {
  return updateDb((db) => {
    const existing = input.id ? db.services.find((service) => service.id === input.id) : null;
    if (existing) {
      existing.name = input.name;
      existing.description = input.description ?? existing.description;
      existing.categoryId = input.categoryId;
      existing.priceDzd = Number(input.priceDzd ?? existing.priceDzd);
      existing.durationMinutes = Number(input.durationMinutes ?? existing.durationMinutes);
      existing.active = input.active ?? existing.active;
      existing.featured = input.featured ?? existing.featured;
      existing.order = Number(input.order ?? existing.order);
    } else {
      db.services.push({
        id: generateId("service"),
        name: input.name,
        description: input.description ?? "",
        categoryId: input.categoryId,
        priceDzd: Number(input.priceDzd ?? 0),
        durationMinutes: Number(input.durationMinutes ?? 30),
        active: input.active ?? true,
        featured: input.featured ?? false,
        order: Number(input.order ?? db.services.length + 1),
      });
    }

    revalidatePath("/");
    revalidatePath("/reservation");
    revalidatePath("/admin");
  });
}

export async function moderateReview(input: {
  reviewId: string;
  status: "published" | "rejected";
}) {
  return updateDb((db) => {
    const review = db.siteReviews.find((entry) => entry.id === input.reviewId);
    if (!review) {
      throw new Error("Avis introuvable.");
    }

    review.status = input.status;
    revalidatePath("/avis");
    revalidatePath("/admin");
  });
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
  return updateDb((db) => {
    const existing = input.id ? db.instagramReels.find((entry) => entry.id === input.id) : null;
    if (existing) {
      existing.title = input.title;
      existing.caption = input.caption;
      existing.reelUrl = input.reelUrl;
      existing.order = Number(input.order);
      existing.published = input.published;
      existing.externalCoverUrl = input.externalCoverUrl;
    } else {
      db.instagramReels.push({
        id: generateId("reel"),
        title: input.title,
        caption: input.caption,
        reelUrl: input.reelUrl,
        published: input.published,
        order: Number(input.order),
        externalCoverUrl: input.externalCoverUrl,
      });
    }

    revalidatePath("/");
    revalidatePath("/admin");
  });
}

export async function upsertBusinessSettings(input: {
  announcement: string;
  phone: string;
  whatsapp: string;
  address: string;
}) {
  return updateDb((db) => {
    db.businessSettings.announcement = input.announcement;
    db.businessSettings.phone = input.phone;
    db.businessSettings.whatsapp = input.whatsapp;
    db.businessSettings.address = input.address;

    revalidatePath("/");
    revalidatePath("/reservation");
    revalidatePath("/admin");
  });
}

export async function addUploadedMedia(asset: DatabaseShape["mediaAssets"][number]) {
  return updateDb((db) => {
    db.mediaAssets.unshift(asset);
    revalidatePath("/");
    revalidatePath("/admin");
  });
}

export async function deleteMedia(mediaId: string) {
  return updateDb((db) => {
    db.mediaAssets = db.mediaAssets.filter((asset) => asset.id !== mediaId);
    revalidatePath("/");
    revalidatePath("/admin");
  });
}

export async function exportBookingsCsv() {
  const db = await readDb();
  const rows = [
    ["id", "cliente", "telephone", "date", "heure", "statut", "prix_dzd", "duree_min", "services"],
    ...db.bookings.map((booking) => {
      const customer = db.customers.find((entry) => entry.id === booking.customerId);
      const services = getServicesByIds(db, booking.serviceIds)
        .map((service) => service.name)
        .join(" / ");
      const start = new Date(booking.startsAt);

      return [
        booking.id,
        customer?.name ?? "",
        customer?.phone ?? "",
        getDateKey(start),
        formatTime(booking.startsAt),
        booking.status,
        booking.totalPriceDzd.toString(),
        booking.totalDurationMinutes.toString(),
        services,
      ];
    }),
  ];

  return rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export async function exportCustomersCsv() {
  const db = await readDb();
  const rows = [
    ["id", "nom", "telephone", "email", "points", "compte", "cree_le"],
    ...db.customers.map((customer) => [
      customer.id,
      customer.name,
      customer.phone,
      customer.email ?? "",
      customer.points.toString(),
      customer.hasAccount ? "oui" : "non",
      customer.createdAt,
    ]),
  ];

  return rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");
}
