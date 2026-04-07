import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { AdminUser, CustomerProfile } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const ADMIN_COOKIE = "glamlyn_admin_session";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "glam-lyn-demo-secret";

interface SignedSessionPayload {
  kind: "admin";
  subjectId: string;
  expiresAt: string;
}

function mapAdmin(row: Record<string, unknown>): AdminUser {
  return {
    id: String(row.id),
    username: String(row.username),
    passwordHash: String(row.password_hash),
    displayName: String(row.display_name),
    active: Boolean(row.active),
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
  };
}

function mapCustomer(row: Record<string, unknown>): CustomerProfile {
  return {
    id: String(row.id),
    authUserId: row.auth_user_id ? String(row.auth_user_id) : null,
    name: String(row.name ?? "Cliente Glam Lyn"),
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    points: Number(row.points ?? 0),
    hasAccount: Boolean(row.has_account),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
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

function signValue(value: string) {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

export function createSignedSessionToken(payload: SignedSessionPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signValue(encoded)}`;
}

function verifySignedSessionToken(token: string | undefined) {
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

export async function getAdminSession(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  const payload = verifySignedSessionToken(token);

  if (!payload?.subjectId || payload.kind !== "admin") {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("id", payload.subjectId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Lecture admin impossible: ${error.message}`);
  }

  return data ? mapAdmin(data as Record<string, unknown>) : null;
}

export async function getCustomerSession(): Promise<CustomerProfile | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const admin = getSupabaseAdmin();
  const byAuth = await admin
    .from("customer_profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byAuth.error) {
    throw new Error(`Lecture du compte client impossible: ${byAuth.error.message}`);
  }

  if (byAuth.data) {
    return mapCustomer(byAuth.data as Record<string, unknown>);
  }

  if (!user.email) {
    return null;
  }

  const byEmail = await admin
    .from("customer_profiles")
    .select("*")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  if (byEmail.error) {
    throw new Error(`Lecture du compte client impossible: ${byEmail.error.message}`);
  }

  return byEmail.data ? mapCustomer(byEmail.data as Record<string, unknown>) : null;
}
