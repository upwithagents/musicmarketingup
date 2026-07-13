// Shared helpers for the Setlist API routes: Prisma Song -> core SetlistSong
// mapping, persisted-item construction from an OrderedSetlist, and response
// serialization. Not a route file — Next only treats `route.ts`/`page.tsx`/etc.
// as special.

import type { Prisma, Song } from "@/generated/prisma/client";
import type { OrderedSetlist, SetlistSong } from "@/core/setlist/types";

/** Maps a Prisma Song row to the plain SetlistSong shape the core engine expects. */
export function songToSetlistSong(song: Song): SetlistSong {
  return {
    id: song.id,
    title: song.title,
    durationSec: song.durationSec,
    energy: song.energy,
    mood: song.mood,
    isCover: song.isCover,
    isSingle: song.isSingle,
    popularity: song.popularity,
  };
}

/**
 * Builds SetlistItem create-input rows (main first, then encore) with
 * contiguous positions starting at 1. `notesBySongId` lets callers preserve
 * existing notes across a delete+recreate rewrite (autoorder).
 */
export function itemsFromOrdered(
  setlistId: string,
  ordered: OrderedSetlist,
  notesBySongId?: Map<string, string>,
): Prisma.SetlistItemCreateManyInput[] {
  const entries = [
    ...ordered.main.map((song) => ({ song, section: "main" as const })),
    ...ordered.encore.map((song) => ({ song, section: "encore" as const })),
  ];
  return entries.map((entry, index) => ({
    setlistId,
    songId: entry.song.id,
    position: index + 1,
    section: entry.section,
    note: notesBySongId?.get(entry.song.id) ?? "",
  }));
}

type SetlistWithItems = Prisma.SetlistGetPayload<{
  include: { items: { include: { song: true } } };
}>;

/** Shapes a Prisma Setlist (with items+songs loaded) into the API's response contract. */
export function serializeSetlist(setlist: SetlistWithItems, warnings?: string[]) {
  return {
    id: setlist.id,
    name: setlist.name,
    targetDurationSec: setlist.targetDurationSec,
    gigId: setlist.gigId,
    items: setlist.items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        id: item.id,
        position: item.position,
        section: item.section,
        note: item.note,
        song: item.song,
      })),
    ...(warnings !== undefined ? { warnings } : {}),
  };
}
