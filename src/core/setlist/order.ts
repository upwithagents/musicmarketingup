import type { OrderOptions, OrderedSetlist, SetlistSong } from "./types";

// Total-order tie-break shared by every pick in this module: title asc,
// then id asc (spec §4.1 rule 2 preamble).
function byTitleThenId(a: SetlistSong, b: SetlistSong): number {
  if (a.title !== b.title) return a.title < b.title ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

// Rule 1 pool sort, also reused as the "max by (popularity, isSingle,
// energy)" ranking for encore/closer picks (rule 2, bullets 1-2).
function byPopularitySingleEnergyDesc(a: SetlistSong, b: SetlistSong): number {
  if (a.popularity !== b.popularity) return b.popularity - a.popularity;
  if (a.isSingle !== b.isSingle) return a.isSingle ? -1 : 1;
  if (a.energy !== b.energy) return b.energy - a.energy;
  return byTitleThenId(a, b);
}

function maxByPopularitySingleEnergy(songs: SetlistSong[]): SetlistSong {
  return songs.slice().sort(byPopularitySingleEnergyDesc)[0];
}

// Rule 2 breather ranking: min by (energy asc, popularity asc), tie-break
// title/id.
function byEnergyPopularityAsc(a: SetlistSong, b: SetlistSong): number {
  if (a.energy !== b.energy) return a.energy - b.energy;
  if (a.popularity !== b.popularity) return a.popularity - b.popularity;
  return byTitleThenId(a, b);
}

function minByEnergyPopularity(songs: SetlistSong[]): SetlistSong {
  return songs.slice().sort(byEnergyPopularityAsc)[0];
}

// Rule 2 opener ranking: minimize |energy - 3.5|, tie-break higher
// popularity, then title/id.
function byOpenerFit(a: SetlistSong, b: SetlistSong): number {
  const da = Math.abs(a.energy - 3.5);
  const db = Math.abs(b.energy - 3.5);
  if (da !== db) return da - db;
  if (a.popularity !== b.popularity) return b.popularity - a.popularity;
  return byTitleThenId(a, b);
}

function bestOpenerFit(songs: SetlistSong[]): SetlistSong {
  return songs.slice().sort(byOpenerFit)[0];
}

// Rule 3 "rest" sort: energy asc, tie popularity asc, then title/id.
function byEnergyThenPopularityAsc(a: SetlistSong, b: SetlistSong): number {
  if (a.energy !== b.energy) return a.energy - b.energy;
  if (a.popularity !== b.popularity) return a.popularity - b.popularity;
  return byTitleThenId(a, b);
}

export function orderSetlist(
  pool: SetlistSong[],
  opts: OrderOptions,
): OrderedSetlist {
  const warnings: string[] = [];
  const budget = opts.targetDurationSec * 1.05;

  // Rule 1: sort, then greedily select while staying within budget.
  const sortedPool = pool.slice().sort(byPopularitySingleEnergyDesc);
  const selection: SetlistSong[] = [];
  let total = 0;
  for (const candidate of sortedPool) {
    if (total + candidate.durationSec <= budget) {
      selection.push(candidate);
      total += candidate.durationSec;
    }
  }

  if (selection.length === 0) {
    return {
      main: [],
      encore: [],
      totalDurationSec: 0,
      warnings: ["no songs fit target duration"],
    };
  }
  if (selection.length === pool.length && total < opts.targetDurationSec * 0.9) {
    warnings.push("pool shorter than target duration");
  }

  // Working set for slot-picking: a copy of the selection, shrunk as each
  // slot is picked. Never touches the caller's `pool` array or its objects.
  let working = selection.slice();
  function pickAndRemove(picked: SetlistSong): void {
    working = working.filter((s) => s.id !== picked.id);
  }

  // Rule 2, slot 1: encore -- picked first, from the full selection.
  let encoreSong: SetlistSong | null = null;
  if (opts.encore !== false && selection.length >= 5) {
    const originals = working.filter((s) => !s.isCover);
    if (originals.length > 0) {
      encoreSong = maxByPopularitySingleEnergy(originals);
    } else {
      encoreSong = maxByPopularitySingleEnergy(working);
      warnings.push("cover in encore");
    }
    pickAndRemove(encoreSong);
  }

  // Rule 2, slot 2: closer -- originals energy>=4, relax to energy>=3, then
  // any original, then any (cover) with a warning.
  let closerSong: SetlistSong | null = null;
  {
    const originals = working.filter((s) => !s.isCover);
    const highEnergy = originals.filter((s) => s.energy >= 4);
    const midEnergy = originals.filter((s) => s.energy >= 3);
    if (highEnergy.length > 0) {
      closerSong = maxByPopularitySingleEnergy(highEnergy);
    } else if (midEnergy.length > 0) {
      closerSong = maxByPopularitySingleEnergy(midEnergy);
    } else if (originals.length > 0) {
      closerSong = maxByPopularitySingleEnergy(originals);
    } else if (working.length > 0) {
      closerSong = maxByPopularitySingleEnergy(working);
      warnings.push("cover forced into closer");
    }
    if (closerSong) pickAndRemove(closerSong);
  }

  // Rule 2, slot 3: opener -- originals with popularity>=2 minimizing
  // |energy-3.5|, relax to any original, then any (cover) with a warning.
  let openerSong: SetlistSong | null = null;
  {
    const originals = working.filter((s) => !s.isCover);
    const popOriginals = originals.filter((s) => s.popularity >= 2);
    if (popOriginals.length > 0) {
      openerSong = bestOpenerFit(popOriginals);
    } else if (originals.length > 0) {
      openerSong = bestOpenerFit(originals);
    } else if (working.length > 0) {
      openerSong = bestOpenerFit(working);
      warnings.push("cover forced into opener");
    }
    if (openerSong) pickAndRemove(openerSong);
  }

  // Rule 2, slot 4: breather -- skipped entirely if fewer than 3 songs
  // remain. Prefers non-singles; relax to any remaining song.
  let breatherSong: SetlistSong | null = null;
  if (working.length >= 3) {
    const nonSingles = working.filter((s) => !s.isSingle);
    breatherSong =
      nonSingles.length > 0
        ? minByEnergyPopularity(nonSingles)
        : minByEnergyPopularity(working);
    if (breatherSong.energy >= 4) {
      warnings.push("no low-energy song for a breather");
    }
    pickAndRemove(breatherSong);
  }

  // Rule 3: remaining songs sorted energy asc, split into build (first 60%,
  // rounded up) and peak (the rest, kept ascending).
  const rest = working.slice().sort(byEnergyThenPopularityAsc);
  const buildCount = Math.ceil(rest.length * 0.6);
  const build = rest.slice(0, buildCount);
  const peak = rest.slice(buildCount);

  const main: SetlistSong[] = [];
  if (openerSong) main.push(openerSong);
  main.push(...build);
  if (breatherSong) main.push(breatherSong);
  main.push(...peak);
  if (closerSong) main.push(closerSong);

  // Rule 4: variety pass. Opener/breather/closer positions are locked --
  // they can be neither the disturbed 3rd-of-a-triple nor a swap target.
  // (The brief's text only locks the swap target explicitly; leaving the
  // 3rd-of-a-triple unlocked would let the breather be swapped out of its
  // slot, silently violating the breather's own lowest-energy/no-singles
  // invariants tested elsewhere -- so both sides of a swap respect the
  // lock.)
  const lockedIndices = new Set<number>();
  if (openerSong) lockedIndices.add(main.indexOf(openerSong));
  if (breatherSong) lockedIndices.add(main.indexOf(breatherSong));
  if (closerSong) lockedIndices.add(main.indexOf(closerSong));

  for (let i = 0; i <= main.length - 3; i++) {
    const mood = main[i].mood;
    if (main[i + 1].mood !== mood || main[i + 2].mood !== mood) continue;
    if (lockedIndices.has(i + 2)) continue;
    for (let j = i + 3; j < main.length; j++) {
      if (main[j].mood !== mood && !lockedIndices.has(j)) {
        const tmp = main[i + 2];
        main[i + 2] = main[j];
        main[j] = tmp;
        break;
      }
    }
  }

  return {
    main,
    encore: encoreSong ? [encoreSong] : [],
    totalDurationSec: total,
    warnings,
  };
}
