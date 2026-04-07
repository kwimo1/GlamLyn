import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { exportBookingsCsv } from "@/lib/repository";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Accès admin requis." }, { status: 401 });
  }

  const csv = await exportBookingsCsv();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="glam-lyn-bookings.csv"',
    },
  });
}
