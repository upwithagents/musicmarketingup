import { describe, expect, it } from "vitest";
import {
  addDays,
  expandAlwaysOn,
  expandGigPromo,
  expandRelease,
  renderTemplate,
  type ExpandContext,
  type ExpandedCampaign,
} from "@/core/campaigns/expand";
import {
  ALWAYS_ON_PILLAR_ROTATION,
  GIG_PROMO_POSTS,
  GIG_PROMO_TASKS,
  RELEASE_POSTS,
  RELEASE_TASKS,
} from "@/core/campaigns/templates";

const TODAY = new Date(Date.UTC(2026, 0, 1)); // 2026-01-01, Thursday
const BASE_CTX: ExpandContext = { band: "The Ramps" };

function assertUTCMidnight(d: Date) {
  expect(d.getUTCHours()).toBe(0);
  expect(d.getUTCMinutes()).toBe(0);
  expect(d.getUTCSeconds()).toBe(0);
  expect(d.getUTCMilliseconds()).toBe(0);
}

function assertAllUTCMidnight(campaign: ExpandedCampaign) {
  for (const task of campaign.tasks) assertUTCMidnight(task.dueDate);
  for (const post of campaign.posts) assertUTCMidnight(post.date);
}

describe("addDays", () => {
  it("is UTC-midnight safe and handles month/year rollover", () => {
    const d = addDays(new Date(Date.UTC(2026, 0, 31)), 1);
    expect(d.getTime()).toBe(Date.UTC(2026, 1, 1));
    assertUTCMidnight(d);

    const rollYear = addDays(new Date(Date.UTC(2025, 11, 31)), 1);
    expect(rollYear.getTime()).toBe(Date.UTC(2026, 0, 1));
  });

  it("supports negative offsets", () => {
    const d = addDays(new Date(Date.UTC(2026, 2, 2)), -42);
    expect(d.getTime()).toBe(Date.UTC(2026, 0, 19));
  });
});

describe("expandGigPromo — far anchor (60 days out, no clamping)", () => {
  const anchor = new Date(Date.UTC(2026, 2, 2)); // today + 60 days, Monday
  const campaign = expandGigPromo(anchor, TODAY, BASE_CTX);

  it("produces one task per template row (duplicated offsets preserved)", () => {
    expect(campaign.tasks.length).toBe(GIG_PROMO_TASKS.length);
    expect(GIG_PROMO_TASKS.length).toBe(13);
    // D-42 appears twice in the source table — both rows must survive.
    const d42Count = GIG_PROMO_TASKS.filter((t) => t.offsetDays === -42).length;
    expect(d42Count).toBe(2);
  });

  it("first D-42 task lands 42 days before the anchor", () => {
    const firstIdx = GIG_PROMO_TASKS.findIndex((t) => t.offsetDays === -42);
    expect(campaign.tasks[firstIdx].dueDate.getTime()).toBe(
      Date.UTC(2026, 0, 19),
    );
  });

  it("day-of task lands exactly on the anchor date", () => {
    const dayOfIdx = GIG_PROMO_TASKS.findIndex((t) => t.offsetDays === 0);
    expect(campaign.tasks[dayOfIdx].dueDate.getTime()).toBe(anchor.getTime());
  });

  it("recap task lands on D+1", () => {
    const recapIdx = GIG_PROMO_TASKS.findIndex((t) => t.offsetDays === 1);
    expect(campaign.tasks[recapIdx].dueDate.getTime()).toBe(
      Date.UTC(2026, 2, 3),
    );
  });

  it("every generated date is on/after today", () => {
    for (const task of campaign.tasks) {
      expect(task.dueDate.getTime()).toBeGreaterThanOrEqual(TODAY.getTime());
    }
    for (const post of campaign.posts) {
      expect(post.date.getTime()).toBeGreaterThanOrEqual(TODAY.getTime());
    }
  });

  it("posts count matches GIG_PROMO_POSTS template count (7)", () => {
    expect(campaign.posts.length).toBe(GIG_PROMO_POSTS.length);
    expect(GIG_PROMO_POSTS.length).toBe(7);
  });
});

describe("expandGigPromo — near anchor (10 days out, clamping)", () => {
  const anchor = new Date(Date.UTC(2026, 0, 11)); // today + 10 days
  const campaign = expandGigPromo(anchor, TODAY, BASE_CTX);

  it("clamps D-42..D-14 entries to today rather than dropping them", () => {
    const clampedOffsets = [-42, -35, -28, -21, -14];
    for (const offset of clampedOffsets) {
      const idx = GIG_PROMO_TASKS.findIndex((t) => t.offsetDays === offset);
      expect(campaign.tasks[idx].dueDate.getTime()).toBe(TODAY.getTime());
    }
    // still present — not dropped
    expect(campaign.tasks.length).toBe(GIG_PROMO_TASKS.length);
  });

  it("keeps D-7 onward at their true (unclamped) offsets", () => {
    const trueOffsets: Array<[number, number]> = [
      [-7, Date.UTC(2026, 0, 4)],
      [-3, Date.UTC(2026, 0, 8)],
      [-1, Date.UTC(2026, 0, 10)],
      [0, Date.UTC(2026, 0, 11)],
      [1, Date.UTC(2026, 0, 12)],
      [3, Date.UTC(2026, 0, 14)],
      [7, Date.UTC(2026, 0, 18)],
    ];
    for (const [offset, expected] of trueOffsets) {
      const idx = GIG_PROMO_TASKS.findIndex((t) => t.offsetDays === offset);
      expect(campaign.tasks[idx].dueDate.getTime()).toBe(expected);
    }
  });
});

describe("template pillar/offset encoding (brief Step 2 requirement)", () => {
  it("GIG_PROMO_POSTS matches the brief's exact offset→pillar mapping", () => {
    expect(GIG_PROMO_POSTS.map((p) => [p.offsetDays, p.pillar])).toEqual([
      [-42, "Promotion"],
      [-21, "Process"],
      [-7, "Snippet"],
      [-3, "Community"],
      [0, "Live"],
      [1, "Milestone"],
      [7, "Live"],
    ]);
  });

  it("RELEASE_POSTS matches the brief's exact offset→pillar mapping", () => {
    expect(RELEASE_POSTS.map((p) => [p.offsetDays, p.pillar])).toEqual([
      [-35, "Storytelling"],
      [-21, "Process"],
      [-14, "Snippet"],
      [-7, "Snippet"],
      [-1, "Promotion"],
      [0, "Promotion"],
      [1, "Community"],
      [7, "Live"],
    ]);
  });
});

describe("expandRelease", () => {
  const anchor = new Date(Date.UTC(2026, 2, 2)); // today + 60 days
  const ctx: ExpandContext = { band: "The Ramps", releaseTitle: "Neon Static" };
  const campaign = expandRelease(anchor, TODAY, ctx);

  it("pre-save task lands at R-28", () => {
    const idx = RELEASE_TASKS.findIndex((t) => t.offsetDays === -28);
    expect(campaign.tasks[idx].dueDate.getTime()).toBe(Date.UTC(2026, 1, 2));
  });

  it("release-day post at R-0 has {{releaseTitle}} substituted", () => {
    const idx = RELEASE_POSTS.findIndex((p) => p.offsetDays === 0);
    expect(campaign.posts[idx].date.getTime()).toBe(anchor.getTime());
    expect(campaign.posts[idx].body).toContain("Neon Static");
    expect(campaign.posts[idx].body).not.toContain("{{releaseTitle}}");
  });

  it("produces one task per RELEASE_TASKS row and one post per RELEASE_POSTS row", () => {
    expect(campaign.tasks.length).toBe(RELEASE_TASKS.length);
    expect(campaign.posts.length).toBe(RELEASE_POSTS.length);
  });
});

describe("renderTemplate", () => {
  const ctx: ExpandContext = {
    band: "The Ramps",
    venue: "The Hideout",
    city: "Chicago",
    gigDate: new Date(Date.UTC(2026, 7, 14)), // Friday
    releaseTitle: "Neon Static",
    releaseDate: new Date(Date.UTC(2026, 7, 14)),
    link: "https://example.com/tix",
  };

  it("replaces all known placeholders", () => {
    const text =
      "{{band}} at {{venue}} in {{city}} on {{gigDate}} — {{releaseTitle}} drops {{releaseDate}}. Tix: {{link}}";
    const out = renderTemplate(text, ctx);
    expect(out).toContain("The Ramps");
    expect(out).toContain("The Hideout");
    expect(out).toContain("Chicago");
    expect(out).toContain("Neon Static");
    expect(out).toContain("https://example.com/tix");
    expect(out).not.toMatch(/\{\{/);
  });

  it("leaves unknown {{x}} placeholders intact", () => {
    const out = renderTemplate("Hello {{band}}, {{unknownField}}!", ctx);
    expect(out).toContain("{{unknownField}}");
    expect(out).toContain("Hello The Ramps");
  });

  it('formats date fields like "Fri, Aug 14"', () => {
    const out = renderTemplate("{{gigDate}}", ctx);
    expect(out).toBe("Fri, Aug 14");
    const out2 = renderTemplate("{{releaseDate}}", ctx);
    expect(out2).toBe("Fri, Aug 14");
  });
});

describe("expandAlwaysOn", () => {
  const start = new Date(Date.UTC(2026, 0, 1)); // Thursday
  const campaign = expandAlwaysOn(start, 2, BASE_CTX);

  it("produces 4 posts/week for `weeks` weeks (8 for 2 weeks)", () => {
    expect(campaign.posts.length).toBe(8);
  });

  it("uses Mon/Wed/Fri/Sat cadence starting from the first Monday >= start", () => {
    const expectedDates = [
      Date.UTC(2026, 0, 5),
      Date.UTC(2026, 0, 7),
      Date.UTC(2026, 0, 9),
      Date.UTC(2026, 0, 10),
      Date.UTC(2026, 0, 12),
      Date.UTC(2026, 0, 14),
      Date.UTC(2026, 0, 16),
      Date.UTC(2026, 0, 17),
    ];
    expect(campaign.posts.map((p) => p.date.getTime())).toEqual(expectedDates);
  });

  it("forces every 5th post overall to Promotion; others follow the rotation", () => {
    const pillars = campaign.posts.map((p) => p.pillar);
    expect(pillars[4]).toBe("Promotion"); // 5th post, 0-indexed
    expect(pillars.filter((p, i) => (i + 1) % 5 === 0).every((p) => p === "Promotion")).toBe(true);
    // non-forced posts follow ALWAYS_ON_PILLAR_ROTATION in order (rotation
    // pointer only advances on non-forced slots, so no pillar is skipped)
    expect(pillars).toEqual([
      "Process",
      "Personality",
      "Live",
      "Community",
      "Promotion",
      "Storytelling",
      "Education",
      "Snippet",
    ]);
    for (const pillar of pillars) {
      if (pillar !== "Promotion") {
        expect(ALWAYS_ON_PILLAR_ROTATION).toContain(pillar);
      }
    }
  });

  it("never generates a post before `start`", () => {
    for (const post of campaign.posts) {
      expect(post.date.getTime()).toBeGreaterThanOrEqual(start.getTime());
    }
  });

  it("no post before start even when start is already a Monday", () => {
    const mondayStart = new Date(Date.UTC(2026, 0, 5)); // Monday
    const c = expandAlwaysOn(mondayStart, 1, BASE_CTX);
    expect(c.posts[0].date.getTime()).toBe(mondayStart.getTime());
    for (const post of c.posts) {
      expect(post.date.getTime()).toBeGreaterThanOrEqual(mondayStart.getTime());
    }
  });

  it("weeks=3 pins both forced Promotion slots (posts 5 and 10) and no others", () => {
    const c = expandAlwaysOn(start, 3, BASE_CTX);
    expect(c.posts.length).toBe(12);
    const pillars = c.posts.map((p) => p.pillar);
    for (let i = 0; i < pillars.length; i++) {
      if ((i + 1) % 5 === 0) {
        expect(pillars[i]).toBe("Promotion");
      } else {
        expect(pillars[i]).toBe(
          ALWAYS_ON_PILLAR_ROTATION[(i - Math.floor(i / 5)) % ALWAYS_ON_PILLAR_ROTATION.length],
        );
      }
    }
  });
});

describe("clamping", () => {
  it("clamped entries each get their own Date instance (mutating one leaves the rest intact)", () => {
    // Anchor 10 days after TODAY: every offset <= -14 clamps to TODAY.
    const anchor = new Date(TODAY.getTime());
    anchor.setUTCDate(anchor.getUTCDate() + 10);
    const c = expandGigPromo(anchor, TODAY, BASE_CTX);
    const clamped = c.tasks.filter((t) => t.dueDate.getTime() === TODAY.getTime());
    expect(clamped.length).toBeGreaterThan(1);
    expect(clamped[0].dueDate).not.toBe(clamped[1].dueDate);
    expect(clamped[0].dueDate).not.toBe(TODAY);
    clamped[0].dueDate.setUTCDate(clamped[0].dueDate.getUTCDate() + 99);
    expect(clamped[1].dueDate.getTime()).toBe(TODAY.getTime());
  });
});

describe("determinism + UTC-midnight invariant", () => {
  it("expandGigPromo is deterministic for identical inputs", () => {
    const anchor = new Date(Date.UTC(2026, 2, 2));
    const a = expandGigPromo(anchor, TODAY, BASE_CTX);
    const b = expandGigPromo(new Date(anchor.getTime()), new Date(TODAY.getTime()), { ...BASE_CTX });
    expect(a).toEqual(b);
  });

  it("expandRelease is deterministic for identical inputs", () => {
    const anchor = new Date(Date.UTC(2026, 2, 2));
    const ctx: ExpandContext = { band: "The Ramps", releaseTitle: "Neon Static" };
    const a = expandRelease(anchor, TODAY, ctx);
    const b = expandRelease(new Date(anchor.getTime()), new Date(TODAY.getTime()), { ...ctx });
    expect(a).toEqual(b);
  });

  it("expandAlwaysOn is deterministic for identical inputs", () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const a = expandAlwaysOn(start, 2, BASE_CTX);
    const b = expandAlwaysOn(new Date(start.getTime()), 2, { ...BASE_CTX });
    expect(a).toEqual(b);
  });

  it("every generated date across all expand functions is at UTC midnight", () => {
    assertAllUTCMidnight(
      expandGigPromo(new Date(Date.UTC(2026, 2, 2)), TODAY, BASE_CTX),
    );
    assertAllUTCMidnight(
      expandGigPromo(new Date(Date.UTC(2026, 0, 11)), TODAY, BASE_CTX),
    );
    assertAllUTCMidnight(
      expandRelease(new Date(Date.UTC(2026, 2, 2)), TODAY, {
        band: "The Ramps",
        releaseTitle: "Neon Static",
      }),
    );
    assertAllUTCMidnight(expandAlwaysOn(new Date(Date.UTC(2026, 0, 1)), 2, BASE_CTX));
  });
});
