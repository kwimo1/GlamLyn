import type { DatabaseShape, NotificationLog, NotificationType } from "@/lib/types";
import { generateId } from "@/lib/utils";

type SmsResult = Pick<NotificationLog, "status" | "provider">;

async function sendTwilioSms(to: string, body: string): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_MESSAGING_SERVICE_SID ?? process.env.TWILIO_FROM;

  if (!accountSid || !authToken || !from) {
    return {
      status: "mocked",
      provider: "mock",
    };
  }

  const params = new URLSearchParams();
  params.set("To", to);
  params.set("Body", body);

  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    params.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
  } else {
    params.set("From", from);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  if (!response.ok) {
    return {
      status: "failed",
      provider: "twilio",
    };
  }

  return {
    status: "sent",
    provider: "twilio",
  };
}

export async function logSms(
  db: DatabaseShape,
  type: NotificationType,
  recipient: string,
  message: string,
) {
  const result = await sendTwilioSms(recipient, message);
  const log: NotificationLog = {
    id: generateId("notif"),
    type,
    channel: "sms",
    recipient,
    message,
    status: result.status,
    provider: result.provider,
    createdAt: new Date().toISOString(),
  };

  db.notificationLogs.unshift(log);
  return {
    ...result,
    demoCode: result.provider === "mock" && type === "otp" ? message.match(/\b(\d{6})\b/)?.[1] : undefined,
  };
}
