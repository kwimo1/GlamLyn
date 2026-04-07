"use server";

import { getAdminSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseMediaBucket } from "@/lib/supabase/config";
import {
  addUploadedMedia,
  cancelBookingByAdmin,
  completeBookingByAdmin,
  deleteMedia,
  moderateReview,
  rescheduleBookingByAdmin,
  upsertBusinessSettings,
  upsertReel,
  upsertService,
} from "@/lib/repository";
import { generateId } from "@/lib/utils";

async function requireAdmin() {
  const admin = await getAdminSession();
  if (!admin) {
    throw new Error("Accès admin requis.");
  }

  return admin;
}

export async function upsertServiceAction(formData: FormData) {
  await requireAdmin();
  await upsertService({
    id: formData.get("id")?.toString() || undefined,
    name: formData.get("name")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    categoryId:
      (formData.get("categoryId")?.toString() as "cheveux" | "beaute_bien_etre") ??
      "cheveux",
    priceDzd: Number(formData.get("priceDzd")?.toString() ?? "0"),
    durationMinutes: Number(formData.get("durationMinutes")?.toString() ?? "30"),
    order: Number(formData.get("order")?.toString() ?? "1"),
    active: formData.get("active") === "on",
    featured: formData.get("featured") === "on",
  });
}

export async function moderateReviewAction(formData: FormData) {
  await requireAdmin();
  await moderateReview({
    reviewId: formData.get("reviewId")?.toString() ?? "",
    status:
      (formData.get("status")?.toString() as "published" | "rejected") ?? "published",
  });
}

export async function completeBookingAction(formData: FormData) {
  await requireAdmin();
  await completeBookingByAdmin(formData.get("bookingId")?.toString() ?? "");
}

export async function cancelBookingAdminAction(formData: FormData) {
  await requireAdmin();
  await cancelBookingByAdmin(formData.get("bookingId")?.toString() ?? "");
}

export async function rescheduleBookingAdminAction(formData: FormData) {
  await requireAdmin();
  await rescheduleBookingByAdmin({
    bookingId: formData.get("bookingId")?.toString() ?? "",
    date: formData.get("date")?.toString() ?? "",
    time: formData.get("time")?.toString() ?? "",
  });
}

export async function upsertReelAction(formData: FormData) {
  await requireAdmin();
  await upsertReel({
    id: formData.get("id")?.toString() || undefined,
    title: formData.get("title")?.toString() ?? "",
    caption: formData.get("caption")?.toString() ?? "",
    reelUrl: formData.get("reelUrl")?.toString() ?? "",
    order: Number(formData.get("order")?.toString() ?? "1"),
    published: formData.get("published") === "on",
    externalCoverUrl: formData.get("externalCoverUrl")?.toString() ?? "",
  });
}

export async function upsertBusinessSettingsAction(formData: FormData) {
  await requireAdmin();
  await upsertBusinessSettings({
    announcement: formData.get("announcement")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    whatsapp: formData.get("whatsapp")?.toString() ?? "",
    address: formData.get("address")?.toString() ?? "",
  });
}

export async function uploadMediaAction(formData: FormData) {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) {
    throw new Error("Aucun fichier média reçu.");
  }

  const mediaId = generateId("media");
  const extension = file.name.split(".").pop() || "bin";
  const storagePath = `${mediaId}.${extension}`;
  const bucket = getSupabaseMediaBucket();
  const supabase = getSupabaseAdmin();
  const bytes = await file.arrayBuffer();

  const upload = await supabase.storage
    .from(bucket)
    .upload(storagePath, Buffer.from(bytes), {
      contentType: file.type,
      upsert: false,
    });

  if (upload.error) {
    throw new Error(`Upload média impossible: ${upload.error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);

  await addUploadedMedia({
    id: mediaId,
    label: formData.get("label")?.toString() ?? file.name,
    alt: formData.get("alt")?.toString() ?? "Photo Glam Lyn",
    section:
      (formData.get("section")?.toString() as "hero" | "gallery" | "instagram" | "reviews") ??
      "gallery",
    src: data.publicUrl,
    kind: "upload",
    order: Number(formData.get("order")?.toString() ?? "10"),
    uploadedAt: new Date().toISOString(),
    mimeType: file.type,
    storagePath,
  });
}

export async function deleteMediaAction(formData: FormData) {
  await requireAdmin();
  const mediaId = formData.get("mediaId")?.toString() ?? "";
  const storagePath = formData.get("storagePath")?.toString() ?? "";

  if (storagePath) {
    const supabase = getSupabaseAdmin();
    await supabase.storage.from(getSupabaseMediaBucket()).remove([storagePath]);
  }

  await deleteMedia(mediaId);
}
