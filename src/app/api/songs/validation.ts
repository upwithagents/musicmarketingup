// Shared validation for the Song API routes (POST full-create, PUT partial-update).
// Not a route file — Next only treats `route.ts`/`page.tsx`/etc. as special.

export interface SongCreateData {
  title: string;
  artist: string | null;
  isCover: boolean;
  isSingle: boolean;
  durationSec: number;
  bpm: number | null;
  key: string;
  mood: string;
  energy: number;
  popularity: number;
  vocalist: string;
  notes: string;
}

export type SongUpdateData = Partial<SongCreateData>;

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function isPlainObject(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}

function validateEnergy(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1 || value > 5) {
    return "energy must be a number between 1 and 5";
  }
  return null;
}

function validatePopularity(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1 || value > 3) {
    return "popularity must be a number between 1 and 3";
  }
  return null;
}

function validateDurationSec(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "durationSec must be a positive number";
  }
  return null;
}

/** Full validation for song creation (POST). Applies defaults for optional fields. */
export function parseSongCreateInput(body: unknown): Result<SongCreateData> {
  if (!isPlainObject(body)) return { ok: false, error: "Request body must be a JSON object" };

  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    return { ok: false, error: "title is required" };
  }

  const durationError = validateDurationSec(body.durationSec);
  if (durationError) return { ok: false, error: durationError };

  const energy = body.energy === undefined ? 3 : body.energy;
  const energyError = validateEnergy(energy);
  if (energyError) return { ok: false, error: energyError };

  const popularity = body.popularity === undefined ? 2 : body.popularity;
  const popularityError = validatePopularity(popularity);
  if (popularityError) return { ok: false, error: popularityError };

  if (body.bpm !== undefined && body.bpm !== null && typeof body.bpm !== "number") {
    return { ok: false, error: "bpm must be a number or null" };
  }

  return {
    ok: true,
    value: {
      title: body.title,
      artist: typeof body.artist === "string" && body.artist.length > 0 ? body.artist : null,
      isCover: Boolean(body.isCover),
      isSingle: Boolean(body.isSingle),
      durationSec: body.durationSec as number,
      bpm: typeof body.bpm === "number" ? body.bpm : null,
      key: typeof body.key === "string" ? body.key : "",
      mood: typeof body.mood === "string" ? body.mood : "",
      energy: energy as number,
      popularity: popularity as number,
      vocalist: typeof body.vocalist === "string" ? body.vocalist : "",
      notes: typeof body.notes === "string" ? body.notes : "",
    },
  };
}

/** Partial validation for song updates (PUT). Only present fields are validated/applied. */
export function parseSongUpdateInput(body: unknown): Result<SongUpdateData> {
  if (!isPlainObject(body)) return { ok: false, error: "Request body must be a JSON object" };

  const value: SongUpdateData = {};

  if ("title" in body) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return { ok: false, error: "title must be a non-empty string" };
    }
    value.title = body.title;
  }
  if ("artist" in body) {
    if (body.artist !== null && typeof body.artist !== "string") {
      return { ok: false, error: "artist must be a string or null" };
    }
    value.artist = body.artist === "" ? null : (body.artist as string | null);
  }
  if ("isCover" in body) value.isCover = Boolean(body.isCover);
  if ("isSingle" in body) value.isSingle = Boolean(body.isSingle);
  if ("durationSec" in body) {
    const error = validateDurationSec(body.durationSec);
    if (error) return { ok: false, error };
    value.durationSec = body.durationSec as number;
  }
  if ("bpm" in body) {
    if (body.bpm !== null && typeof body.bpm !== "number") {
      return { ok: false, error: "bpm must be a number or null" };
    }
    value.bpm = body.bpm as number | null;
  }
  if ("key" in body) {
    if (typeof body.key !== "string") return { ok: false, error: "key must be a string" };
    value.key = body.key;
  }
  if ("mood" in body) {
    if (typeof body.mood !== "string") return { ok: false, error: "mood must be a string" };
    value.mood = body.mood;
  }
  if ("energy" in body) {
    const error = validateEnergy(body.energy);
    if (error) return { ok: false, error };
    value.energy = body.energy as number;
  }
  if ("popularity" in body) {
    const error = validatePopularity(body.popularity);
    if (error) return { ok: false, error };
    value.popularity = body.popularity as number;
  }
  if ("vocalist" in body) {
    if (typeof body.vocalist !== "string") return { ok: false, error: "vocalist must be a string" };
    value.vocalist = body.vocalist;
  }
  if ("notes" in body) {
    if (typeof body.notes !== "string") return { ok: false, error: "notes must be a string" };
    value.notes = body.notes;
  }

  return { ok: true, value };
}
