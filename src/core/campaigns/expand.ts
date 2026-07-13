// Pure domain logic for deterministic campaign expansion (spec §4.2/§4.3/
// §4.4). No framework, no Prisma, no wall-clock reads — callers pass
// `today`/`start` explicitly so results stay reproducible.

import {
  ALWAYS_ON_PILLAR_ROTATION,
  GIG_PROMO_POSTS,
  GIG_PROMO_TASKS,
  RELEASE_POSTS,
  RELEASE_TASKS,
  type Pillar,
  type PostTemplate,
  type TaskTemplate,
} from "./templates";

export interface ExpandContext {
  band: string;
  venue?: string;
  city?: string;
  gigDate?: Date;
  releaseTitle?: string;
  releaseDate?: Date;
  link?: string;
}

export interface ExpandedCampaign {
  tasks: { title: string; dueDate: Date }[];
  posts: { date: Date; platform: string; pillar: Pillar; title: string; body: string }[];
}

// UTC-midnight-safe day arithmetic. Date.UTC normalizes overflowing
// month/day components itself, so month/year rollover is handled without
// ever touching local-timezone getters/setters.
export function addDays(d: Date, days: number): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days),
  );
}

function toUTCMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// spec §4.2 clamping note: any generated date before `today` collapses to
// `today` instead of being dropped — every checklist/post entry survives.
function clampToToday(date: Date, today: Date): Date {
  return date < today ? today : date;
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

// {{placeholder}} substitution for band/venue/city/gigDate/releaseTitle/
// releaseDate/link. Placeholders with no known key, or a known key whose
// value wasn't supplied, are left intact rather than replaced with "".
export function renderTemplate(text: string, ctx: ExpandContext): string {
  const values: Record<string, string | undefined> = {
    band: ctx.band,
    venue: ctx.venue,
    city: ctx.city,
    gigDate: ctx.gigDate ? formatDate(ctx.gigDate) : undefined,
    releaseTitle: ctx.releaseTitle,
    releaseDate: ctx.releaseDate ? formatDate(ctx.releaseDate) : undefined,
    link: ctx.link,
  };
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = values[key];
    return value !== undefined ? value : match;
  });
}

function expandFromTemplates(
  anchor: Date,
  today: Date,
  ctx: ExpandContext,
  tasks: readonly TaskTemplate[],
  posts: readonly PostTemplate[],
): ExpandedCampaign {
  const normalizedAnchor = toUTCMidnight(anchor);
  const normalizedToday = toUTCMidnight(today);
  return {
    tasks: tasks.map((tpl) => ({
      title: renderTemplate(tpl.title, ctx),
      dueDate: clampToToday(
        addDays(normalizedAnchor, tpl.offsetDays),
        normalizedToday,
      ),
    })),
    posts: posts.map((tpl) => ({
      date: clampToToday(
        addDays(normalizedAnchor, tpl.offsetDays),
        normalizedToday,
      ),
      platform: tpl.platform,
      pillar: tpl.pillar,
      title: renderTemplate(tpl.title, ctx),
      body: renderTemplate(tpl.body, ctx),
    })),
  };
}

export function expandGigPromo(
  anchor: Date,
  today: Date,
  ctx: ExpandContext,
): ExpandedCampaign {
  const effectiveCtx: ExpandContext = { ...ctx, gigDate: ctx.gigDate ?? anchor };
  return expandFromTemplates(
    anchor,
    today,
    effectiveCtx,
    GIG_PROMO_TASKS,
    GIG_PROMO_POSTS,
  );
}

export function expandRelease(
  anchor: Date,
  today: Date,
  ctx: ExpandContext,
): ExpandedCampaign {
  const effectiveCtx: ExpandContext = {
    ...ctx,
    releaseDate: ctx.releaseDate ?? anchor,
  };
  return expandFromTemplates(
    anchor,
    today,
    effectiveCtx,
    RELEASE_TASKS,
    RELEASE_POSTS,
  );
}

// Generic (non-template-table) prompts for the always-on rotation — one
// line per pillar, band-substituted. Distinct from GIG_PROMO_POSTS/
// RELEASE_POSTS, which encode spec-table copy verbatim.
const ALWAYS_ON_PROMPTS: Record<Pillar, string> = {
  Process: "Share a glimpse of your process — writing, rehearsal, or studio time, {{band}}.",
  Personality: "Post something that shows off {{band}}'s personality — day-in-the-life or banter.",
  Live: "Share a raw live or rehearsal performance clip from {{band}}.",
  Education: "Break down a bit of gear, technique, or songwriting for fans of {{band}}.",
  Community: "Run a Q&A, poll, or repost fan content — invite a reply, {{band}}.",
  Promotion: "Push a release/ticket/merch link for {{band}}.",
  Storytelling: "Tell the story behind one of {{band}}'s songs or lyrics.",
  Trend: "Jump on a trending sound/format with {{band}}'s own spin.",
  Snippet: "Post a 15-30s loop of {{band}}'s catchiest hook.",
  Milestone: "Share a tour vlog moment or a stream/growth milestone for {{band}}.",
};

const ALWAYS_ON_PLATFORM: Record<Pillar, string> = {
  Process: "TikTok",
  Personality: "TikTok",
  Live: "TikTok",
  Education: "Reels",
  Community: "Stories",
  Promotion: "All",
  Storytelling: "Reels",
  Trend: "TikTok",
  Snippet: "TikTok",
  Milestone: "Stories",
};

const ALWAYS_ON_WEEKDAY_OFFSETS = [0, 2, 4, 5]; // Mon, Wed, Fri, Sat (from that week's Monday)

// 4 posts/week (Mon/Wed/Fri/Sat) from the first Monday >= start. Pillars
// cycle through ALWAYS_ON_PILLAR_ROTATION, except every 5th post overall
// is forced to Promotion (the 1-in-5 rule, spec §4.4) — the rotation
// pointer only advances on non-forced slots, so no pillar is skipped.
export function expandAlwaysOn(
  start: Date,
  weeks: number,
  ctx: ExpandContext,
): ExpandedCampaign {
  const normalizedStart = toUTCMidnight(start);
  const dow = normalizedStart.getUTCDay(); // Sun=0 .. Sat=6
  const daysToMonday = (1 - dow + 7) % 7;
  const firstMonday = addDays(normalizedStart, daysToMonday);

  const posts: ExpandedCampaign["posts"] = [];
  let rotationIndex = 0;
  let postCount = 0;
  for (let week = 0; week < weeks; week++) {
    const weekStart = addDays(firstMonday, week * 7);
    for (const dayOffset of ALWAYS_ON_WEEKDAY_OFFSETS) {
      postCount += 1;
      const forcedPromotion = postCount % 5 === 0;
      const pillar: Pillar = forcedPromotion
        ? "Promotion"
        : ALWAYS_ON_PILLAR_ROTATION[rotationIndex % ALWAYS_ON_PILLAR_ROTATION.length];
      if (!forcedPromotion) rotationIndex += 1;

      posts.push({
        date: addDays(weekStart, dayOffset),
        platform: ALWAYS_ON_PLATFORM[pillar],
        pillar,
        title: renderTemplate(`${pillar} post for {{band}}`, ctx),
        body: renderTemplate(ALWAYS_ON_PROMPTS[pillar], ctx),
      });
    }
  }
  return { tasks: [], posts };
}
