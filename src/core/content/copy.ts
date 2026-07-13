export interface BandContext {
  name: string;
  genre: string;
  homeTown: string;
  bio: string;
  audienceNotes: string;
  links: Record<string, string>;
}

export interface BandProfileInput {
  name: string;
  genre: string;
  homeTown: string;
  bio: string;
  audienceNotes: string;
  links: string;
}

/**
 * Builds a BandContext from raw profile fields, parsing the `links` JSON
 * string into a plain string map. Malformed or empty JSON falls back to
 * an empty links object rather than throwing.
 */
export function bandContextFromProfile(p: BandProfileInput): BandContext {
  return {
    name: p.name,
    genre: p.genre,
    homeTown: p.homeTown,
    bio: p.bio,
    audienceNotes: p.audienceNotes,
    links: parseLinks(p.links),
  };
}

function parseLinks(raw: string): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}
