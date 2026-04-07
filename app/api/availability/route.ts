import { NextResponse } from "next/server";
import { getAvailability } from "@/lib/repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const serviceIds = (searchParams.get("serviceIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!date) {
    return NextResponse.json(
      { error: "Date manquante." },
      { status: 400 },
    );
  }

  const payload = await getAvailability(date, serviceIds);
  return NextResponse.json(payload);
}
