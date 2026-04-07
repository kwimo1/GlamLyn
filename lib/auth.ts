import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { AdminUser, CustomerProfile, DatabaseShape, SessionRecord } from "@/lib/types";

export const ADMIN_COOKIE = "glamlyn_admin_session";
export const CUSTOMER_COOKIE = "glamlyn_customer_session";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "glam-lyn-demo-secret";

interface SignedSessionPayload {
  kind: "admin" | "customer";
  subjectId?: string;
  phone?: string;
  name?: string;
  expiresAt: string;
}

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

function signValue(value: string) {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

export function createSignedSessionToken(payload: SignedSessionPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signValue(encoded)}`;
}

export function verifySignedSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = signValue(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SignedSessionPayload;
  if (new Date(payload.expiresAt) <= new Date()) {
    return null;
  }

  return payload;
}

export async function getCookieValue(name: string) {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
}

export async function getAdminSession(db: DatabaseShape): Promise<AdminUser | null> {
  const token = await getCookieValue(ADMIN_COOKIE);
  const signedPayload = verifySignedSessionToken(token);
  if (signedPayload?.kind === "admin" && signedPayload.subjectId) {
    return (
      db.adminUsers.find(
        (user) => user.id === signedPayload.subjectId && user.active,
      ) ?? null
    );
  }

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
  const signedPayload = verifySignedSessionToken(token);
  if (signedPayload?.kind === "customer") {
    if (signedPayload.subjectId) {
      const customer = db.customers.find(
        (entry) => entry.id === signedPayload.subjectId,
      );
      if (customer) {
        return customer;
      }
    }

    if (signedPayload.phone) {
      const customerByPhone = db.customers.find(
        (entry) => entry.phone === signedPayload.phone,
      );
      if (customerByPhone) {
        return customerByPhone;
      }

      return {
        id: signedPayload.subjectId ?? `session_${signedPayload.phone}`,
        name: signedPayload.name ?? "Cliente Glam Lyn",
        phone: signedPayload.phone,
        points: 0,
        hasAccount: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

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
