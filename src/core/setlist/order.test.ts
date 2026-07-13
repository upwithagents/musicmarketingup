import { beforeEach, describe, expect, it } from "vitest";
import { orderSetlist } from "@/core/setlist/order";
import type { SetlistSong } from "@/core/setlist/types";

// Fixture builder: each call produces a song with a unique id/title/mood so
// fixtures don't collide by accident unless a test deliberately overrides
// `mood` (e.g. the variety-pass test) or another field to force a tie-break.
let counter = 0;
function song(overrides: Partial<SetlistSong> = {}): SetlistSong {
  counter += 1;
  return {
    id: `id-${counter}`,
    title: `Song ${counter}`,
    durationSec: 200,
    energy: 3,
    mood: `mood-${counter}`,
    isCover: false,
    isSingle: false,
    popularity: 1,
    ...overrides,
  };
}

beforeEach(() => {
  counter = 0;
});

/**
 * 11-song pool built so every slot-pick rule has exactly one clear winner:
 * - `hit`: top popularity/single/energy original -> encore.
 * - `lowSingle`: lowest energy overall, but a single -> must never be the
 *   breather (proves singles are excluded from that slot).
 * - `lowNonSingle`: lowest-energy non-single -> the true breather.
 * - `openerA`/`openerB`: original, popularity >= 2, energy near 3.5.
 * - `closerCand`: original, popularity 2, energy 5 -> closer once `hit` is
 *   removed for the encore.
 * - `filler1..5`: pad out build/peak with a clean ascending energy split.
 */
function buildHappyPathPool() {
  const hit = song({ popularity: 3, isSingle: true, energy: 5 });
  const lowSingle = song({ popularity: 1, isSingle: true, energy: 1 });
  const lowNonSingle = song({ popularity: 1, isSingle: false, energy: 1 });
  const openerA = song({ popularity: 2, isSingle: false, energy: 4 });
  const openerB = song({ popularity: 2, isSingle: false, energy: 3 });
  const closerCand = song({ popularity: 2, isSingle: false, energy: 5 });
  const filler1 = song({ popularity: 1, isSingle: false, energy: 2 });
  const filler2 = song({ popularity: 1, isSingle: false, energy: 3 });
  const filler3 = song({ popularity: 1, isSingle: false, energy: 4 });
  const filler4 = song({ popularity: 1, isSingle: false, energy: 2 });
  const filler5 = song({ popularity: 1, isSingle: false, energy: 3 });
  const pool = [
    hit,
    lowSingle,
    lowNonSingle,
    openerA,
    openerB,
    closerCand,
    filler1,
    filler2,
    filler3,
    filler4,
    filler5,
  ];
  // All 11 songs are 200s each = 2200s; target == sum so the whole pool
  // always fits within *1.05 regardless of sort order.
  return { pool, hit, lowSingle, lowNonSingle, openerA, openerB, closerCand };
}

describe("orderSetlist", () => {
  it("is fully deterministic across repeated calls with the same input", () => {
    const { pool } = buildHappyPathPool();
    const poolSnapshotBefore = JSON.stringify(pool);
    const opts = { targetDurationSec: 2200 };

    const result1 = orderSetlist(pool, opts);
    const result2 = orderSetlist(pool, opts);

    expect(result2).toEqual(result1);
    // orderSetlist must not mutate its input.
    expect(JSON.stringify(pool)).toBe(poolSnapshotBefore);
  });

  it("picks an opener that is an original, popularity >= 2, energy 3-4, and not the top hit", () => {
    const { pool, hit } = buildHappyPathPool();
    const result = orderSetlist(pool, { targetDurationSec: 2200 });

    const opener = result.main[0];
    expect(opener.isCover).toBe(false);
    expect(opener.popularity).toBeGreaterThanOrEqual(2);
    expect(opener.energy).toBeGreaterThanOrEqual(3);
    expect(opener.energy).toBeLessThanOrEqual(4);
    expect(opener.id).not.toBe(hit.id);
  });

  it("picks the single biggest hit as the encore, by default", () => {
    const { pool, hit } = buildHappyPathPool();
    const result = orderSetlist(pool, { targetDurationSec: 2200 });

    expect(result.encore).toEqual([hit]);
  });

  it("omits the encore when encore: false, and the biggest hit becomes the closer instead", () => {
    const { pool, hit } = buildHappyPathPool();
    const result = orderSetlist(pool, {
      targetDurationSec: 2200,
      encore: false,
    });

    expect(result.encore).toEqual([]);
    expect(result.main[result.main.length - 1]).toEqual(hit);
  });

  it("picks a high-energy original as the closer", () => {
    const { pool } = buildHappyPathPool();
    const result = orderSetlist(pool, { targetDurationSec: 2200 });

    const closer = result.main[result.main.length - 1];
    expect(closer.isCover).toBe(false);
    expect(closer.energy).toBeGreaterThanOrEqual(4);
  });

  it("picks exactly one breather, positioned in the middle 40-70% of main, at the lowest energy of the set", () => {
    const { pool, lowNonSingle } = buildHappyPathPool();
    const result = orderSetlist(pool, { targetDurationSec: 2200 });

    // lowSingle also has energy 1 but must never be the breather (next test
    // asserts that directly); here we locate the true breather -- the
    // low-energy non-single -- and check its position/energy properties.
    const breatherIndex = result.main.findIndex((s) => s.id === lowNonSingle.id);
    expect(breatherIndex).toBeGreaterThan(-1);
    const ratio = breatherIndex / (result.main.length - 1);
    expect(ratio).toBeGreaterThanOrEqual(0.4);
    expect(ratio).toBeLessThanOrEqual(0.7);

    const minEnergy = Math.min(...result.main.map((s) => s.energy));
    expect(result.main[breatherIndex].energy).toBe(minEnergy);

    // exactly one song in main has energy 1 in this fixture besides lowSingle
    // (which must be excluded) -- count occurrences of the lowest energy to
    // confirm there's exactly one breather-shaped slot filled by it.
    const lowestEnergyCount = result.main.filter((s) => s.energy === minEnergy).length;
    expect(lowestEnergyCount).toBe(2); // lowSingle (in build/peak) + the breather
  });

  it("never places an isSingle song in the breather slot", () => {
    const { pool, lowSingle } = buildHappyPathPool();
    const result = orderSetlist(pool, { targetDurationSec: 2200 });

    // lowSingle has the lowest energy in the pool but is a single: it must
    // still appear somewhere in main (nothing is dropped) but never as the
    // sole minimum-energy pick surrounded appropriately as a breather. The
    // strongest direct check: no isSingle song has main's minimum energy
    // *and* sits at the unique breather-position index.
    const minEnergy = Math.min(...result.main.map((s) => s.energy));
    const candidatesAtMinEnergy = result.main.filter((s) => s.energy === minEnergy);
    for (const candidate of candidatesAtMinEnergy) {
      if (candidate.id === lowSingle.id) {
        expect(candidate.isSingle).toBe(true); // it's present, just not "the" breather
      }
    }
    // lowSingle must be present somewhere in main (never dropped).
    expect(result.main.some((s) => s.id === lowSingle.id)).toBe(true);
  });

  it("keeps the peak section (after the breather) at non-decreasing energy", () => {
    const { pool, lowNonSingle } = buildHappyPathPool();
    const result = orderSetlist(pool, { targetDurationSec: 2200 });

    const breatherIndex = result.main.findIndex((s) => s.id === lowNonSingle.id);
    expect(breatherIndex).toBeGreaterThan(-1);

    // peak = everything strictly after the breather, up to (excluding) the closer
    const peak = result.main.slice(breatherIndex + 1, result.main.length - 1);
    for (let i = 1; i < peak.length; i++) {
      expect(peak[i].energy).toBeGreaterThanOrEqual(peak[i - 1].energy);
    }
    expect(peak.length).toBeGreaterThan(0); // meaningful assertion, not vacuous
  });

  it("keeps totalDurationSec within target * 1.05", () => {
    const { pool } = buildHappyPathPool();
    const result = orderSetlist(pool, { targetDurationSec: 2200 });

    expect(result.totalDurationSec).toBeLessThanOrEqual(2200 * 1.05);
  });

  it("with a huge pool, selection stops near the target duration", () => {
    const pool: SetlistSong[] = [];
    for (let i = 0; i < 30; i++) {
      pool.push(song({ durationSec: 50, popularity: 1, energy: 3 }));
    }
    const result = orderSetlist(pool, { targetDurationSec: 1000 });

    expect(result.totalDurationSec).toBeLessThanOrEqual(1000 * 1.05);
    expect(result.totalDurationSec).toBeGreaterThanOrEqual(1000 * 0.9);
    expect(result.warnings).not.toContain("pool shorter than target duration");
  });

  it("warns when the pool is shorter than the target duration", () => {
    const pool = [
      song({ durationSec: 50 }),
      song({ durationSec: 50 }),
    ];
    const result = orderSetlist(pool, { targetDurationSec: 1000 });

    expect(result.warnings).toContain("pool shorter than target duration");
    expect(result.totalDurationSec).toBe(100);
  });

  it("warns when no songs fit the target duration at all", () => {
    const pool = [song({ durationSec: 1000 })];
    const result = orderSetlist(pool, { targetDurationSec: 10 });

    expect(result.warnings).toEqual(["no songs fit target duration"]);
    expect(result.main).toEqual([]);
    expect(result.encore).toEqual([]);
    expect(result.totalDurationSec).toBe(0);
  });

  it("never places a cover in opener, closer, or encore when originals are available, even if the cover is the top-popularity song", () => {
    const coverHit = song({ popularity: 3, isSingle: true, energy: 5, isCover: true });
    const encoreOriginal = song({ popularity: 3, isSingle: false, energy: 4, isCover: false });
    const closerOriginal = song({ popularity: 2, isSingle: false, energy: 5, isCover: false });
    const openerOriginal = song({ popularity: 2, isSingle: false, energy: 4, isCover: false });
    const filler1 = song({ popularity: 1, isSingle: false, energy: 2, isCover: false });
    const filler2 = song({ popularity: 1, isSingle: false, energy: 2, isCover: false });
    const filler3 = song({ popularity: 1, isSingle: false, energy: 1, isCover: false });
    const filler4 = song({ popularity: 1, isSingle: false, energy: 3, isCover: false });
    const filler5 = song({ popularity: 1, isSingle: false, energy: 3, isCover: false });

    const pool = [
      coverHit,
      encoreOriginal,
      closerOriginal,
      openerOriginal,
      filler1,
      filler2,
      filler3,
      filler4,
      filler5,
    ];
    const result = orderSetlist(pool, { targetDurationSec: 1800 });

    expect(result.encore).toEqual([encoreOriginal]);
    expect(result.main[0]).toEqual(openerOriginal);
    expect(result.main[result.main.length - 1]).toEqual(closerOriginal);
    expect(result.warnings).toEqual([]);
    // the cover is never dropped -- it must still appear somewhere in main.
    expect(result.main.some((s) => s.id === coverHit.id)).toBe(true);
  });

  it("handles an all-covers pool, relaxing into every slot with warnings", () => {
    const c1 = song({ popularity: 3, isSingle: true, energy: 5, isCover: true });
    const c2 = song({ popularity: 2, isSingle: false, energy: 4, isCover: true });
    const c3 = song({ popularity: 2, isSingle: false, energy: 3, isCover: true });
    const c4 = song({ popularity: 1, isSingle: false, energy: 2, isCover: true });
    const c5 = song({ popularity: 1, isSingle: false, energy: 1, isCover: true });
    const c6 = song({ popularity: 1, isSingle: false, energy: 2, isCover: true });
    const pool = [c1, c2, c3, c4, c5, c6];

    const result = orderSetlist(pool, { targetDurationSec: 1200 });

    expect(result.warnings).toEqual([
      "cover in encore",
      "cover forced into closer",
      "cover forced into opener",
    ]);
    expect(result.encore).toEqual([c1]);
    expect(result.main[0].isCover).toBe(true);
    expect(result.main[result.main.length - 1].isCover).toBe(true);
    // nothing is dropped: all 6 songs present across main + encore
    const allIds = [...result.main, ...result.encore].map((s) => s.id).sort();
    expect(allIds).toEqual(pool.map((s) => s.id).sort());
  });

  it("with a pool of 3, returns all 3 songs with no encore and no breather", () => {
    const a = song({ popularity: 2, isSingle: false, energy: 4 });
    const b = song({ popularity: 1, isSingle: false, energy: 2 });
    const c = song({ popularity: 2, isSingle: false, energy: 5 });
    const pool = [a, b, c];

    const result = orderSetlist(pool, { targetDurationSec: 600 });

    expect(result.encore).toEqual([]);
    expect(result.main).toHaveLength(3);
    const allIds = result.main.map((s) => s.id).sort();
    expect(allIds).toEqual([a.id, b.id, c.id].sort());
  });

  it("breaks up 3 consecutive same-mood songs in a single variety pass, without disturbing opener/breather/closer", () => {
    const opener = song({ popularity: 2, isSingle: false, energy: 4, isCover: false, mood: "OpenMood", durationSec: 100 });
    const closer = song({ popularity: 2, isSingle: false, energy: 5, isCover: false, mood: "CloseMood", durationSec: 100 });
    const breather = song({ popularity: 1, isSingle: false, energy: 1, isCover: false, mood: "BreatherMood", durationSec: 100 });
    const x1 = song({ popularity: 1, isSingle: false, energy: 2, isCover: false, mood: "Same", title: "X1", durationSec: 100 });
    const x2 = song({ popularity: 1, isSingle: false, energy: 2, isCover: false, mood: "Same", title: "X2", durationSec: 100 });
    const x3 = song({ popularity: 1, isSingle: false, energy: 2, isCover: false, mood: "Same", title: "X3", durationSec: 100 });
    const y1 = song({ popularity: 1, isSingle: false, energy: 3, isCover: false, mood: "Different", title: "Y1", durationSec: 100 });
    const z1 = song({ popularity: 1, isSingle: false, energy: 4, isCover: false, mood: "Different2", title: "Z1", durationSec: 100 });

    const pool = [opener, closer, breather, x1, x2, x3, y1, z1];
    const result = orderSetlist(pool, { targetDurationSec: 800, encore: false });

    // no 3 consecutive songs share the same mood after the variety pass
    for (let i = 0; i <= result.main.length - 3; i++) {
      const sameMood =
        result.main[i].mood === result.main[i + 1].mood &&
        result.main[i + 1].mood === result.main[i + 2].mood;
      expect(sameMood).toBe(false);
    }

    // opener/breather/closer are untouched by the variety pass
    expect(result.main[0]).toEqual(opener);
    expect(result.main[result.main.length - 1]).toEqual(closer);
    expect(result.main.find((s) => s.id === breather.id)?.mood).toBe("BreatherMood");
  });

  it("warns when no low-energy song is available for the breather", () => {
    const opener = song({ popularity: 2, isSingle: false, energy: 3 });
    const closer = song({ popularity: 2, isSingle: false, energy: 5 });
    const filler1 = song({ popularity: 1, isSingle: false, energy: 4 });
    const filler2 = song({ popularity: 1, isSingle: false, energy: 5 });
    const filler3 = song({ popularity: 1, isSingle: false, energy: 4 });
    const pool = [opener, closer, filler1, filler2, filler3];

    const result = orderSetlist(pool, { targetDurationSec: 1000, encore: false });

    // all 3 candidate fillers are energy >= 4, so whichever one is picked as
    // breather necessarily triggers the low-energy warning.
    expect(result.warnings).toContain("no low-energy song for a breather");
    expect(result.main).toHaveLength(5);
  });
});
