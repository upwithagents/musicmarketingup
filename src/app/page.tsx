"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button } from "@/components/ui";
import { apiFetch } from "@/lib/basePath";

interface Gig {
  id: string;
  title: string;
  venue: string;
  city: string;
  date: string;
  status: string;
}

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  status: "open" | "done";
}

interface Post {
  id: string;
  date: string;
  pillar: string;
  title: string;
  platform: string;
  status: string;
}

interface Campaign {
  id: string;
  name: string;
  posts: Post[];
  tasks: Task[];
}

function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function daysBetween(fromISO: string): number {
  const target = new Date(fromISO);
  const t0 = todayUTC().getTime();
  const t1 = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return Math.round((t1 - t0) / 86_400_000);
}

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default function Home() {
  const [gigs, setGigs] = useState<Gig[] | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [songCount, setSongCount] = useState<number | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    const [gigRes, campRes, songRes, profileRes] = await Promise.all([
      apiFetch("/api/gigs"),
      apiFetch("/api/campaigns"),
      apiFetch("/api/songs"),
      apiFetch("/api/profile"),
    ]);
    setGigs((await gigRes.json()).gigs ?? []);
    setCampaigns((await campRes.json()).campaigns ?? []);
    setSongCount(((await songRes.json()).songs ?? []).length);
    setHasProfile(Boolean((await profileRes.json()).profile));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function toggleTask(id: string, current: "open" | "done") {
    await apiFetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: current === "open" ? "done" : "open" }),
    });
    await load();
  }

  async function setPostStatus(id: string, status: string) {
    await apiFetch(`/api/posts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  if (gigs === null || campaigns === null) {
    return (
      <main>
        <h1 className="text-2xl font-semibold">🎤 MusicMarketingUp</h1>
        <p className="mt-6 text-gray-500">Loading…</p>
      </main>
    );
  }

  const nextGig = gigs
    .filter((g) => g.status !== "cancelled" && daysBetween(g.date) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const allTasks: Task[] = campaigns.flatMap((c) => c.tasks);
  const allPosts: (Post & { campaignName: string })[] = campaigns.flatMap((c) =>
    c.posts.map((p) => ({ ...p, campaignName: c.name })),
  );

  const weekTasks = allTasks
    .filter((t) => t.dueDate && t.status === "open" && daysBetween(t.dueDate) >= 0 && daysBetween(t.dueDate) <= 7)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  const weekPosts = allPosts
    .filter((p) => p.status !== "posted" && p.status !== "skipped" && daysBetween(p.date) >= 0 && daysBetween(p.date) <= 7)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const isEmpty = gigs.length === 0 && campaigns.length === 0 && (songCount ?? 0) === 0;

  return (
    <main>
      <h1 className="text-2xl font-semibold">🎤 MusicMarketingUp</h1>
      <p className="mt-1 text-sm text-gray-500">Your band&apos;s week at a glance.</p>

      {isEmpty && (
        <div className="mt-5 rounded-md border border-dashed border-gray-300 p-5">
          <h2 className="font-semibold">Get started</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-indigo-600">
            <li>
              <Link href="/profile" className="hover:underline">
                {hasProfile ? "Review your band profile" : "1. Set up your band profile →"}
              </Link>
            </li>
            <li>
              <Link href="/songs" className="hover:underline">
                2. Add your songs →
              </Link>
            </li>
            <li>
              <Link href="/gigs" className="hover:underline">
                3. Add a gig and generate a promo plan →
              </Link>
            </li>
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <section className="rounded-md border border-gray-200 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Next gig</h2>
          {nextGig ? (
            <div className="mt-2">
              <Link href={`/gigs/${nextGig.id}`} className="font-medium text-indigo-600 hover:underline">
                {nextGig.title}
              </Link>
              <p className="text-sm text-gray-500">
                {[nextGig.venue, nextGig.city].filter(Boolean).join(", ") || "—"} · {formatDay(nextGig.date)}
              </p>
              <p className="mt-1 text-sm">
                <Badge tone="indigo">
                  {daysBetween(nextGig.date) === 0 ? "Today" : `in ${daysBetween(nextGig.date)} days`}
                </Badge>
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-400">
              No upcoming gigs.{" "}
              <Link href="/gigs" className="text-indigo-600 hover:underline">
                Add one
              </Link>
              .
            </p>
          )}
        </section>

        <section className="rounded-md border border-gray-200 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Quick links</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <Link href="/songs" className="text-indigo-600 hover:underline">Songs</Link>
            <span className="text-gray-300">·</span>
            <Link href="/setlists" className="text-indigo-600 hover:underline">Setlists</Link>
            <span className="text-gray-300">·</span>
            <Link href="/gigs" className="text-indigo-600 hover:underline">Gigs</Link>
            <span className="text-gray-300">·</span>
            <Link href="/calendar" className="text-indigo-600 hover:underline">Calendar</Link>
            <span className="text-gray-300">·</span>
            <Link href="/campaigns" className="text-indigo-600 hover:underline">Campaigns</Link>
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-md border border-gray-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">This week&apos;s tasks</h2>
        {weekTasks.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">Nothing due in the next 7 days.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {weekTasks.map((t) => (
              <li key={t.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={false} onChange={() => toggleTask(t.id, t.status)} />
                  <span>{t.title}</span>
                  <span className="ml-auto text-xs text-gray-400">{t.dueDate ? formatDay(t.dueDate) : ""}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-md border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">This week&apos;s posts</h2>
          <Link href="/calendar" className="text-xs text-indigo-600 hover:underline">Full calendar →</Link>
        </div>
        {weekPosts.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">No posts planned in the next 7 days.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {weekPosts.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-md border border-gray-100 px-2 py-1.5 text-sm"
              >
                <Badge tone="indigo">{p.pillar}</Badge>
                <span>{p.title}</span>
                <span className="text-xs text-gray-400">{formatDay(p.date)}</span>
                <div className="ml-auto flex gap-1">
                  <Button onClick={() => setPostStatus(p.id, p.status === "idea" ? "drafted" : "posted")}>
                    {p.status === "idea" ? "Mark drafted" : "Mark posted"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
