import { NextResponse } from "next/server";
import { syncCustomerProfileFromUser } from "@/lib/customer-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/connexion?erreur=${encodeURIComponent(errorDescription)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/connexion?erreur=${encodeURIComponent("Lien magique invalide.")}`,
    );
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw new Error(error.message);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error(userError?.message ?? "Compte client introuvable.");
    }

    await syncCustomerProfileFromUser(user);
    return NextResponse.redirect(`${origin}/compte`);
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Connexion cliente impossible.";
    return NextResponse.redirect(
      `${origin}/connexion?erreur=${encodeURIComponent(message)}`,
    );
  }
}
