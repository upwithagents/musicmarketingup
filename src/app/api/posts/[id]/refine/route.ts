import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { anthropicClient, refineDraft } from "@/core/ai/refine";
import { bandContextFromProfile } from "@/core/content/copy";

/** Fallback band context used when no BandProfile row exists yet. */
const FALLBACK_PROFILE = {
  name: "Your Band",
  genre: "",
  homeTown: "",
  bio: "",
  audienceNotes: "",
  links: "{}",
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = anthropicClient();
  if (client === null) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const post = await prisma.postDraft.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const profile = await prisma.bandProfile.findUnique({ where: { id: "band" } });
  const band = bandContextFromProfile(profile ?? FALLBACK_PROFILE);

  const body = await refineDraft(
    { body: post.body, pillar: post.pillar, platform: post.platform, band },
    client,
  );
  return NextResponse.json({ body });
}
