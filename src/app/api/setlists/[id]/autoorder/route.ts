import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { orderSetlist } from "@/core/setlist/order";
import { itemsFromOrdered, serializeSetlist, songToSetlistSong } from "../../shared";

/** Re-runs the heuristic engine over a setlist's current songs and rewrites positions/sections. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const setlist = await prisma.setlist.findUnique({
    where: { id },
    include: { items: { include: { song: true } } },
  });
  if (!setlist) {
    return NextResponse.json({ error: "Setlist not found" }, { status: 404 });
  }

  const notesBySongId = new Map(setlist.items.map((item) => [item.songId, item.note]));
  const pool = setlist.items.map((item) => songToSetlistSong(item.song));
  const ordered = orderSetlist(pool, { targetDurationSec: setlist.targetDurationSec });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.setlistItem.deleteMany({ where: { setlistId: id } });
    const itemsData = itemsFromOrdered(id, ordered, notesBySongId);
    if (itemsData.length > 0) {
      await tx.setlistItem.createMany({ data: itemsData });
    }
    return tx.setlist.findUniqueOrThrow({
      where: { id },
      include: { items: { include: { song: true } } },
    });
  });

  return NextResponse.json({ setlist: serializeSetlist(updated, ordered.warnings) });
}
