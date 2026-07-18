// Shared validation for the Campaigns API. gig_promo campaigns are created
// only via the gig promote route, so they are rejected here.

import { parseDateInput as parseDate } from "@/lib/dates";

export const CAMPAIGN_TYPES = ["single_release", "always_on"] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export interface CampaignCreateData {
  type: CampaignType;
  name: string;
  anchorDate: Date;
  weeks: number; // only meaningful for always_on; defaulted otherwise
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const DEFAULT_ALWAYS_ON_WEEKS = 4;

function isPlainObject(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}

export function parseCampaignCreateInput(body: unknown): Result<CampaignCreateData> {
  if (!isPlainObject(body)) return { ok: false, error: "Request body must be a JSON object" };

  if (typeof body.type !== "string" || !CAMPAIGN_TYPES.includes(body.type as CampaignType)) {
    return {
      ok: false,
      error: `type must be one of: ${CAMPAIGN_TYPES.join(", ")} (gig_promo campaigns are created from a gig)`,
    };
  }
  const type = body.type as CampaignType;

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return { ok: false, error: "name is required" };
  }

  const anchorDate = parseDate(body.anchorDate);
  if (anchorDate === null) {
    return { ok: false, error: "anchorDate is required and must be a parseable date" };
  }

  let weeks = DEFAULT_ALWAYS_ON_WEEKS;
  if (type === "always_on" && body.weeks !== undefined) {
    if (
      typeof body.weeks !== "number" ||
      !Number.isInteger(body.weeks) ||
      body.weeks < 1
    ) {
      return { ok: false, error: "weeks must be a positive integer" };
    }
    weeks = body.weeks;
  }

  return { ok: true, value: { type, name: body.name, anchorDate, weeks } };
}
