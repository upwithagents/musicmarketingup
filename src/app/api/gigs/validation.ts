// Shared validation for the Gig API routes (POST full-create, PUT partial-update).
// Not a route file — Next only treats `route.ts`/`page.tsx`/etc. as special.

export const GIG_STATUSES = ["idea", "contacted", "confirmed", "played", "cancelled"] as const;
export type GigStatus = (typeof GIG_STATUSES)[number];

export interface GigCreateData {
  title: string;
  venue: string;
  city: string;
  date: Date;
  status: GigStatus;
  fee: string;
  contactName: string;
  contactEmail: string;
  notes: string;
}

export type GigUpdateData = Partial<GigCreateData>;

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function isPlainObject(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}

function validateStatus(value: unknown): string | null {
  if (typeof value !== "string" || !GIG_STATUSES.includes(value as GigStatus)) {
    return `status must be one of: ${GIG_STATUSES.join(", ")}`;
  }
  return null;
}

/**
 * Parses a date input into a UTC-midnight Date, returning null if unparseable.
 * Normalizing here (rather than trusting the caller to send midnight) keeps
 * gig.date — and anything anchored off it, like Campaign.anchorDate — free
 * of a time-of-day component.
 */
function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Full validation for gig creation (POST). Applies defaults for optional fields. */
export function parseGigCreateInput(body: unknown): Result<GigCreateData> {
  if (!isPlainObject(body)) return { ok: false, error: "Request body must be a JSON object" };

  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    return { ok: false, error: "title is required" };
  }

  const date = parseDate(body.date);
  if (date === null) return { ok: false, error: "date is required and must be a parseable date" };

  const status = body.status === undefined ? "idea" : body.status;
  const statusError = validateStatus(status);
  if (statusError) return { ok: false, error: statusError };

  return {
    ok: true,
    value: {
      title: body.title,
      venue: typeof body.venue === "string" ? body.venue : "",
      city: typeof body.city === "string" ? body.city : "",
      date,
      status: status as GigStatus,
      fee: typeof body.fee === "string" ? body.fee : "",
      contactName: typeof body.contactName === "string" ? body.contactName : "",
      contactEmail: typeof body.contactEmail === "string" ? body.contactEmail : "",
      notes: typeof body.notes === "string" ? body.notes : "",
    },
  };
}

/** Partial validation for gig updates (PUT). Only present fields are validated/applied. */
export function parseGigUpdateInput(body: unknown): Result<GigUpdateData> {
  if (!isPlainObject(body)) return { ok: false, error: "Request body must be a JSON object" };

  const value: GigUpdateData = {};

  if ("title" in body) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return { ok: false, error: "title must be a non-empty string" };
    }
    value.title = body.title;
  }
  if ("venue" in body) {
    if (typeof body.venue !== "string") return { ok: false, error: "venue must be a string" };
    value.venue = body.venue;
  }
  if ("city" in body) {
    if (typeof body.city !== "string") return { ok: false, error: "city must be a string" };
    value.city = body.city;
  }
  if ("date" in body) {
    const date = parseDate(body.date);
    if (date === null) return { ok: false, error: "date must be a parseable date" };
    value.date = date;
  }
  if ("status" in body) {
    const error = validateStatus(body.status);
    if (error) return { ok: false, error };
    value.status = body.status as GigStatus;
  }
  if ("fee" in body) {
    if (typeof body.fee !== "string") return { ok: false, error: "fee must be a string" };
    value.fee = body.fee;
  }
  if ("contactName" in body) {
    if (typeof body.contactName !== "string") {
      return { ok: false, error: "contactName must be a string" };
    }
    value.contactName = body.contactName;
  }
  if ("contactEmail" in body) {
    if (typeof body.contactEmail !== "string") {
      return { ok: false, error: "contactEmail must be a string" };
    }
    value.contactEmail = body.contactEmail;
  }
  if ("notes" in body) {
    if (typeof body.notes !== "string") return { ok: false, error: "notes must be a string" };
    value.notes = body.notes;
  }

  return { ok: true, value };
}
