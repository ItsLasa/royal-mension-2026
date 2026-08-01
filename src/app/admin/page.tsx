"use client";

import { FormEvent, useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { API_BASE_URL } from "@/lib/api/client";

type AdminUser = { id: string; name: string; email: string; role: string };
type Dashboard = { bookings: number; revenue: { grandTotal: string | number | null; amountPaid: string | number | null }; arrivals: Array<{ id: string; reference: string; checkInDate: string; checkOutDate: string; bookingStatus: string; guest: { firstName: string; lastName: string }; package: { name: string } }> };

const lkr = (value: string | number | null | undefined) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(Number(value ?? 0));

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) throw new Error(json?.error?.message ?? "Request failed.");
  return json.data as T;
}

export default function AdminPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDashboard() {
    const data = await api<Dashboard>("/admin/dashboard");
    setDashboard(data);
  }

  useEffect(() => {
    api<{ user: AdminUser }>("/admin/auth/me")
      .then(async (data) => {
        setUser(data.user);
        await loadDashboard();
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setMessage("Signing in...");
    try {
      const data = await api<{ user: AdminUser }>("/admin/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setUser(data.user);
      await loadDashboard();
      setMessage("");
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    }
  }

  async function logout() {
    await api("/admin/auth/logout", { method: "POST" }).catch(() => null);
    setUser(null);
    setDashboard(null);
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface px-margin-mobile pb-20 pt-36 md:px-margin-desktop">
        <div className="mx-auto max-w-7xl">
          <p className="font-label-lg text-label-lg uppercase tracking-widest text-tertiary">Owner Console</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-headline-lg text-headline-lg-mobile text-primary md:text-headline-lg">Booking dashboard</h1>
              <p className="mt-3 max-w-2xl text-on-surface-variant">Secure admin access for bookings, payments, calendar blocks, packages, and reports.</p>
            </div>
            {user && <button onClick={logout} className="border border-primary px-5 py-3 font-label-lg text-label-lg uppercase tracking-widest text-primary">Log out</button>}
          </div>

          {loading && <div className="mt-10 bg-white p-8 text-primary">Checking admin session...</div>}

          {!loading && !user && (
            <form onSubmit={login} className="mt-10 max-w-md bg-white p-8 shadow-sm">
              <h2 className="font-headline-sm text-headline-sm text-primary">Admin sign in</h2>
              <label className="mt-6 grid gap-2 text-primary">Email<input className="border border-outline-variant p-3" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              <label className="mt-4 grid gap-2 text-primary">Password<input className="border border-outline-variant p-3" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></label>
              <button className="mt-6 w-full bg-primary px-6 py-4 font-label-lg text-label-lg uppercase tracking-widest text-white">Sign in</button>
              {message && <p className="mt-4 text-sm text-error" role="alert">{message}</p>}
            </form>
          )}

          {user && dashboard && (
            <section className="mt-10 space-y-8">
              <div className="bg-white p-6 text-primary"><span className="text-on-surface-variant">Signed in as </span>{user.name} <span className="text-on-surface-variant">({user.role})</span></div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="bg-white p-6"><p className="font-label-lg text-label-lg uppercase tracking-widest text-outline">Bookings</p><p className="mt-4 text-3xl text-primary">{dashboard.bookings}</p></div>
                <div className="bg-white p-6"><p className="font-label-lg text-label-lg uppercase tracking-widest text-outline">Revenue</p><p className="mt-4 text-3xl text-primary">{lkr(dashboard.revenue.grandTotal)}</p></div>
                <div className="bg-white p-6"><p className="font-label-lg text-label-lg uppercase tracking-widest text-outline">Paid</p><p className="mt-4 text-3xl text-primary">{lkr(dashboard.revenue.amountPaid)}</p></div>
                <div className="bg-white p-6"><p className="font-label-lg text-label-lg uppercase tracking-widest text-outline">Upcoming</p><p className="mt-4 text-3xl text-primary">{dashboard.arrivals.length}</p></div>
              </div>
              <div className="bg-white p-6">
                <h2 className="font-headline-sm text-headline-sm text-primary">Upcoming arrivals</h2>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left">
                    <thead><tr className="border-b border-outline-variant text-sm uppercase tracking-widest text-outline"><th className="py-3">Reference</th><th>Guest</th><th>Package</th><th>Dates</th><th>Status</th></tr></thead>
                    <tbody>{dashboard.arrivals.map((booking) => <tr key={booking.id} className="border-b border-mist"><td className="py-4 text-primary">{booking.reference}</td><td>{booking.guest.firstName} {booking.guest.lastName}</td><td>{booking.package.name}</td><td>{new Date(booking.checkInDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} - {new Date(booking.checkOutDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</td><td>{booking.bookingStatus}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
