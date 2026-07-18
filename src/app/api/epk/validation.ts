// Validation for the EPK document PUT (full replace: scalars + quotes + media).

export const MEDIA_KINDS = ["track", "video"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export interface EpkUpdateData {
  headline: string;
  shortBio: string;
  longBio: string;
  pressContactName: string;
  pressContactEmail: string;
  quotes: { quote: string; source: string; url: string }[];
  media: { kind: MediaKind; title: string; url: string; note: string }[];
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function isPlainObject(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}

function optionalString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseEpkUpdateInput(body: unknown): Result<EpkUpdateData> {
  if (!isPlainObject(body)) return { ok: false, error: "Request body must be a JSON object" };

  const rawQuotes = body.quotes ?? [];
  if (!Array.isArray(rawQuotes)) return { ok: false, error: "quotes must be an array" };
  const quotes: EpkUpdateData["quotes"] = [];
  for (const entry of rawQuotes) {
    if (!isPlainObject(entry) || typeof entry.quote !== "string" || entry.quote.trim() === "") {
      return { ok: false, error: "each quote needs non-empty quote text" };
    }
    quotes.push({
      quote: entry.quote,
      source: optionalString(entry.source),
      url: optionalString(entry.url),
    });
  }

  const rawMedia = body.media ?? [];
  if (!Array.isArray(rawMedia)) return { ok: false, error: "media must be an array" };
  const media: EpkUpdateData["media"] = [];
  for (const entry of rawMedia) {
    if (!isPlainObject(entry)) return { ok: false, error: "each media entry must be an object" };
    if (typeof entry.kind !== "string" || !MEDIA_KINDS.includes(entry.kind as MediaKind)) {
      return { ok: false, error: `media kind must be one of: ${MEDIA_KINDS.join(", ")}` };
    }
    if (typeof entry.title !== "string" || entry.title.trim() === "") {
      return { ok: false, error: "each media entry needs a non-empty title" };
    }
    if (typeof entry.url !== "string" || entry.url.trim() === "") {
      return { ok: false, error: "each media entry needs a non-empty url" };
    }
    media.push({
      kind: entry.kind as MediaKind,
      title: entry.title,
      url: entry.url,
      note: optionalString(entry.note),
    });
  }

  return {
    ok: true,
    value: {
      headline: optionalString(body.headline),
      shortBio: optionalString(body.shortBio),
      longBio: optionalString(body.longBio),
      pressContactName: optionalString(body.pressContactName),
      pressContactEmail: optionalString(body.pressContactEmail),
      quotes,
      media,
    },
  };
}
