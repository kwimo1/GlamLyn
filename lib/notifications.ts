import { Resend } from "resend";
import { generateId } from "@/lib/utils";
import type { NotificationLog, NotificationType } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

interface EmailDeliveryInput {
  type: NotificationType;
  recipient: string;
  subject: string;
  message: string;
  html?: string;
  bookingId?: string | null;
  customerId?: string | null;
}

let resendClient: Resend | null = null;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

function getResendFrom() {
  return process.env.RESEND_FROM_EMAIL?.trim() || "";
}

function toPlainText(htmlOrText: string) {
  return htmlOrText
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function insertNotificationLog(log: NotificationLog) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("notification_logs").insert({
    id: log.id,
    type: log.type,
    channel: log.channel,
    recipient: log.recipient,
    subject: log.subject,
    message: log.message,
    status: log.status,
    provider: log.provider,
    booking_id: log.bookingId ?? null,
    customer_id: log.customerId ?? null,
    created_at: log.createdAt,
  });

  if (error) {
    throw new Error(`Journal email impossible à écrire: ${error.message}`);
  }
}

export async function logEmail(input: EmailDeliveryInput) {
  const now = new Date().toISOString();
  const resend = getResendClient();
  const from = getResendFrom();

  let status: NotificationLog["status"] = "skipped";
  let provider: NotificationLog["provider"] = "manual";

  if (resend && from && input.recipient) {
    try {
      const result = await resend.emails.send({
        from,
        to: input.recipient,
        subject: input.subject,
        text: toPlainText(input.message),
        html:
          input.html ??
          `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#241a13;">${input.message}</div>`,
      });

      if (result.error) {
        status = "failed";
        provider = "resend";
      } else {
        status = "sent";
        provider = "resend";
      }
    } catch {
      status = "failed";
      provider = "resend";
    }
  }

  const log: NotificationLog = {
    id: generateId("notif"),
    type: input.type,
    channel: "email",
    recipient: input.recipient,
    subject: input.subject,
    message: toPlainText(input.message),
    status,
    provider,
    createdAt: now,
    bookingId: input.bookingId ?? null,
    customerId: input.customerId ?? null,
  };

  await insertNotificationLog(log);
  return log;
}
