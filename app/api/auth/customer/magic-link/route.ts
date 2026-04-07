import { NextResponse } from "next/server";
import { sendCustomerMagicLink } from "@/lib/customer-auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; name?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "E-mail requis." }, { status: 400 });
    }

    await sendCustomerMagicLink({
      email,
      name: body.name?.trim(),
    });

    return NextResponse.json({ ok: true });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Envoi du lien magique impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
