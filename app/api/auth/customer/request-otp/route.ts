import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/repository";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string; name?: string };
    if (!body.phone) {
      return NextResponse.json({ error: "Téléphone requis." }, { status: 400 });
    }

    const result = await requestOtp(body.phone, body.name);
    return NextResponse.json(result);
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Impossible d'envoyer le code.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
