"use client";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { API_BASE_URL } from "@/lib/api/client";

export default function ManageBookingPage() {
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState<any>(null);
  async function lookup() { const res = await fetch(`${API_BASE_URL}/bookings/${reference}/status`); const json = await res.json(); setStatus(json.data); }
  return <><Header /><main className="min-h-screen bg-ivory px-margin-mobile pb-20 pt-36 md:px-margin-desktop"><div className="mx-auto max-w-3xl bg-white p-8"><p className="font-label-lg text-label-lg uppercase tracking-widest text-tertiary">Manage Booking</p><h1 className="mt-3 font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">Find your reservation</h1><div className="mt-8 flex flex-col gap-3 sm:flex-row"><input className="border border-outline-variant p-4" placeholder="RMV-20260815-A7K9" value={reference} onChange={(e) => setReference(e.target.value)} /><button onClick={lookup} className="bg-primary px-6 py-4 font-label-lg text-label-lg uppercase tracking-widest text-white">Search</button></div>{status && <pre className="mt-6 overflow-auto bg-ivory p-4 text-sm">{JSON.stringify(status, null, 2)}</pre>}</div></main><Footer /></>;
}
