import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { parseSetlistUpdateInput } from "../validation";
import { serializeSetlist } from "../shared";

/** True when a Prisma error means "the record to update/delete doesn't exist". */
function isRecordNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

export async function GET(
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
  return NextResponse.json({ setlist: serializeSetlist(setlist) });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = parseSetlistUpdateInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { name, targetDurationSec, order } = parsed.value;

  try {
    const setlist = await prisma.$transaction(async (tx) => {
      const updateData: { name?: string; targetDurationSec?: number } = {};
      if (name !== undefined) updateData.name = name;
      if (targetDurationSec !== undefined) updateData.targetDurationSec = targetDurationSec;
      if (Object.keys(updateData).length > 0) {
        await tx.setlist.update({ where: { id }, data: updateData });
      } else {
        // No scalar fields to update, but still confirm the setlist exists
        // (findUniqueOrThrow throws P2025 the same way update() would).
        await tx.setlist.findUniqueOrThrow({ where: { id } });
      }

      if (order) {
        // Full reorder rewrite: preserve per-song notes across the
        // delete+recreate, then rebuild positions 1..n from the given order.
        const existing = await tx.setlistItem.findMany({ where: { setlistId: id } });
        const notesBySongId = new Map(existing.map((item) => [item.songId, item.note]));
        await tx.setlistItem.deleteMany({ where: { setlistId: id } });
        if (order.length > 0) {
          await tx.setlistItem.createMany({
            data: order.map((entry, index) => ({
              setlistId: id,
              songId: entry.songId,
              position: index + 1,
              section: entry.section,
              note: notesBySongId.get(entry.songId) ?? "",
            })),
          });
        }
      }

      return tx.setlist.findUniqueOrThrow({
        where: { id },
        include: { items: { include: { song: true } } },
      });
    });
    return NextResponse.json({ setlist: serializeSetlist(setlist) });
  } catch (err) {
    if (isRecordNotFound(err)) {
      return NextResponse.json({ error: "Setlist not found" }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.setlist.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (isRecordNotFound(err)) {
      return NextResponse.json({ error: "Setlist not found" }, { status: 404 });
    }
    throw err;
  }
}
