import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { parsePostUpdateInput } from "../validation";

/** True when a Prisma error means "the record to update/delete doesn't exist". */
function isRecordNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = parsePostUpdateInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  try {
    const post = await prisma.postDraft.update({ where: { id }, data: parsed.value });
    return NextResponse.json({ post });
  } catch (err) {
    if (isRecordNotFound(err)) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    throw err;
  }
}
