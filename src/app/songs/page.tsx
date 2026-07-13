"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Badge, Button, Input, Select } from "@/components/ui";

interface Song {
  id: string;
  title: string;
  artist: string | null;
  isCover: boolean;
  isSingle: boolean;
  durationSec: number;
  bpm: number | null;
  key: string;
  mood: string;
  energy: number;
  popularity: number;
  vocalist: string;
  notes: string;
}

interface SongFormState {
  title: string;
  artist: string;
  isCover: boolean;
  isSingle: boolean;
  duration: string; // "mm:ss"
  bpm: string;
  key: string;
  mood: string;
  energy: number;
  popularity: number;
  vocalist: string;
  notes: string;
}

const EMPTY_FORM: SongFormState = {
  title: "",
  artist: "",
  isCover: false,
  isSingle: false,
  duration: "",
  bpm: "",
  key: "",
  mood: "",
  energy: 3,
  popularity: 2,
  vocalist: "",
  notes: "",
};

function formatDuration(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Parses "mm:ss" or a plain seconds string into a positive integer, or null if invalid. */
function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  const parts = trimmed.split(":");
  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
    const total = minutes * 60 + seconds;
    return total > 0 ? Math.round(total) : null;
  }
  const total = Number(trimmed);
  return Number.isFinite(total) && total > 0 ? Math.round(total) : null;
}

function stars(energy: number): string {
  return "★".repeat(energy) + "☆".repeat(Math.max(0, 5 - energy));
}

function toFormState(song: Song): SongFormState {
  return {
    title: song.title,
    artist: song.artist ?? "",
    isCover: song.isCover,
    isSingle: song.isSingle,
    duration: formatDuration(song.durationSec),
    bpm: song.bpm !== null ? String(song.bpm) : "",
    key: song.key,
    mood: song.mood,
    energy: song.energy,
    popularity: song.popularity,
    vocalist: song.vocalist,
    notes: song.notes,
  };
}

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SongFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSongs = useCallback(async () => {
    const res = await fetch("/api/songs");
    const data = await res.json();
    setSongs(data.songs ?? []);
  }, []);

  useEffect(() => {
    // state updates happen only after the fetch resolves, never synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSongs();
  }, [loadSongs]);

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

  function startEdit(song: Song) {
    setEditingId(song.id);
    setForm(toFormState(song));
    setError(null);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  async function submitForm(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const durationSec = parseDuration(form.duration);
    if (durationSec === null) {
      setError("Duration must look like mm:ss (e.g. 3:45) and be greater than zero");
      return;
    }
    if (form.title.trim().length === 0) {
      setError("Title is required");
      return;
    }

    const payload = {
      title: form.title,
      artist: form.artist.trim().length > 0 ? form.artist : null,
      isCover: form.isCover,
      isSingle: form.isSingle,
      durationSec,
      bpm: form.bpm.trim().length > 0 ? Number(form.bpm) : null,
      key: form.key,
      mood: form.mood,
      energy: form.energy,
      popularity: form.popularity,
      vocalist: form.vocalist,
      notes: form.notes,
    };

    setBusy(true);
    try {
      const res = await fetch(
        editingId ? `/api/songs/${editingId}` : "/api/songs",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setShowForm(false);
      setEditingId(null);
      await loadSongs();
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSong(song: Song) {
    if (!window.confirm(`Delete "${song.title}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/songs/${song.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Delete failed");
        return;
      }
      await loadSongs();
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Songs</h1>
        {!showForm && <Button variant="primary" onClick={startAdd}>+ Add song</Button>}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {showForm && (
        <form
          onSubmit={submitForm}
          className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-gray-200 p-4 sm:grid-cols-4"
        >
          <label className="col-span-2 flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-gray-600">Title</span>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Artist (if cover)</span>
            <Input
              value={form.artist}
              onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Duration (mm:ss)</span>
            <Input
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              placeholder="3:45"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">BPM</span>
            <Input
              type="number"
              value={form.bpm}
              onChange={(e) => setForm((f) => ({ ...f, bpm: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Key</span>
            <Input
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Mood</span>
            <Input
              value={form.mood}
              onChange={(e) => setForm((f) => ({ ...f, mood: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Vocalist</span>
            <Input
              value={form.vocalist}
              onChange={(e) => setForm((f) => ({ ...f, vocalist: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Energy (1-5)</span>
            <Select
              value={form.energy}
              onChange={(e) => setForm((f) => ({ ...f, energy: Number(e.target.value) }))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Popularity (1-3)</span>
            <Select
              value={form.popularity}
              onChange={(e) => setForm((f) => ({ ...f, popularity: Number(e.target.value) }))}
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </label>
          <label className="col-span-2 flex items-center gap-2 sm:col-span-1">
            <input
              type="checkbox"
              checked={form.isCover}
              onChange={(e) => setForm((f) => ({ ...f, isCover: e.target.checked }))}
            />
            <span className="text-sm text-gray-700">Cover</span>
          </label>
          <label className="col-span-2 flex items-center gap-2 sm:col-span-1">
            <input
              type="checkbox"
              checked={form.isSingle}
              onChange={(e) => setForm((f) => ({ ...f, isSingle: e.target.checked }))}
            />
            <span className="text-sm text-gray-700">Single</span>
          </label>
          <label className="col-span-2 flex flex-col gap-1 sm:col-span-4">
            <span className="text-xs font-medium text-gray-600">Notes</span>
            <textarea
              className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>

          <div className="col-span-2 flex gap-2 sm:col-span-4">
            <Button type="submit" variant="primary" disabled={busy}>
              {editingId ? "Save changes" : "Add song"}
            </Button>
            <Button type="button" onClick={cancelForm} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <th className="py-2 pr-3">Title</th>
              <th className="py-2 pr-3">Duration</th>
              <th className="py-2 pr-3">BPM</th>
              <th className="py-2 pr-3">Key</th>
              <th className="py-2 pr-3">Mood</th>
              <th className="py-2 pr-3">Energy</th>
              <th className="py-2 pr-3">Popularity</th>
              <th className="py-2 pr-3">Vocalist</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {songs === null && (
              <tr>
                <td colSpan={9} className="py-4 text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {songs !== null && songs.length === 0 && (
              <tr>
                <td colSpan={9} className="py-4 text-gray-500">
                  No songs yet — add your first one above.
                </td>
              </tr>
            )}
            {songs?.map((song) => (
              <tr key={song.id} className="border-b border-gray-100">
                <td className="py-2 pr-3">
                  <div className="font-medium">{song.title}</div>
                  <div className="flex gap-1">
                    {song.isCover && <Badge tone="amber">cover</Badge>}
                    {song.isSingle && <Badge tone="indigo">single</Badge>}
                  </div>
                </td>
                <td className="py-2 pr-3">{formatDuration(song.durationSec)}</td>
                <td className="py-2 pr-3">{song.bpm ?? "—"}</td>
                <td className="py-2 pr-3">{song.key || "—"}</td>
                <td className="py-2 pr-3">{song.mood || "—"}</td>
                <td className="py-2 pr-3" title={`${song.energy}/5`}>
                  {stars(song.energy)}
                </td>
                <td className="py-2 pr-3">{song.popularity}</td>
                <td className="py-2 pr-3">{song.vocalist || "—"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  <Button onClick={() => startEdit(song)} disabled={busy}>
                    Edit
                  </Button>{" "}
                  <Button variant="danger" onClick={() => deleteSong(song)} disabled={busy}>
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
