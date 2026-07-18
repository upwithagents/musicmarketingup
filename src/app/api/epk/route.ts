import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBandContext } from "@/lib/bandContext";
import { parseEpkUpdateInput } from "./validation";

async function epkDocument() {
  const [epk, quotes, media, photos, band] = await Promise.all([
    prisma.epk.findUnique({ where: { id: "epk" } }),
    prisma.pressQuote.findMany({ orderBy: { position: "asc" } }),
    prisma.mediaLink.findMany({ orderBy: { position: "asc" } }),
    prisma.epkPhoto.findMany({ orderBy: { position: "asc" } }),
    getBandContext(),
  ]);
  return { epk, quotes, media, photos, band };
}

export async function GET() {
  return NextResponse.json(await epkDocument());
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = parseEpkUpdateInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { quotes, media, ...scalars } = parsed.value;

  // Full-document replace: quotes/media are rewritten from array order
  // (the setlist reorder pattern) so positions stay contiguous 1..n.
  await prisma.$transaction(async (tx) => {
    await tx.epk.upsert({
      where: { id: "epk" },
      update: scalars,
      create: { id: "epk", ...scalars },
    });
    await tx.pressQuote.deleteMany();
    if (quotes.length > 0) {
      await tx.pressQuote.createMany({
        data: quotes.map((q, i) => ({ ...q, position: i + 1 })),
      });
    }
    await tx.mediaLink.deleteMany();
    if (media.length > 0) {
      await tx.mediaLink.createMany({
        data: media.map((m, i) => ({ ...m, position: i + 1 })),
      });
    }
  });

  return NextResponse.json(await epkDocument());
}
