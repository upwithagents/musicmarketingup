"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Badge, Button, Input, Select } from "@/components/ui";
import { apiFetch } from "@/lib/basePath";

type GigStatus = "idea" | "contacted" | "confirmed" | "played" | "cancelled";

interface Gig {
  id: string;
  title: string;
  venue: string;
  city: string;
  date: string;
  status: GigStatus;
  fee: string;
  contactName: string;
  contactEmail: string;
}

const STATUS_COLUMNS: { status: GigStatus; label: string }[] = [
  { status: "idea", label: "Idea" },
  { status: "contacted", label: "Contacted" },
  { status: "confirmed", label: "Confirmed" },
  { status: "played", label: "Played" },
  { status: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<GigStatus, "gray" | "indigo" | "green" | "amber"> = {
  idea: "gray",
  contacted: "amber",
  confirmed: "indigo",
  played: "green",
  cancelled: "gray",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

interface FormState {
  title: string;
  venue: string;
  city: string;
  date: string;
  fee: string;
  contactName: string;
  contactEmail: string;
  status: GigStatus;
}

const EMPTY_FORM: FormState = {
  title: "",
  venue: "",
  city: "",
  date: "",
  fee: "",
  contactName: "",
  contactEmail: "",
  status: "idea",
};

export default function GigsPage() {
  const [gigs, setGigs] = useState<Gig[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadGigs = useCallback(async () => {
    const res = await apiFetch("/api/gigs");
    const data = await res.json();
    setGigs(data.gigs ?? []);
  }, []);

  useEffect(() => {
    // state updates happen only after the fetch resolves, never synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGigs();
  }, [loadGigs]);

  function startAdd() {
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

  async function submitForm(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (form.title.trim().length === 0) {
      setError("Title is required");
      return;
    }
    if (form.date.trim().length === 0) {
      setError("Date is required");
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch("/api/gigs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, date: new Date(form.date).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setShowForm(false);
      await loadGigs();
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gigs</h1>
        {!showForm && (
          <Button variant="primary" onClick={startAdd}>
            + New gig
          </Button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {showForm && (
        <form
          onSubmit={submitForm}
          className="mt-4 flex flex-col gap-3 rounded-md border border-gray-200 p-4"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
              <span className="text-xs font-medium text-gray-600">Title</span>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Venue</span>
              <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">City</span>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Date</span>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Fee</span>
              <Input value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Status</span>
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as GigStatus })}
              >
                {STATUS_COLUMNS.map((c) => (
                  <option key={c.status} value={c.status}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Contact name</span>
              <Input
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Contact email</span>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={busy}>
              Create gig
            </Button>
            <Button type="button" onClick={() => setShowForm(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {gigs === null && <p className="mt-6 text-gray-500">Loading…</p>}

      {gigs !== null && (
        <div className="mt-6 flex flex-col gap-6">
          {STATUS_COLUMNS.map((column) => {
            const columnGigs = gigs
              .filter((g) => g.status === column.status)
              .slice()
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return (
              <section key={column.status}>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {column.label}
                  <Badge tone={STATUS_BADGE[column.status]}>{columnGigs.length}</Badge>
                </h2>
                {columnGigs.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-400">No gigs.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1">
                    {columnGigs.map((gig) => (
                      <li
                        key={gig.id}
                        className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2"
                      >
                        <Link href={`/gigs/${gig.id}`} className="font-medium text-indigo-600 hover:underline">
                          {gig.title}
                        </Link>
                        <span className="text-sm text-gray-500">
                          {[gig.venue, gig.city].filter(Boolean).join(", ")} · {formatDate(gig.date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
