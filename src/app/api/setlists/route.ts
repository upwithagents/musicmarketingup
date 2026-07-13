import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { orderSetlist } from "@/core/setlist/order";
import { parseSetlistCreateInput } from "./validation";
import { itemsFromOrdered, serializeSetlist, songToSetlistSong } from "./shared";

export async function GET() {
  const setlists = await prisma.setlist.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { include: { song: true } } },
  });
  return NextResponse.json({
    setlists: setlists.map((setlist) => ({
      id: setlist.id,
      name: setlist.name,
      targetDurationSec: setlist.targetDurationSec,
      gigId: setlist.gigId,
      itemCount: setlist.items.length,
      totalDurationSec: setlist.items.reduce((sum, item) => sum + item.song.durationSec, 0),
    })),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = parseSetlistCreateInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { name, targetDurationSec, gigId, songIds } = parsed.value;

  const songs = songIds
    ? await prisma.song.findMany({ where: { id: { in: songIds } } })
    : await prisma.song.findMany();

  const pool = songs.map(songToSetlistSong);
  const ordered = orderSetlist(pool, { targetDurationSec });

  try {
    const setlist = await prisma.$transaction(async (tx) => {
      const created = await tx.setlist.create({ data: { name, targetDurationSec, gigId } });
      const itemsData = itemsFromOrdered(created.id, ordered);
      if (itemsData.length > 0) {
        await tx.setlistItem.createMany({ data: itemsData });
      }
      return tx.setlist.findUniqueOrThrow({
        where: { id: created.id },
        include: { items: { include: { song: true } } },
      });
    });
    return NextResponse.json(
      { setlist: serializeSetlist(setlist, ordered.warnings) },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "gigId already has a setlist" }, { status: 400 });
    }
    throw err;
  }
}
