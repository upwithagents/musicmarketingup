import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSongUpdateInput } from "../validation";

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
  } catch {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
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
  } catch {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }
}
