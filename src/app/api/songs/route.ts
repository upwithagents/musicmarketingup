import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSongCreateInput } from "./validation";

export async function GET() {
  const songs = await prisma.song.findMany({ orderBy: { title: "asc" } });
  return NextResponse.json({ songs });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = parseSongCreateInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const song = await prisma.song.create({ data: parsed.value });
  return NextResponse.json({ song }, { status: 201 });
}
