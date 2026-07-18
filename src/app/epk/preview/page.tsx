"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/basePath";

interface Doc {
  epk: {
    headline: string;
    shortBio: string;
    longBio: string;
    pressContactName: string;
    pressContactEmail: string;
  } | null;
  quotes: { id: string; quote: string; source: string; url: string }[];
  media: { id: string; kind: string; title: string; url: string; note: string }[];
  photos: { id: string; caption: string }[];
  band: {
    name: string;
    genre: string;
    homeTown: string;
    links: Record<string, string>;
  };
}

export default function EpkPreviewPage() {
  const [doc, setDoc] = useState<Doc | null>(null);

  const load = useCallback(async () => {
    setDoc(await (await apiFetch("/api/epk")).json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (!doc) {
    return (
      <main>
        <p className="mt-6 text-gray-500">Loading…</p>
      </main>
    );
  }

  const { epk, quotes, media, photos, band } = doc;
  const tracks = media.filter((m) => m.kind === "track");
  const videos = media.filter((m) => m.kind === "video");
  const links = Object.entries(band.links);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <main className="mx-auto max-w-3xl print:max-w-none print:text-base">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/epk" className="text-sm text-indigo-600 hover:underline">
          ← Back to editor
        </Link>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>

      <header className="border-b border-gray-200 pb-4">
        <h1 className="text-4xl font-bold">{band.name}</h1>
        {epk?.headline && <p className="mt-1 text-lg text-gray-600">{epk.headline}</p>}
        <p className="mt-2 text-sm text-gray-500">
          {[band.genre, band.homeTown].filter(Boolean).join(" · ")}
        </p>
      </header>

      {photos.length > 0 && (
        <section className="mt-5 grid grid-cols-3 gap-2">
          {photos.slice(0, 3).map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={`${basePath}/api/epk/photos/${p.id}/file`}
              alt={p.caption || `${band.name} photo`}
              className="aspect-[4/3] w-full rounded-md object-cover"
            />
          ))}
        </section>
      )}

      {epk?.shortBio && <p className="mt-5 text-base leading-relaxed">{epk.shortBio}</p>}

      {quotes.length > 0 && (
        <section className="mt-6 flex flex-col gap-3">
          {quotes.map((q) => (
            <blockquote key={q.id} className="border-l-4 border-indigo-300 pl-3">
              <p className="italic">“{q.quote}”</p>
              {q.source && (
                <cite className="text-sm text-gray-500 not-italic">
                  —{" "}
                  {q.url ? (
                    <a href={q.url} className="hover:underline">
                      {q.source}
                    </a>
                  ) : (
                    q.source
                  )}
                </cite>
              )}
            </blockquote>
          ))}
        </section>
      )}

      {(tracks.length > 0 || videos.length > 0) && (
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {tracks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Listen
              </h2>
              <ul className="mt-1 flex flex-col gap-1 text-sm">
                {tracks.map((m) => (
                  <li key={m.id}>
                    <a href={m.url} className="text-indigo-600 hover:underline">
                      {m.title}
                    </a>
                    {m.note && <span className="text-gray-400"> — {m.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {videos.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Watch
              </h2>
              <ul className="mt-1 flex flex-col gap-1 text-sm">
                {videos.map((m) => (
                  <li key={m.id}>
                    <a href={m.url} className="text-indigo-600 hover:underline">
                      {m.title}
                    </a>
                    {m.note && <span className="text-gray-400"> — {m.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {epk?.longBio && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">About</h2>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{epk.longBio}</p>
        </section>
      )}

      <footer className="mt-8 border-t border-gray-200 pt-4 text-sm">
        {(epk?.pressContactName || epk?.pressContactEmail) && (
          <p>
            <span className="font-semibold">Press contact:</span>{" "}
            {[epk.pressContactName, epk.pressContactEmail].filter(Boolean).join(" · ")}
          </p>
        )}
        {links.length > 0 && (
          <p className="mt-1 text-gray-500">
            {links.map(([label, url], i) => (
              <span key={label}>
                {i > 0 && " · "}
                <a href={url} className="hover:underline">
                  {label}
                </a>
              </span>
            ))}
          </p>
        )}
      </footer>
    </main>
  );
}
