import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, CUSTOMER_COOKIE } from "@/lib/auth";
import { clearSession } from "@/lib/repository";

export async function POST() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_COOKIE)?.value;
  const customerToken = cookieStore.get(CUSTOMER_COOKIE)?.value;

  if (adminToken) {
    await clearSession(adminToken, "admin");
    cookieStore.delete(ADMIN_COOKIE);
  }

  if (customerToken) {
    await clearSession(customerToken, "customer");
    cookieStore.delete(CUSTOMER_COOKIE);
  }

  return NextResponse.json({ ok: true });
}
