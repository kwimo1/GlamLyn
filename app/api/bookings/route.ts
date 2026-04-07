import { NextResponse } from "next/server";
import { createBooking } from "@/lib/repository";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      name: string;
      phone: string;
      email?: string;
      notes?: string;
      serviceIds: string[];
      date: string;
      time: string;
      createAccount?: boolean;
    };

    const result = await createBooking(payload);
    return NextResponse.json({
      bookingId: result.booking.id,
      customerName: result.customer.name,
      startsAt: result.booking.startsAt,
      totalPriceDzd: result.booking.totalPriceDzd,
      totalDurationMinutes: result.booking.totalDurationMinutes,
      summary: result.summary,
      smsStatus: result.notification.status,
    });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "La réservation a échoué.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
