import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

/** True when a Prisma error means "the record to update doesn't exist". */
function isRecordNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

const TASK_STATUSES = ["open", "done"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !TASK_STATUSES.includes((body as Record<string, unknown>).status as (typeof TASK_STATUSES)[number])
  ) {
    return NextResponse.json(
      { error: `status is required and must be one of: ${TASK_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const status = (body as Record<string, unknown>).status as (typeof TASK_STATUSES)[number];

  try {
    const task = await prisma.choreTask.update({ where: { id }, data: { status } });
    return NextResponse.json({ task });
  } catch (err) {
    if (isRecordNotFound(err)) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    throw err;
  }
}
