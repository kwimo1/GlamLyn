"use server";

import { getCustomerSession } from "@/lib/auth";
import {
  cancelBookingByCustomer,
  rescheduleBookingForCustomer,
  submitSiteReview,
} from "@/lib/repository";

async function requireCustomer() {
  const customer = await getCustomerSession();
  if (!customer) {
    throw new Error("Connexion cliente requise.");
  }

  return customer;
}

export async function cancelBookingAction(formData: FormData) {
  const customer = await requireCustomer();
  await cancelBookingByCustomer(formData.get("bookingId")?.toString() ?? "", customer.id);
}

export async function rescheduleBookingAction(formData: FormData) {
  const customer = await requireCustomer();
  await rescheduleBookingForCustomer({
    bookingId: formData.get("bookingId")?.toString() ?? "",
    customerId: customer.id,
    startsAt: formData.get("startsAt")?.toString() ?? "",
  });
}

export async function submitReviewAction(formData: FormData) {
  const customer = await requireCustomer();
  await submitSiteReview({
    customerId: customer.id,
    bookingId: formData.get("bookingId")?.toString() ?? "",
    rating: Number(formData.get("rating")?.toString() ?? "5"),
    text: formData.get("text")?.toString() ?? "",
  });
}
