import { NextRequest, NextResponse } from "next/server";
import { rm } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { uploadsDir } from "@/lib/uploads";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const photo = await prisma.epkPhoto.findUnique({ where: { id } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }
  await prisma.epkPhoto.delete({ where: { id } });
  // Row is the source of truth; a missing file on disk is not an error.
  await rm(path.join(uploadsDir(), photo.filename), { force: true });
  return NextResponse.json({ deleted: true });
}
