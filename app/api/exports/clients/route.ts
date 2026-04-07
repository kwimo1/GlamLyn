import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { readDb } from "@/lib/mock-db";
import { exportCustomersCsv } from "@/lib/repository";

export async function GET() {
  const db = await readDb();
  const admin = await getAdminSession(db);
  if (!admin) {
    return NextResponse.json({ error: "Accès admin requis." }, { status: 401 });
  }

  const csv = await exportCustomersCsv();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="glam-lyn-clients.csv"',
    },
  });
}
