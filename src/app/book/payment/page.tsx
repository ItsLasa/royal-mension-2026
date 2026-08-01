"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { API_BASE_URL } from "@/lib/api/client";

function PaymentPanel() {
  const reference = useSearchParams().get("reference") ?? "";
  const [message, setMessage] = useState("");
  async function startPayHere() { const res = await fetch(`${API_BASE_URL}/payments/payhere/create`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference }) }); const json = await res.json(); if (!res.ok || !json.success) { setMessage(json.error?.message ?? "Payment could not be started."); return; } setMessage(`PayHere checkout prepared for ${reference}. In production submit these fields to ${json.data.actionUrl}.`); }
  async function bankTransfer() { const bankReference = prompt("Enter bank transfer reference"); if (!bankReference) return; const res = await fetch(`${API_BASE_URL}/payments/bank-transfer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, bankReference }) }); const json = await res.json(); setMessage(json.success ? "Bank transfer reference submitted for admin review." : json.error?.message); }
  return <div className="mx-auto max-w-3xl bg-white p-8"><p className="font-label-lg text-label-lg uppercase tracking-widest text-tertiary">Payment</p><h1 className="mt-3 font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">Complete booking {reference}</h1><p className="mt-4 text-on-surface-variant">PayHere confirmations happen only through the server callback. Browser redirects are treated as informational.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={startPayHere} className="bg-primary px-6 py-4 font-label-lg text-label-lg uppercase tracking-widest text-white">Pay with PayHere</button><button onClick={bankTransfer} className="border border-primary px-6 py-4 font-label-lg text-label-lg uppercase tracking-widest text-primary">Bank transfer</button></div>{message && <p className="mt-6" role="status">{message}</p>}</div>;
}

export default function PaymentPage() {
  return <><Header /><main className="min-h-screen bg-ivory px-margin-mobile pb-20 pt-36 md:px-margin-desktop"><Suspense fallback={<div className="mx-auto max-w-3xl bg-white p-8">Loading payment...</div>}><PaymentPanel /></Suspense></main><Footer /></>;
}
