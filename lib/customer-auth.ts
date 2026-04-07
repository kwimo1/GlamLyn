import { createClient, type User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePublicSupabaseConfig, getAppUrl } from "@/lib/supabase/config";
import type { SupabaseDatabase } from "@/lib/supabase/database";
import type { CustomerProfile } from "@/lib/types";

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

function getMagicLinkSupabaseClient() {
  const { url, anonKey } = requirePublicSupabaseConfig();
  return createClient<SupabaseDatabase>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function sendCustomerMagicLink(input: { email: string; name?: string }) {
  const supabase = getMagicLinkSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback`,
      data: {
        full_name: input.name ?? "",
      },
    },
  });

  if (error) {
    throw new Error(`Envoi du lien magique impossible: ${error.message}`);
  }
}

export async function syncCustomerProfileFromUser(user: User) {
  const supabase = getSupabaseAdmin();
  const nameFromUser =
    typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : user.email?.split("@")[0] ?? "Cliente Glam Lyn";

  const email = user.email?.trim().toLowerCase() ?? null;
  let profileRow: Record<string, unknown> | null = null;

  const byAuth = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byAuth.error) {
    throw new Error(`Lecture du compte client impossible: ${byAuth.error.message}`);
  }

  profileRow = (byAuth.data as Record<string, unknown> | null) ?? null;

  if (!profileRow && email) {
    const byEmail = await supabase
      .from("customer_profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (byEmail.error) {
      throw new Error(`Lecture du compte client impossible: ${byEmail.error.message}`);
    }

    profileRow = (byEmail.data as Record<string, unknown> | null) ?? null;
  }

  if (profileRow) {
    const shouldAwardPoint = !profileRow.has_account;
    const nextPoints = Number(profileRow.points ?? 0) + (shouldAwardPoint ? 1 : 0);
    const profileId = String(profileRow.id);
    const nextName =
      nameFromUser ||
      (typeof profileRow.name === "string" && profileRow.name.trim()
        ? profileRow.name.trim()
        : "Cliente Glam Lyn");
    const { data, error } = await supabase
      .from("customer_profiles")
      .update({
        auth_user_id: user.id,
        email,
        name: nextName,
        has_account: true,
        points: nextPoints,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Synchronisation du compte client impossible: ${error.message}`);
    }

    return mapCustomer(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("customer_profiles")
    .insert({
      id: `customer_${crypto.randomUUID()}`,
      auth_user_id: user.id,
      email,
      name: nameFromUser,
      has_account: true,
      points: 1,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Création du compte client impossible: ${error.message}`);
  }

  return mapCustomer(data as Record<string, unknown>);
}
