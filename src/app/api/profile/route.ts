import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const profile = await prisma.bandProfile.findUnique({ where: { id: "band" } });
  return NextResponse.json({ profile });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }
  const { name, genre, homeTown, bio, links, audienceNotes } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (links !== undefined && typeof links !== "string") {
    return NextResponse.json({ error: "links must be a JSON string" }, { status: 400 });
  }

  const data = {
    name,
    genre: typeof genre === "string" ? genre : "",
    homeTown: typeof homeTown === "string" ? homeTown : "",
    bio: typeof bio === "string" ? bio : "",
    links: typeof links === "string" ? links : "{}",
    audienceNotes: typeof audienceNotes === "string" ? audienceNotes : "",
  };

  const profile = await prisma.bandProfile.upsert({
    where: { id: "band" },
    update: data,
    create: { id: "band", ...data },
  });
  return NextResponse.json({ profile });
}
