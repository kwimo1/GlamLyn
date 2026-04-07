import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CUSTOMER_COOKIE } from "@/lib/auth";
import { verifyOtp } from "@/lib/repository";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      phone?: string;
      code?: string;
      name?: string;
    };

    if (!body.phone || !body.code) {
      return NextResponse.json(
        { error: "Téléphone et code requis." },
        { status: 400 },
      );
    }

    const result = await verifyOtp(body.phone, body.code, body.name);
    const cookieStore = await cookies();
    cookieStore.set(CUSTOMER_COOKIE, result.session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(result.session.expiresAt),
    });

    return NextResponse.json({
      customerId: result.customer.id,
      customerName: result.customer.name,
    });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Vérification impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
