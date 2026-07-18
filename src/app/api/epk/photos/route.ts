import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { prisma } from "@/lib/db";
import { ensureUploadsDir, IMAGE_EXT_BY_TYPE } from "@/lib/uploads";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "expected multipart form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  const ext = IMAGE_EXT_BY_TYPE[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: `file type must be one of: ${Object.keys(IMAGE_EXT_BY_TYPE).join(", ")}` },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file too large (max 8MB)" }, { status: 400 });
  }

  const captionEntry = form.get("caption");
  const caption = typeof captionEntry === "string" ? captionEntry : "";

  const dir = await ensureUploadsDir();
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const last = await prisma.epkPhoto.findFirst({ orderBy: { position: "desc" } });
  const photo = await prisma.epkPhoto.create({
    data: { filename, caption, position: (last?.position ?? 0) + 1 },
  });
  return NextResponse.json({ photo }, { status: 201 });
}
