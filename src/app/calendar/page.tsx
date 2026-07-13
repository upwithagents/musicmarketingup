"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Input, Select } from "@/components/ui";
import { apiFetch } from "@/lib/basePath";

const POST_STATUSES = ["idea", "drafted", "posted", "skipped"] as const;
type PostStatus = (typeof POST_STATUSES)[number];

interface CalPost {
  id: string;
  date: string;
  platform: string;
  pillar: string;
  title: string;
  body: string;
  status: PostStatus;
  campaignName: string;
}

interface CalTask {
  id: string;
  dueDate: string;
  title: string;
  status: "open" | "done";
  campaignName: string;
}

interface Campaign {
  id: string;
  name: string;
  posts: (Omit<CalPost, "campaignName"> & { status: PostStatus })[];
  tasks: { id: string; dueDate: string | null; title: string; status: "open" | "done" }[];
}

const WINDOW_DAYS = 42;

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function formatDay(key: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${key}T00:00:00.000Z`));
}

const STATUS_TONE: Record<PostStatus, "gray" | "indigo" | "green" | "amber"> = {
  idea: "gray",
  drafted: "amber",
  posted: "green",
  skipped: "gray",
};

export default function CalendarPage() {
  const [posts, setPosts] = useState<CalPost[] | null>(null);
  const [tasks, setTasks] = useState<CalTask[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);

  const load = useCallback(async () => {
    const [campRes, aiRes] = await Promise.all([
      apiFetch("/api/campaigns"),
      apiFetch("/api/posts/ai-status"),
    ]);
    const data = await campRes.json();
    const ai = await aiRes.json();
    setAiEnabled(Boolean(ai.enabled));

    const allPosts: CalPost[] = [];
    const allTasks: CalTask[] = [];
    for (const c of (data.campaigns ?? []) as Campaign[]) {
      for (const p of c.posts) {
        allPosts.push({ ...p, campaignName: c.name });
      }
      for (const t of c.tasks) {
        if (t.dueDate) {
          allTasks.push({ id: t.id, dueDate: t.dueDate, title: t.title, status: t.status, campaignName: c.name });
        }
      }
    }
    setPosts(allPosts);
    setTasks(allTasks);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function setPostStatus(id: string, status: PostStatus) {
    await apiFetch(`/api/posts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function toggleTask(id: string, current: "open" | "done") {
    await apiFetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: current === "open" ? "done" : "open" }),
    });
    await load();
  }

  if (posts === null) {
    return (
      <main>
        <h1 className="text-2xl font-semibold">Content calendar</h1>
        <p className="mt-6 text-gray-500">Loading…</p>
      </main>
    );
  }

  // Build the day buckets across the window.
  const start = todayUTC();
  const buckets: { key: string; posts: CalPost[]; tasks: CalTask[] }[] = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i));
    const key = d.toISOString().slice(0, 10);
    const dayPosts = posts.filter((p) => dayKey(p.date) === key);
    const dayTasks = tasks.filter((t) => dayKey(t.dueDate) === key);
    if (dayPosts.length > 0 || dayTasks.length > 0) {
      buckets.push({ key, posts: dayPosts, tasks: dayTasks });
    }
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Content calendar</h1>
        <Link href="/campaigns" className="text-sm text-indigo-600 hover:underline">
          Manage campaigns →
        </Link>
      </div>
      <p className="mt-1 text-sm text-gray-500">Next {WINDOW_DAYS / 7} weeks of planned posts and due tasks.</p>

      {buckets.length === 0 && (
        <p className="mt-6 text-sm text-gray-400">
          Nothing scheduled in this window. Create a campaign on the{" "}
          <Link href="/campaigns" className="text-indigo-600 hover:underline">
            campaigns
          </Link>{" "}
          page, or generate a promo plan from a{" "}
          <Link href="/gigs" className="text-indigo-600 hover:underline">
            gig
          </Link>
          .
        </p>
      )}

      <div className="mt-5 flex flex-col gap-5">
        {buckets.map((b) => (
          <section key={b.key}>
            <h2 className="text-sm font-semibold text-gray-700">{formatDay(b.key)}</h2>
            <div className="mt-2 flex flex-col gap-2">
              {b.tasks.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={t.status === "done"}
                    onChange={() => toggleTask(t.id, t.status)}
                  />
                  <span className={t.status === "done" ? "text-gray-400 line-through" : ""}>{t.title}</span>
                  <span className="ml-auto text-xs text-gray-400">{t.campaignName}</span>
                </label>
              ))}
              {b.posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  expanded={expandedId === p.id}
                  aiEnabled={aiEnabled}
                  onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  onSetStatus={(s) => setPostStatus(p.id, s)}
                  onSaved={load}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function PostCard({
  post,
  expanded,
  aiEnabled,
  onToggleExpand,
  onSetStatus,
  onSaved,
}: {
  post: CalPost;
  expanded: boolean;
  aiEnabled: boolean;
  onToggleExpand: () => void;
  onSetStatus: (s: PostStatus) => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [platform, setPlatform] = useState(post.platform);
  const [date, setDate] = useState(post.date.slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [refining, setRefining] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setNote(null);
    try {
      const res = await apiFetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, body, platform, date: new Date(date).toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setNote(data.error ?? "Save failed");
        return;
      }
      setNote("Saved");
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function improve() {
    setRefining(true);
    setNote(null);
    try {
      const res = await apiFetch(`/api/posts/${post.id}/refine`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setNote(data.error ?? "Could not improve draft");
        return;
      }
      setBody(data.body);
      setNote("Draft improved — review and save.");
    } finally {
      setRefining(false);
    }
  }

  return (
    <div className="rounded-md border border-gray-200 px-3 py-2">
      <div className="flex items-center gap-2">
        <Badge tone="indigo">{post.pillar}</Badge>
        {post.platform && <span className="text-xs text-gray-400">{post.platform}</span>}
        <button onClick={onToggleExpand} className="font-medium text-gray-900 hover:underline">
          {post.title}
        </button>
        <Badge tone={STATUS_TONE[post.status]}>{post.status}</Badge>
        <div className="ml-auto flex gap-1">
          {post.status !== "posted" && (
            <Button onClick={() => onSetStatus(post.status === "idea" ? "drafted" : "posted")}>
              {post.status === "idea" ? "Mark drafted" : "Mark posted"}
            </Button>
          )}
          {post.status !== "skipped" && post.status !== "posted" && (
            <Button onClick={() => onSetStatus("skipped")}>Skip</Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Title</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Body</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Platform</span>
              <Input value={platform} onChange={(e) => setPlatform(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Date</span>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Status</span>
            <Select value={post.status} onChange={(e) => onSetStatus(e.target.value as PostStatus)}>
              {POST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={save} disabled={busy}>
              Save
            </Button>
            {aiEnabled && (
              <Button onClick={improve} disabled={refining}>
                {refining ? "Improving…" : "✨ Improve draft"}
              </Button>
            )}
            {note && <span className="text-xs text-gray-500">{note}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
