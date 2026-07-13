// Shared validation for the Setlist API routes (POST create, PUT partial-update
// with optional full reorder). Not a route file — Next only treats
// `route.ts`/`page.tsx`/etc. as special.

export interface SetlistCreateData {
  name: string;
  targetDurationSec: number;
  gigId: string | null;
  songIds?: string[]; // undefined = use the whole song library
}

export interface SetlistOrderEntry {
  songId: string;
  section: "main" | "encore";
}

export interface SetlistUpdateData {
  name?: string;
  targetDurationSec?: number;
  order?: SetlistOrderEntry[];
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function isPlainObject(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}

function validateTargetDurationSec(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "targetDurationSec must be a positive number";
  }
  return null;
}

function parseOrderEntries(value: unknown): Result<SetlistOrderEntry[]> {
  if (!Array.isArray(value)) {
    return { ok: false, error: "order must be an array" };
  }
  const order: SetlistOrderEntry[] = [];
  for (const entry of value) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Record<string, unknown>).songId !== "string" ||
      ((entry as Record<string, unknown>).section !== "main" &&
        (entry as Record<string, unknown>).section !== "encore")
    ) {
      return {
        ok: false,
        error: "order entries must be { songId: string, section: 'main' | 'encore' }",
      };
    }
    order.push({
      songId: (entry as Record<string, unknown>).songId as string,
      section: (entry as Record<string, unknown>).section as "main" | "encore",
    });
  }
  return { ok: true, value: order };
}

/** Full validation for setlist creation (POST). */
export function parseSetlistCreateInput(body: unknown): Result<SetlistCreateData> {
  if (!isPlainObject(body)) return { ok: false, error: "Request body must be a JSON object" };

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return { ok: false, error: "name is required" };
  }

  const durationError = validateTargetDurationSec(body.targetDurationSec);
  if (durationError) return { ok: false, error: durationError };

  if (body.gigId !== undefined && body.gigId !== null && typeof body.gigId !== "string") {
    return { ok: false, error: "gigId must be a string or null" };
  }

  let songIds: string[] | undefined;
  if (body.songIds !== undefined) {
    if (!Array.isArray(body.songIds) || body.songIds.some((s) => typeof s !== "string")) {
      return { ok: false, error: "songIds must be an array of strings" };
    }
    songIds = body.songIds as string[];
  }

  return {
    ok: true,
    value: {
      name: body.name,
      targetDurationSec: body.targetDurationSec as number,
      gigId: typeof body.gigId === "string" && body.gigId.length > 0 ? body.gigId : null,
      songIds,
    },
  };
}

/** Partial validation for setlist updates (PUT). Only present fields are validated/applied. */
export function parseSetlistUpdateInput(body: unknown): Result<SetlistUpdateData> {
  if (!isPlainObject(body)) return { ok: false, error: "Request body must be a JSON object" };

  const value: SetlistUpdateData = {};

  if ("name" in body) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return { ok: false, error: "name must be a non-empty string" };
    }
    value.name = body.name;
  }
  if ("targetDurationSec" in body) {
    const error = validateTargetDurationSec(body.targetDurationSec);
    if (error) return { ok: false, error };
    value.targetDurationSec = body.targetDurationSec as number;
  }
  if ("order" in body) {
    const parsed = parseOrderEntries(body.order);
    if (!parsed.ok) return parsed;
    value.order = parsed.value;
  }

  return { ok: true, value };
}
