"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Badge, Button, Input, Select } from "@/components/ui";
import { apiFetch } from "@/lib/basePath";

interface QuoteDraft {
  quote: string;
  source: string;
  url: string;
}

interface MediaDraft {
  kind: "track" | "video";
  title: string;
  url: string;
  note: string;
}

interface Photo {
  id: string;
  filename: string;
  caption: string;
}

interface EpkDoc {
  epk: {
    headline: string;
    shortBio: string;
    longBio: string;
    pressContactName: string;
    pressContactEmail: string;
  } | null;
  quotes: (QuoteDraft & { id: string })[];
  media: (MediaDraft & { id: string })[];
  photos: Photo[];
}

const EMPTY_QUOTE: QuoteDraft = { quote: "", source: "", url: "" };
const EMPTY_MEDIA: MediaDraft = { kind: "track", title: "", url: "", note: "" };

function Textarea({
  value,
  onChange,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    />
  );
}

export default function EpkPage() {
  const [loaded, setLoaded] = useState(false);
  const [headline, setHeadline] = useState("");
  const [shortBio, setShortBio] = useState("");
  const [longBio, setLongBio] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [quotes, setQuotes] = useState<QuoteDraft[]>([]);
  const [media, setMedia] = useState<MediaDraft[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const doc: EpkDoc = await (await apiFetch("/api/epk")).json();
    setHeadline(doc.epk?.headline ?? "");
    setShortBio(doc.epk?.shortBio ?? "");
    setLongBio(doc.epk?.longBio ?? "");
    setContactName(doc.epk?.pressContactName ?? "");
    setContactEmail(doc.epk?.pressContactEmail ?? "");
    setQuotes(doc.quotes.map(({ quote, source, url }) => ({ quote, source, url })));
    setMedia(doc.media.map(({ kind, title, url, note: n }) => ({ kind, title, url, note: n })));
    setPhotos(doc.photos);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setNote(null);
    try {
      const res = await apiFetch("/api/epk", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          headline,
          shortBio,
          longBio,
          pressContactName: contactName,
          pressContactEmail: contactEmail,
          quotes,
          media,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNote(data.error ?? "Save failed");
        return;
      }
      setNote("Saved");
    } catch {
      setNote("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setNote(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await apiFetch("/api/epk/photos", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setNote(data.error ?? "Upload failed");
      return;
    }
    await load();
  }

  async function deletePhoto(id: string) {
    if (!confirm("Remove this photo?")) return;
    await apiFetch(`/api/epk/photos/${id}`, { method: "DELETE" });
    await load();
  }

  if (!loaded) {
    return (
      <main>
        <h1 className="text-2xl font-semibold">Press kit</h1>
        <p className="mt-6 text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Press kit (EPK)</h1>
        <div className="flex gap-2">
          <Link
            href="/epk/preview"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-200"
          >
            Preview
          </Link>
          <Button variant="primary" onClick={save} disabled={busy}>
            Save
          </Button>
        </div>
      </div>
      {note && <p className="mt-2 text-sm text-gray-500">{note}</p>}

      <section className="mt-5 flex flex-col gap-3 rounded-md border border-gray-200 p-4">
        <h2 className="font-semibold">Story</h2>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Headline (one line)</span>
          <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Short bio (for listings)</span>
          <Textarea value={shortBio} onChange={setShortBio} rows={3} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Long bio (for features)</span>
          <Textarea value={longBio} onChange={setLongBio} rows={6} />
        </label>
      </section>

      <section className="mt-4 flex flex-col gap-3 rounded-md border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Press quotes</h2>
          <Button onClick={() => setQuotes([...quotes, { ...EMPTY_QUOTE }])}>+ Add quote</Button>
        </div>
        {quotes.length === 0 && <p className="text-sm text-gray-400">No quotes yet.</p>}
        {quotes.map((q, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-md border border-gray-100 p-3">
            <Textarea
              value={q.quote}
              onChange={(v) => setQuotes(quotes.map((x, j) => (j === i ? { ...x, quote: v } : x)))}
              rows={2}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Source (publication)"
                value={q.source}
                onChange={(e) =>
                  setQuotes(quotes.map((x, j) => (j === i ? { ...x, source: e.target.value } : x)))
                }
              />
              <Input
                placeholder="Link (optional)"
                value={q.url}
                onChange={(e) =>
                  setQuotes(quotes.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                }
              />
            </div>
            <div>
              <Button variant="danger" onClick={() => setQuotes(quotes.filter((_, j) => j !== i))}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-4 flex flex-col gap-3 rounded-md border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Featured tracks & videos</h2>
          <Button onClick={() => setMedia([...media, { ...EMPTY_MEDIA }])}>+ Add link</Button>
        </div>
        {media.length === 0 && <p className="text-sm text-gray-400">No links yet.</p>}
        {media.map((m, i) => (
          <div key={i} className="grid gap-2 rounded-md border border-gray-100 p-3 sm:grid-cols-[110px_1fr_1fr_auto]">
            <Select
              value={m.kind}
              onChange={(e) =>
                setMedia(
                  media.map((x, j) =>
                    j === i ? { ...x, kind: e.target.value as MediaDraft["kind"] } : x,
                  ),
                )
              }
            >
              <option value="track">Track</option>
              <option value="video">Video</option>
            </Select>
            <Input
              placeholder="Title"
              value={m.title}
              onChange={(e) =>
                setMedia(media.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
              }
            />
            <Input
              placeholder="URL"
              value={m.url}
              onChange={(e) =>
                setMedia(media.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
              }
            />
            <Button variant="danger" onClick={() => setMedia(media.filter((_, j) => j !== i))}>
              Remove
            </Button>
          </div>
        ))}
      </section>

      <section className="mt-4 flex flex-col gap-3 rounded-md border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Photos</h2>
          <label className="cursor-pointer rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-200">
            + Upload photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={uploadPhoto}
            />
          </label>
        </div>
        {photos.length === 0 && (
          <p className="text-sm text-gray-400">No photos yet. JPEG/PNG/WebP up to 8MB.</p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p) => (
            <figure key={p.id} className="flex flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/epk/photos/${p.id}/file`}
                alt={p.caption || "Band photo"}
                className="aspect-square w-full rounded-md object-cover"
              />
              <figcaption className="flex items-center justify-between gap-1 text-xs text-gray-500">
                <span className="truncate">{p.caption || "—"}</span>
                <button className="text-red-600 hover:underline" onClick={() => deletePhoto(p.id)}>
                  remove
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <p className="mt-4 text-xs text-gray-400">
        Genre, home town, and social links come from your{" "}
        <Link href="/profile" className="text-indigo-600 hover:underline">
          band profile
        </Link>
        . <Badge tone="gray">Tip</Badge> keep the short bio under 100 words — it&apos;s what
        bookers skim.
      </p>
    </main>
  );
}
