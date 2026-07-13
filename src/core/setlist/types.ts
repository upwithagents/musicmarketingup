// Pure domain types for setlist ordering. No framework, no Prisma — plain
// interfaces so src/core stays independent of the DB model (spec §4.1).

export interface SetlistSong {
  id: string;
  title: string;
  durationSec: number;
  energy: number; // 1-5
  mood: string;
  isCover: boolean;
  isSingle: boolean;
  popularity: number; // 1-3
}

export interface OrderOptions {
  targetDurationSec: number;
  encore?: boolean; // default true
}

export interface OrderedSetlist {
  main: SetlistSong[];
  encore: SetlistSong[];
  totalDurationSec: number;
  warnings: string[];
}
