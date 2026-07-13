"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, Button, Input, Select } from "@/components/ui";

type GigStatus = "idea" | "contacted" | "confirmed" | "played" | "cancelled";

interface ChoreTask {
  id: string;
  title: string;
  dueDate: string | null;
  status: "open" | "done";
}

interface PostDraft {
  id: string;
  date: string;
  platform: string;
  pillar: string;
  title: string;
  body: string;
  status: string;
}

interface Campaign {
  id: string;
  type: string;
  name: string;
  status: string;
  posts: PostDraft[];
}

interface Setlist {
  id: string;
  name: string;
}

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
  notes: string;
  tasks: ChoreTask[];
  campaigns: Campaign[];
  setlist: Setlist | null;
}

const STATUS_OPTIONS: GigStatus[] = ["idea", "contacted", "confirmed", "played", "cancelled"];

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export default function GigDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [gig, setGig] = useState<Gig | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState<Omit<Gig, "tasks" | "campaigns" | "setlist"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadGig = useCallback(async () => {
    const res = await fetch(`/api/gigs/${id}`);
    if (!res.ok) {
      setNotFound(true);
      return;
    }
    const data = await res.json();
    setGig(data.gig);
    setForm(data.gig);
  }, [id]);

  useEffect(() => {
    // state updates happen only after the fetch resolves, never synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGig();
  }, [loadGig]);

  async function saveGig() {
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/gigs/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          venue: form.venue,
          city: form.city,
          date: new Date(form.date).toISOString(),
          status: form.status,
          fee: form.fee,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      await loadGig();
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  async function generatePromoPlan() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/gigs/${id}/promote`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not generate promo plan");
        return;
      }
      await loadGig();
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  async function createSetlist() {
    if (!gig) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/setlists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: `${gig.title} Setlist`,
          targetDurationSec: 3600,
          gigId: gig.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create setlist");
        return;
      }
      router.push(`/setlists/${data.setlist.id}`);
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  async function toggleTask(task: ChoreTask) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: task.status === "open" ? "done" : "open" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update task");
        return;
      }
      await loadGig();
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <main>
        <p className="text-gray-500">Gig not found.</p>
      </main>
    );
  }

  if (gig === null || form === null) {
    return (
      <main>
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  const promoCampaign = gig.campaigns.find((c) => c.type === "gig_promo");
  const tasks = gig.tasks.slice().sort((a, b) => {
    const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return aTime - bTime;
  });
  const posts = (promoCampaign?.posts ?? [])
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const today = todayUTC();

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{gig.title}</h1>
        <Badge tone="indigo">{gig.status}</Badge>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <section className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-gray-200 p-4 sm:grid-cols-3">
        <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
          <span className="text-xs font-medium text-gray-600">Title</span>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
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
            value={toDateInputValue(form.date)}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Status</span>
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as GigStatus })}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Fee</span>
          <Input value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
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
        <label className="col-span-2 flex flex-col gap-1 sm:col-span-3">
          <span className="text-xs font-medium text-gray-600">Notes</span>
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        <div className="col-span-2 sm:col-span-3">
          <Button variant="primary" onClick={saveGig} disabled={busy}>
            Save
          </Button>
        </div>
      </section>

      <section className="mt-4 flex items-center gap-3 rounded-md border border-gray-200 p-4">
        <span className="text-sm font-medium text-gray-600">Setlist:</span>
        {gig.setlist ? (
          <Link href={`/setlists/${gig.setlist.id}`} className="text-indigo-600 hover:underline">
            {gig.setlist.name}
          </Link>
        ) : (
          <Button onClick={createSetlist} disabled={busy}>
            Create setlist
          </Button>
        )}
      </section>

      <section className="mt-4 rounded-md border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Promo plan</h2>
          {!promoCampaign && (
            <Button variant="primary" onClick={generatePromoPlan} disabled={busy}>
              Generate promo plan
            </Button>
          )}
        </div>

        {promoCampaign && (
          <>
            <p className="mt-2 text-sm text-gray-500">{promoCampaign.name}</p>

            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Checklist
            </h3>
            <ul className="mt-2 flex flex-col gap-1">
              {tasks.map((task) => {
                const overdue =
                  task.status === "open" &&
                  task.dueDate !== null &&
                  new Date(task.dueDate).getTime() < today.getTime();
                return (
                  <li
                    key={task.id}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      overdue ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={task.status === "done"}
                      onChange={() => toggleTask(task)}
                      disabled={busy}
                    />
                    <span className={task.status === "done" ? "flex-1 text-gray-400 line-through" : "flex-1"}>
                      {task.title}
                    </span>
                    <span className={overdue ? "font-medium text-red-600" : "text-gray-500"}>
                      {formatDate(task.dueDate)}
                      {overdue ? " · overdue" : ""}
                    </span>
                  </li>
                );
              })}
              {tasks.length === 0 && <p className="text-sm text-gray-400">No tasks yet.</p>}
            </ul>

            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Generated posts
            </h3>
            <ul className="mt-2 flex flex-col gap-1">
              {posts.map((post) => (
                <li key={post.id} className="rounded-md border border-gray-200 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{post.title}</span>
                    <span className="text-gray-500">
                      {formatDate(post.date)} · {post.platform} · {post.pillar}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-600">{post.body}</p>
                </li>
              ))}
              {posts.length === 0 && <p className="text-sm text-gray-400">No posts yet.</p>}
            </ul>
            <p className="mt-3 text-sm">
              <Link href="/calendar" className="text-indigo-600 hover:underline">
                View on calendar →
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
