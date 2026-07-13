import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { parseGigUpdateInput } from "../validation";

/** True when a Prisma error means "the record to update/delete doesn't exist". */
function isRecordNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const gig = await prisma.gig.findUnique({
    where: { id },
    include: {
      tasks: true,
      campaigns: { include: { posts: true } },
      setlist: true,
    },
  });
  if (!gig) {
    return NextResponse.json({ error: "Gig not found" }, { status: 404 });
  }
  return NextResponse.json({ gig });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = parseGigUpdateInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const gig = await prisma.gig.update({ where: { id }, data: parsed.value });
    return NextResponse.json({ gig });
  } catch (err) {
    if (isRecordNotFound(err)) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
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
    await prisma.gig.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (isRecordNotFound(err)) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }
    throw err;
  }
}
