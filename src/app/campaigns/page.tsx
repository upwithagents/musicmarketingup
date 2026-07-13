"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Badge, Button, Input } from "@/components/ui";
import { apiFetch } from "@/lib/basePath";

interface PostDraft {
  id: string;
  status: string;
}

interface Campaign {
  id: string;
  type: string;
  name: string;
  status: string;
  anchorDate: string;
  posts: PostDraft[];
  tasks: { id: string; status: string }[];
}

const TYPE_LABEL: Record<string, string> = {
  gig_promo: "Gig promo",
  single_release: "Single release",
  always_on: "Always-on",
};

const TYPE_TONE: Record<string, "gray" | "indigo" | "green" | "amber"> = {
  gig_promo: "amber",
  single_release: "indigo",
  always_on: "green",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Single-release form
  const [releaseName, setReleaseName] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  // Always-on form
  const [alwaysName, setAlwaysName] = useState("");
  const [alwaysStart, setAlwaysStart] = useState("");
  const [alwaysWeeks, setAlwaysWeeks] = useState("4");

  const load = useCallback(async () => {
    const res = await apiFetch("/api/campaigns");
    const data = await res.json();
    setCampaigns(data.campaigns ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function create(payload: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch("/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create campaign");
        return;
      }
      await load();
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  async function submitRelease(e: FormEvent) {
    e.preventDefault();
    if (!releaseName.trim() || !releaseDate) {
      setError("Release title and date are required");
      return;
    }
    await create({
      type: "single_release",
      name: releaseName,
      anchorDate: new Date(releaseDate).toISOString(),
    });
    setReleaseName("");
    setReleaseDate("");
  }

  async function submitAlwaysOn(e: FormEvent) {
    e.preventDefault();
    if (!alwaysName.trim() || !alwaysStart) {
      setError("Name and start date are required");
      return;
    }
    await create({
      type: "always_on",
      name: alwaysName,
      anchorDate: new Date(alwaysStart).toISOString(),
      weeks: Number(alwaysWeeks),
    });
    setAlwaysName("");
    setAlwaysStart("");
    setAlwaysWeeks("4");
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold">Campaigns</h1>
      <p className="mt-1 text-sm text-gray-500">
        Generate a dated plan of posts and tasks. See them on the{" "}
        <Link href="/calendar" className="text-indigo-600 hover:underline">
          calendar
        </Link>
        . Gig promos are created from a gig.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <form onSubmit={submitRelease} className="flex flex-col gap-3 rounded-md border border-gray-200 p-4">
          <h2 className="font-semibold">New single release</h2>
          <p className="text-xs text-gray-500">Waterfall plan anchored on the release date.</p>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Single / release title</span>
            <Input value={releaseName} onChange={(e) => setReleaseName(e.target.value)} placeholder="Neon Skyline" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Release date</span>
            <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
          </label>
          <Button type="submit" variant="primary" disabled={busy}>
            Generate release plan
          </Button>
        </form>

        <form onSubmit={submitAlwaysOn} className="flex flex-col gap-3 rounded-md border border-gray-200 p-4">
          <h2 className="font-semibold">New always-on plan</h2>
          <p className="text-xs text-gray-500">4 posts/week rotating pillars, promo capped at 1-in-5.</p>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Name</span>
            <Input value={alwaysName} onChange={(e) => setAlwaysName(e.target.value)} placeholder="Summer presence" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Start date</span>
              <Input type="date" value={alwaysStart} onChange={(e) => setAlwaysStart(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Weeks</span>
              <Input
                type="number"
                min={1}
                value={alwaysWeeks}
                onChange={(e) => setAlwaysWeeks(e.target.value)}
              />
            </label>
          </div>
          <Button type="submit" variant="primary" disabled={busy}>
            Generate always-on plan
          </Button>
        </form>
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">All campaigns</h2>
      {campaigns === null && <p className="mt-3 text-gray-500">Loading…</p>}
      {campaigns !== null && campaigns.length === 0 && (
        <p className="mt-3 text-sm text-gray-400">No campaigns yet. Create one above.</p>
      )}
      {campaigns !== null && campaigns.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {campaigns.map((c) => {
            const posted = c.posts.filter((p) => p.status === "posted").length;
            return (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Badge tone={TYPE_TONE[c.type] ?? "gray"}>{TYPE_LABEL[c.type] ?? c.type}</Badge>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-gray-400">{formatDate(c.anchorDate)}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {posted}/{c.posts.length} posted
                  {c.tasks.length > 0 ? ` · ${c.tasks.length} tasks` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
