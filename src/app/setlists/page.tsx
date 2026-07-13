"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button, Input, Select } from "@/components/ui";

interface SetlistSummary {
  id: string;
  name: string;
  targetDurationSec: number;
  gigId: string | null;
  itemCount: number;
  totalDurationSec: number;
}

interface Song {
  id: string;
  title: string;
  durationSec: number;
}

interface Gig {
  id: string;
  title: string;
}

function formatDuration(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function SetlistsPage() {
  const [setlists, setSetlists] = useState<SetlistSummary[] | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [targetMinutes, setTargetMinutes] = useState("60");
  const [gigId, setGigId] = useState("");
  const [useWholeLibrary, setUseWholeLibrary] = useState(true);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSetlists = useCallback(async () => {
    const res = await fetch("/api/setlists");
    const data = await res.json();
    setSetlists(data.setlists ?? []);
  }, []);

  useEffect(() => {
    // state updates happen only after the fetches resolve, never synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSetlists();
    void fetch("/api/songs")
      .then((res) => res.json())
      .then((data) => setSongs(data.songs ?? []));
    // Gigs are a future feature (no /api/gigs yet) — degrade gracefully to an
    // empty list rather than failing the page when the route 404s.
    void fetch("/api/gigs")
      .then((res) => (res.ok ? res.json() : { gigs: [] }))
      .then((data) => setGigs(data.gigs ?? []))
      .catch(() => setGigs([]));
  }, [loadSetlists]);

  function startAdd() {
    setName("");
    setTargetMinutes("60");
    setGigId("");
    setUseWholeLibrary(true);
    setSelectedSongIds(new Set());
    setError(null);
    setShowForm(true);
  }

  function toggleSong(id: string) {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitForm(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (name.trim().length === 0) {
      setError("Name is required");
      return;
    }
    const minutes = Number(targetMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setError("Target minutes must be a positive number");
      return;
    }
    if (!useWholeLibrary && selectedSongIds.size === 0) {
      setError("Select at least one song, or use the whole library");
      return;
    }

    const payload = {
      name,
      targetDurationSec: Math.round(minutes * 60),
      gigId: gigId.length > 0 ? gigId : null,
      ...(useWholeLibrary ? {} : { songIds: Array.from(selectedSongIds) }),
    };

    setBusy(true);
    try {
      const res = await fetch("/api/setlists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setShowForm(false);
      await loadSetlists();
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSetlist(setlist: SetlistSummary) {
    if (!window.confirm(`Delete "${setlist.name}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/setlists/${setlist.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Delete failed");
        return;
      }
      await loadSetlists();
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Setlists</h1>
        {!showForm && (
          <Button variant="primary" onClick={startAdd}>
            + New setlist
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
              <span className="text-xs font-medium text-gray-600">Name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Target length (minutes)</span>
              <Input
                type="number"
                min={1}
                value={targetMinutes}
                onChange={(e) => setTargetMinutes(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">Gig (optional)</span>
              <Select value={gigId} onChange={(e) => setGigId(e.target.value)}>
                <option value="">None</option>
                {gigs.map((gig) => (
                  <option key={gig.id} value={gig.id}>
                    {gig.title}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useWholeLibrary}
              onChange={(e) => setUseWholeLibrary(e.target.checked)}
            />
            <span className="text-sm text-gray-700">Use whole song library</span>
          </label>

          {!useWholeLibrary && (
            <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 p-2">
              {songs.length === 0 && (
                <p className="text-sm text-gray-500">No songs in the library yet.</p>
              )}
              {songs.map((song) => (
                <label key={song.id} className="flex items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedSongIds.has(song.id)}
                    onChange={() => toggleSong(song.id)}
                  />
                  <span>{song.title}</span>
                  <span className="text-gray-400">{formatDuration(song.durationSec)}</span>
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={busy}>
              Create setlist
            </Button>
            <Button type="button" onClick={() => setShowForm(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Target</th>
              <th className="py-2 pr-3">Songs</th>
              <th className="py-2 pr-3">Total length</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {setlists === null && (
              <tr>
                <td colSpan={5} className="py-4 text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {setlists !== null && setlists.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-gray-500">
                  No setlists yet — create one above.
                </td>
              </tr>
            )}
            {setlists?.map((setlist) => (
              <tr key={setlist.id} className="border-b border-gray-100">
                <td className="py-2 pr-3">
                  <Link href={`/setlists/${setlist.id}`} className="font-medium text-indigo-600 hover:underline">
                    {setlist.name}
                  </Link>
                </td>
                <td className="py-2 pr-3">{formatDuration(setlist.targetDurationSec)}</td>
                <td className="py-2 pr-3">{setlist.itemCount}</td>
                <td className="py-2 pr-3">{formatDuration(setlist.totalDurationSec)}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  <Button variant="danger" onClick={() => deleteSetlist(setlist)} disabled={busy}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
