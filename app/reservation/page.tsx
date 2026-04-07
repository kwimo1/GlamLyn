import { PublicShell } from "@/components/layout/public-shell";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { SectionHeading } from "@/components/ui/section-heading";
import { getBookingBootstrap } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function ReservationPage() {
  const data = await getBookingBootstrap();

  return (
    <PublicShell compactHeader>
      <section className="page-frame px-4 py-10 sm:px-6">
        <SectionHeading
          eyebrow="Réservation"
          title="Composez votre rendez-vous comme un panier de services."
          description="Cheveux et beauté peuvent être réservés ensemble. Le temps et le prix total se mettent à jour en direct avant la confirmation."
        />

        <div className="mt-10">
          <BookingWizard
            categories={data.categories}
            services={data.services}
            availableDates={data.availableDates}
            settings={data.settings}
          />
        </div>
      </section>
    </PublicShell>
  );
}
