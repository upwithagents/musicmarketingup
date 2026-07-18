// Shared validation for the PostDraft PATCH route. Only present fields are
// validated and applied (partial update).

import { parseDateInput as parseDate } from "@/lib/dates";

export const POST_STATUSES = ["idea", "drafted", "posted", "skipped"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export interface PostUpdateData {
  status?: PostStatus;
  body?: string;
  title?: string;
  date?: Date;
  platform?: string;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function isPlainObject(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}

export function parsePostUpdateInput(body: unknown): Result<PostUpdateData> {
  if (!isPlainObject(body)) return { ok: false, error: "Request body must be a JSON object" };

  const value: PostUpdateData = {};

  if ("status" in body) {
    if (typeof body.status !== "string" || !POST_STATUSES.includes(body.status as PostStatus)) {
      return { ok: false, error: `status must be one of: ${POST_STATUSES.join(", ")}` };
    }
    value.status = body.status as PostStatus;
  }
  if ("body" in body) {
    if (typeof body.body !== "string") return { ok: false, error: "body must be a string" };
    value.body = body.body;
  }
  if ("title" in body) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return { ok: false, error: "title must be a non-empty string" };
    }
    value.title = body.title;
  }
  if ("date" in body) {
    const date = parseDate(body.date);
    if (date === null) return { ok: false, error: "date must be a parseable date" };
    value.date = date;
  }
  if ("platform" in body) {
    if (typeof body.platform !== "string") return { ok: false, error: "platform must be a string" };
    value.platform = body.platform;
  }

  return { ok: true, value };
}
