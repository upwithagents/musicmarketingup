import { NextResponse } from "next/server";
import { anthropicClient } from "@/core/ai/refine";

// Static segment — Next resolves this before the sibling [id] route, so
// GET /api/posts/ai-status never falls through to /api/posts/[id].
export async function GET() {
  return NextResponse.json({ enabled: anthropicClient() !== null });
}
