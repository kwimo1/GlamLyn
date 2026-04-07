import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";
import { loginAdmin } from "@/lib/repository";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };
    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: "Identifiant et mot de passe requis." },
        { status: 400 },
      );
    }

    const result = await loginAdmin({
      username: body.username,
      password: body.password,
    });

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE, result.session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(result.session.expiresAt),
    });

    return NextResponse.json({
      adminId: result.admin.id,
      adminName: result.admin.displayName,
    });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Connexion admin impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
