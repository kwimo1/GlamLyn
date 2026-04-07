"use server";

import { getCustomerSession } from "@/lib/auth";
import { readDb } from "@/lib/mock-db";
import {
  cancelBookingByCustomer,
  rescheduleBookingForCustomer,
  submitSiteReview,
} from "@/lib/repository";

async function requireCustomer() {
  const db = await readDb();
  const customer = await getCustomerSession(db);
  if (!customer) {
    throw new Error("Connexion client requise.");
  }

  return { db, customer };
}

export async function cancelBookingAction(formData: FormData) {
  const { customer } = await requireCustomer();
  await cancelBookingByCustomer(formData.get("bookingId")?.toString() ?? "", customer.id);
}

export async function rescheduleBookingAction(formData: FormData) {
  const { customer } = await requireCustomer();
  await rescheduleBookingForCustomer({
    bookingId: formData.get("bookingId")?.toString() ?? "",
    customerId: customer.id,
    startsAt: formData.get("startsAt")?.toString() ?? "",
  });
}

export async function submitReviewAction(formData: FormData) {
  const { db, customer } = await requireCustomer();
  const bookingId = formData.get("bookingId")?.toString() ?? "";
  const rating = Number(formData.get("rating")?.toString() ?? "5");
  const text = formData.get("text")?.toString() ?? "";

  const booking = db.bookings.find(
    (entry) =>
      entry.id === bookingId &&
      entry.customerId === customer.id &&
      entry.status === "completed",
  );

  if (!booking) {
    throw new Error("Seules les prestations terminées peuvent recevoir un avis.");
  }

  await submitSiteReview({
    customerId: customer.id,
    bookingId,
    rating,
    text,
  });
}
