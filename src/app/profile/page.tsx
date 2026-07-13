"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Button, Input } from "@/components/ui";
import { apiFetch } from "@/lib/basePath";

interface LinksState {
  website: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  spotify: string;
}

const EMPTY_LINKS: LinksState = {
  website: "",
  instagram: "",
  tiktok: "",
  youtube: "",
  spotify: "",
};

const textareaClass =
  "w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [genre, setGenre] = useState("");
  const [homeTown, setHomeTown] = useState("");
  const [bio, setBio] = useState("");
  const [audienceNotes, setAudienceNotes] = useState("");
  const [links, setLinks] = useState<LinksState>(EMPTY_LINKS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await apiFetch("/api/profile");
      const data = await res.json();
      if (cancelled) return;
      if (data.profile) {
        setName(data.profile.name ?? "");
        setGenre(data.profile.genre ?? "");
        setHomeTown(data.profile.homeTown ?? "");
        setBio(data.profile.bio ?? "");
        setAudienceNotes(data.profile.audienceNotes ?? "");
        setLinks({ ...EMPTY_LINKS, ...safeParseLinks(data.profile.links) });
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await apiFetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          genre,
          homeTown,
          bio,
          audienceNotes,
          links: JSON.stringify(links),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setSaved(true);
    } catch {
      setError("Could not reach the server");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <main>
      <h1 className="text-2xl font-semibold">Band Profile</h1>
      <form onSubmit={save} className="mt-6 flex max-w-xl flex-col gap-4">
        <Field label="Band name">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            required
          />
        </Field>
        <Field label="Genre">
          <Input
            value={genre}
            onChange={(e) => {
              setGenre(e.target.value);
              setSaved(false);
            }}
          />
        </Field>
        <Field label="Home town">
          <Input
            value={homeTown}
            onChange={(e) => {
              setHomeTown(e.target.value);
              setSaved(false);
            }}
          />
        </Field>
        <Field label="Bio">
          <textarea
            className={textareaClass}
            rows={4}
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              setSaved(false);
            }}
          />
        </Field>
        <Field label="Audience notes">
          <textarea
            className={textareaClass}
            rows={2}
            value={audienceNotes}
            onChange={(e) => {
              setAudienceNotes(e.target.value);
              setSaved(false);
            }}
          />
        </Field>

        <h2 className="mt-2 text-sm font-semibold text-gray-700">Links</h2>
        {(Object.keys(EMPTY_LINKS) as (keyof LinksState)[]).map((key) => (
          <Field label={capitalize(key)} key={key}>
            <Input
              value={links[key]}
              onChange={(e) => {
                const value = e.target.value;
                setLinks((prev) => ({ ...prev, [key]: value }));
                setSaved(false);
              }}
              placeholder="https://..."
            />
          </Field>
        ))}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={saving || name.trim().length === 0}
          >
            {saving ? "Saving…" : "Save profile"}
          </Button>
          {saved && <span className="text-sm text-green-600">Saved ✓</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function safeParseLinks(raw: unknown): Partial<LinksState> {
  if (typeof raw !== "string" || raw.length === 0) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Partial<LinksState>;
    }
  } catch {
    // malformed JSON — fall through to empty
  }
  return {};
}
