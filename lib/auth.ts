import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import type { AdminUser, CustomerProfile, DatabaseShape, SessionRecord } from "@/lib/types";

export const ADMIN_COOKIE = "glamlyn_admin_session";
export const CUSTOMER_COOKIE = "glamlyn_customer_session";

export function hashPassword(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function verifyPassword(input: string, expectedHash: string) {
  const actual = Buffer.from(hashPassword(input));
  const expected = Buffer.from(expectedHash);

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export function createSessionRecord(subjectId: string): SessionRecord {
  const token = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now);
  expires.setDate(now.getDate() + 7);

  return {
    id: crypto.randomUUID(),
    token,
    subjectId,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
}

export async function getCookieValue(name: string) {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
}

export async function getAdminSession(db: DatabaseShape): Promise<AdminUser | null> {
  const token = await getCookieValue(ADMIN_COOKIE);
  if (!token) {
    return null;
  }

  const session = db.adminSessions.find(
    (entry) => entry.token === token && new Date(entry.expiresAt) > new Date(),
  );

  if (!session) {
    return null;
  }

  return db.adminUsers.find((user) => user.id === session.subjectId && user.active) ?? null;
}

export async function getCustomerSession(db: DatabaseShape): Promise<CustomerProfile | null> {
  const token = await getCookieValue(CUSTOMER_COOKIE);
  if (!token) {
    return null;
  }

  const session = db.customerSessions.find(
    (entry) => entry.token === token && new Date(entry.expiresAt) > new Date(),
  );

  if (!session) {
    return null;
  }

  return db.customers.find((customer) => customer.id === session.subjectId) ?? null;
}
