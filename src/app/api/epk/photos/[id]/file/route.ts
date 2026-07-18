import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { contentTypeForFilename, uploadsDir } from "@/lib/uploads";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const photo = await prisma.epkPhoto.findUnique({ where: { id } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const contentType = contentTypeForFilename(photo.filename);
  if (!contentType) {
    return NextResponse.json({ error: "Unsupported photo file" }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(uploadsDir(), photo.filename));
  } catch {
    return NextResponse.json({ error: "Photo file missing" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": contentType,
      "cache-control": "private, max-age=3600",
    },
  });
}
