"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Button, Select } from "@/components/ui";

interface Song {
  id: string;
  title: string;
  durationSec: number;
  energy: number;
  mood: string;
  isCover: boolean;
  isSingle: boolean;
  popularity: number;
}

interface SetlistItem {
  id: string;
  position: number;
  section: "main" | "encore";
  note: string;
  song: Song;
}

interface Setlist {
  id: string;
  name: string;
  targetDurationSec: number;
  gigId: string | null;
  items: SetlistItem[];
  warnings?: string[];
}

function formatDuration(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = Math.round(totalSec % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const ENERGY_COLORS: Record<number, string> = {
  1: "bg-blue-200",
  2: "bg-teal-200",
  3: "bg-yellow-200",
  4: "bg-orange-300",
  5: "bg-red-400",
};

export default function SetlistDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [addSongId, setAddSongId] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSetlist = useCallback(async () => {
    const res = await fetch(`/api/setlists/${id}`);
    if (!res.ok) {
      setSetlist(null);
      return;
    }
    const data = await res.json();
    setSetlist(data.setlist);
    if (Array.isArray(data.setlist?.warnings)) setWarnings(data.setlist.warnings);
  }, [id]);

  useEffect(() => {
    // state updates happen only after the fetches resolve, never synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSetlist();
    void fetch("/api/songs")
      .then((res) => res.json())
      .then((data) => setSongs(data.songs ?? []));
  }, [loadSetlist]);

  async function putOrder(order: { songId: string; section: "main" | "encore" }[]) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/setlists/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ order }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        return;
      }
      setSetlist(data.setlist);
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  function currentOrder(items: SetlistItem[]) {
    return items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((item) => ({ songId: item.song.id, section: item.section }));
  }

  async function moveItem(index: number, direction: -1 | 1) {
    if (!setlist) return;
    const items = setlist.items.slice().sort((a, b) => a.position - b.position);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    // Only reorder within the same section — crossing the encore boundary
    // is not a plain swap since it would also change which section a song is in.
    if (items[index].section !== items[targetIndex].section) return;

    const order = currentOrder(items);
    const tmp = order[index];
    order[index] = order[targetIndex];
    order[targetIndex] = tmp;
    await putOrder(order);
  }

  async function removeSong(itemId: string) {
    if (!setlist) return;
    const items = setlist.items.filter((item) => item.id !== itemId);
    await putOrder(currentOrder(items));
  }

  async function addSong() {
    if (!setlist || addSongId.length === 0) return;
    const items = setlist.items.slice().sort((a, b) => a.position - b.position);
    const order = currentOrder(items);
    // New songs join the end of the main section (before any encore items).
    const firstEncoreIndex = order.findIndex((o) => o.section === "encore");
    const newEntry = { songId: addSongId, section: "main" as const };
    if (firstEncoreIndex === -1) {
      order.push(newEntry);
    } else {
      order.splice(firstEncoreIndex, 0, newEntry);
    }
    setAddSongId("");
    await putOrder(order);
  }

  async function rerunAutoOrder() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/setlists/${id}/autoorder`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Auto-order failed");
        return;
      }
      setSetlist(data.setlist);
      setWarnings(Array.isArray(data.setlist?.warnings) ? data.setlist.warnings : []);
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  if (setlist === null) {
    return (
      <main>
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  const items = setlist.items.slice().sort((a, b) => a.position - b.position);
  const totalDurationSec = items.reduce((sum, item) => sum + item.song.durationSec, 0);
  const availableSongs = songs.filter((s) => !items.some((item) => item.song.id === s.id));
  const overBudget = totalDurationSec > setlist.targetDurationSec * 1.05;

  return (
    <main>
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-semibold">{setlist.name}</h1>
        <div className="flex gap-2">
          <Button onClick={rerunAutoOrder} disabled={busy}>
            Re-run auto-order
          </Button>
          <Button onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      <h1 className="hidden text-3xl font-semibold print:block">{setlist.name}</h1>

      {error && <p className="mt-3 text-sm text-red-600 print:hidden">{error}</p>}

      {warnings.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 print:hidden">
          <p className="text-xs font-medium uppercase text-amber-800">Ordering warnings</p>
          <ul className="mt-1 list-inside list-disc text-sm text-amber-800">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-2 text-sm text-gray-600">
        Total:{" "}
        <span className={overBudget ? "font-semibold text-red-600" : "font-semibold"}>
          {formatDuration(totalDurationSec)}
        </span>{" "}
        / target {formatDuration(setlist.targetDurationSec)}
      </p>

      {/* Energy-arc mini visualization: one colored block per song, in set order. */}
      <div className="mt-2 flex h-4 overflow-hidden rounded-md print:hidden" title="Energy arc (1=low, 5=high)">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex-1 ${ENERGY_COLORS[item.song.energy] ?? "bg-gray-200"}`}
            title={`${item.song.title} — energy ${item.song.energy}/5`}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 print:hidden">
        <Select value={addSongId} onChange={(e) => setAddSongId(e.target.value)} className="max-w-xs">
          <option value="">Add a song…</option>
          {availableSongs.map((song) => (
            <option key={song.id} value={song.id}>
              {song.title}
            </option>
          ))}
        </Select>
        <Button onClick={addSong} disabled={busy || addSongId.length === 0}>
          Add
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm print:text-lg">
          <thead className="print:hidden">
            <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Energy</th>
              <th className="py-2 pr-3">Title</th>
              <th className="py-2 pr-3">Duration</th>
              <th className="py-2 pr-3">Mood</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-gray-500">
                  No songs in this setlist yet — add one above.
                </td>
              </tr>
            )}
            {items.map((item, index) => {
              const isFirstEncore =
                item.section === "encore" && (index === 0 || items[index - 1].section === "main");
              return (
                <Fragment key={item.id}>
                  {isFirstEncore && (
                    <tr className="print:break-inside-avoid">
                      <td colSpan={6} className="py-3">
                        <div className="border-t-2 border-dashed border-gray-400 pt-2 text-center text-xs font-bold uppercase tracking-widest text-gray-500 print:text-base">
                          Encore
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-100 print:break-inside-avoid">
                    <td className="py-2 pr-3 text-gray-400">{index + 1}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-block h-3 w-3 rounded-full ${ENERGY_COLORS[item.song.energy] ?? "bg-gray-200"}`}
                        title={`energy ${item.song.energy}/5`}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <div className="font-medium">{item.song.title}</div>
                      <div className="flex gap-1 print:hidden">
                        {item.song.isCover && <Badge tone="amber">cover</Badge>}
                        {item.song.isSingle && <Badge tone="indigo">single</Badge>}
                      </div>
                    </td>
                    <td className="py-2 pr-3">{formatDuration(item.song.durationSec)}</td>
                    <td className="py-2 pr-3">{item.song.mood || "—"}</td>
                    <td className="py-2 pr-3 whitespace-nowrap print:hidden">
                      <Button onClick={() => moveItem(index, -1)} disabled={busy}>
                        ▲
                      </Button>{" "}
                      <Button onClick={() => moveItem(index, 1)} disabled={busy}>
                        ▼
                      </Button>{" "}
                      <Button variant="danger" onClick={() => removeSong(item.id)} disabled={busy}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`
        @media print {
          body { font-size: 16px; }
        }
      `}</style>
    </main>
  );
}
