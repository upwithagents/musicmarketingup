import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { anthropicClient, refineDraft } from "@/core/ai/refine";
import { getBandContext } from "@/lib/bandContext";

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

  const band = await getBandContext();

  try {
    const body = await refineDraft(
      { body: post.body, pillar: post.pillar, platform: post.platform, band },
      client,
    );
    return NextResponse.json({ body });
  } catch {
    return NextResponse.json(
      { error: "Draft refinement failed — check your Anthropic key/model and try again." },
      { status: 502 },
    );
  }
}
