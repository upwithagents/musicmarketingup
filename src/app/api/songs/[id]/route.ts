import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { parseSongUpdateInput } from "../validation";

/** True when a Prisma error means "the record to update/delete doesn't exist". */
function isRecordNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = parseSongUpdateInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  try {
    const song = await prisma.song.update({ where: { id }, data: parsed.value });
    return NextResponse.json({ song });
  } catch (err) {
    if (isRecordNotFound(err)) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
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
    await prisma.song.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (isRecordNotFound(err)) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }
    throw err;
  }
}
