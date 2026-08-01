"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { API_BASE_URL } from "@/lib/api/client";
import { fallbackAddOns, fallbackPackages, lkr } from "@/lib/bookingData";

type Quote = { grandTotal: number; depositRequired: number; balanceDue: number; nights: number; lines: Array<{ description: string; totalAmount: number }> };

export default function BookPage() {
  const [form, setForm] = useState({ packageId: fallbackPackages[0].id, checkInDate: "2026-08-15", checkOutDate: "2026-08-17", adults: 2, children: 0, infants: 0, paymentOption: "DEPOSIT", firstName: "", lastName: "", email: "", phone: "", country: "Sri Lanka", specialRequests: "", termsAccepted: false });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");
  const selected = useMemo(() => fallbackPackages.find((pkg) => pkg.id === form.packageId) ?? fallbackPackages[0], [form.packageId]);
  const fallbackQuote = useMemo(() => { const nights = Math.max(1, Math.round((new Date(form.checkOutDate).getTime() - new Date(form.checkInDate).getTime()) / 86400000)); const grandTotal = selected.basePrice * nights; const depositRequired = form.paymentOption === "FULL" ? grandTotal : grandTotal * 0.5; return { nights, grandTotal, depositRequired, balanceDue: grandTotal - depositRequired, lines: [{ description: `${selected.name} x ${nights} night${nights === 1 ? "" : "s"}`, totalAmount: grandTotal }] }; }, [selected, form.checkInDate, form.checkOutDate, form.paymentOption]);
  const currentQuote = quote ?? fallbackQuote;

  async function requestQuote() {
    setMessage("Checking live availability and price...");
    try {
      const response = await fetch(`${API_BASE_URL}/quotes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId: form.packageId, checkInDate: form.checkInDate, checkOutDate: form.checkOutDate, adults: Number(form.adults), children: Number(form.children), infants: Number(form.infants), addOns: [], paymentOption: form.paymentOption }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "The API is not available yet.");
      setQuote(json.data);
      setMessage("Live quote loaded from the booking API.");
    } catch (error) {
      setQuote(null);
      setMessage(error instanceof Error ? `${error.message} Showing seed pricing until the API and database are configured.` : "Showing seed pricing until the API is configured.");
    }
  }

  async function createHold() {
    if (!form.termsAccepted) { setMessage("Please accept the booking terms before continuing."); return; }
    setMessage("Creating a 15 minute booking hold...");
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/hold`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId: form.packageId, checkInDate: form.checkInDate, checkOutDate: form.checkOutDate, adults: Number(form.adults), children: Number(form.children), infants: Number(form.infants), addOns: [], paymentOption: form.paymentOption, guest: { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, country: form.country }, specialRequests: form.specialRequests, termsAccepted: form.termsAccepted }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Could not create booking hold.");
      window.location.href = `/book/payment?reference=${json.data.booking.reference}`;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create booking hold. Check API and database setup.");
    }
  }

  return (
    <>
      <Header />
      <main className="bg-ivory pt-28">
        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-margin-mobile py-12 md:px-margin-desktop lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-4 font-label-lg text-label-lg uppercase tracking-widest text-tertiary">Direct Reservation</p>
            <h1 className="mb-4 font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">Book Royal Mansion Resort Villa</h1>
            <p className="mb-8 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">Select dates, guests, add-ons, and payment preference. Final availability and pricing are verified again on the server before payment.</p>
            <div className="grid gap-5 bg-white p-6 shadow-sm md:grid-cols-2">
              <label className="grid gap-2 text-primary">Package<select className="border border-outline-variant p-3" value={form.packageId} onChange={(e) => setForm({ ...form, packageId: e.target.value })}>{fallbackPackages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name}</option>)}</select></label>
              <label className="grid gap-2 text-primary">Payment<select className="border border-outline-variant p-3" value={form.paymentOption} onChange={(e) => setForm({ ...form, paymentOption: e.target.value })}><option value="DEPOSIT">Pay 50% deposit</option><option value="FULL">Pay full amount</option></select></label>
              <label className="grid gap-2 text-primary">Check-in<input className="border border-outline-variant p-3" type="date" value={form.checkInDate} onChange={(e) => setForm({ ...form, checkInDate: e.target.value })} /></label>
              <label className="grid gap-2 text-primary">Check-out<input className="border border-outline-variant p-3" type="date" value={form.checkOutDate} onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })} /></label>
              <label className="grid gap-2 text-primary">Adults<input className="border border-outline-variant p-3" type="number" min="1" value={form.adults} onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })} /></label>
              <label className="grid gap-2 text-primary">Children<input className="border border-outline-variant p-3" type="number" min="0" value={form.children} onChange={(e) => setForm({ ...form, children: Number(e.target.value) })} /></label>
              <label className="grid gap-2 text-primary">First name<input className="border border-outline-variant p-3" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
              <label className="grid gap-2 text-primary">Last name<input className="border border-outline-variant p-3" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
              <label className="grid gap-2 text-primary">Email<input className="border border-outline-variant p-3" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <label className="grid gap-2 text-primary">Phone<input className="border border-outline-variant p-3" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <label className="grid gap-2 text-primary md:col-span-2">Special requests<textarea className="min-h-28 border border-outline-variant p-3" value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} /></label>
              <div className="md:col-span-2"><p className="mb-3 font-label-lg text-label-lg uppercase tracking-widest text-primary">Available extras</p><div className="grid gap-2 sm:grid-cols-2">{fallbackAddOns.map((item) => <label key={item} className="flex items-center gap-3 border border-outline-variant p-3"><input type="checkbox" />{item}</label>)}</div></div>
              <label className="flex items-start gap-3 md:col-span-2"><input type="checkbox" checked={form.termsAccepted} onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })} /><span>I agree to the booking terms, cancellation policy, and server-side availability check.</span></label>
              <div className="flex flex-col gap-3 sm:flex-row md:col-span-2"><button onClick={requestQuote} className="border border-primary px-6 py-4 font-label-lg text-label-lg uppercase tracking-widest text-primary">Check Availability</button><button onClick={createHold} className="bg-primary px-6 py-4 font-label-lg text-label-lg uppercase tracking-widest text-white">Create Hold and Pay</button></div>
              {message && <p className="md:col-span-2 text-on-surface-variant" role="status">{message}</p>}
            </div>
          </div>
          <aside className="lg:sticky lg:top-28">
            <div className="bg-primary p-8 text-white">
              <h2 className="mb-6 font-headline-sm text-headline-sm">Review</h2>
              <div className="space-y-4 border-y border-white/20 py-5">{currentQuote.lines.map((line) => <div key={line.description} className="flex justify-between gap-4"><span>{line.description}</span><span>{lkr(line.totalAmount)}</span></div>)}</div>
              <div className="mt-6 space-y-3 text-lg"><div className="flex justify-between"><span>Total</span><span>{lkr(currentQuote.grandTotal)}</span></div><div className="flex justify-between"><span>Due now</span><span>{lkr(currentQuote.depositRequired)}</span></div><div className="flex justify-between text-white/70"><span>Balance later</span><span>{lkr(currentQuote.balanceDue)}</span></div></div>
              <p className="mt-6 text-sm text-white/70">A booking hold expires after 15 minutes unless PayHere confirms payment or an admin confirms bank transfer.</p>
            </div>
          </aside>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
