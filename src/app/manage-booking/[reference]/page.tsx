import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { apiGet } from "@/lib/api/client";

export default async function ManageReferencePage({ params }: { params: { reference: string } }) {
  const booking = await apiGet(`/bookings/${params.reference}/status`);
  return <><Header /><main className="min-h-screen bg-ivory px-margin-mobile pb-20 pt-36 md:px-margin-desktop"><div className="mx-auto max-w-3xl bg-white p-8"><p className="font-label-lg text-label-lg uppercase tracking-widest text-tertiary">Reservation</p><h1 className="mt-3 font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">{params.reference}</h1><pre className="mt-6 overflow-auto bg-ivory p-4 text-sm">{JSON.stringify(booking ?? { message: "Booking API unavailable or reference not found." }, null, 2)}</pre></div></main><Footer /></>;
}
