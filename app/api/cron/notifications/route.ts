import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { processScheduledNotifications } from "@/lib/repository";

export async function GET() {
  const headerList = await headers();
  const expectedSecret = process.env.CRON_SECRET?.trim();
  const providedSecret = headerList.get("x-cron-secret") ?? headerList.get("authorization");

  if (expectedSecret) {
    const normalized = providedSecret?.replace(/^Bearer\s+/i, "");
    if (normalized !== expectedSecret) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
    }
  }

  try {
    const result = await processScheduledNotifications();
    return NextResponse.json(result);
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Traitement cron impossible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
