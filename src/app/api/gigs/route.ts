import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseGigCreateInput } from "./validation";

export async function GET() {
  const gigs = await prisma.gig.findMany({ orderBy: { date: "asc" } });
  return NextResponse.json({ gigs });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = parseGigCreateInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const gig = await prisma.gig.create({ data: parsed.value });
  return NextResponse.json({ gig }, { status: 201 });
}
