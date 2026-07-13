import { prisma } from "../src/lib/db";

/** UTC-midnight date N days from today. */
function daysFromNowUTC(days: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + days,
      0,
      0,
      0,
      0,
    ),
  );
}

type SeedSong = {
  id: string;
  title: string;
  artist?: string;
  isCover?: boolean;
  isSingle?: boolean;
  durationSec: number;
  bpm?: number;
  key?: string;
  mood?: string;
  energy: number; // 1-5
  popularity?: number; // 1-3
  vocalist?: string;
  notes?: string;
};

// 12 songs spanning energies 1-5, two covers, two singles (popularity 3).
// Fixed ids so re-seeding is idempotent.
const songs: SeedSong[] = [
  {
    id: "song-neon-rain",
    title: "Neon Rain",
    isSingle: true,
    durationSec: 214,
    bpm: 128,
    key: "Am",
    mood: "driving",
    energy: 5,
    popularity: 3,
    vocalist: "Mara",
    notes: "Flagship single — set opener.",
  },
  {
    id: "song-static-hearts",
    title: "Static Hearts",
    isSingle: true,
    durationSec: 198,
    bpm: 122,
    key: "C",
    mood: "anthemic",
    energy: 5,
    popularity: 3,
    vocalist: "Mara",
    notes: "Second single, big chorus.",
  },
  {
    id: "song-glass-city",
    title: "Glass City",
    durationSec: 231,
    bpm: 118,
    key: "G",
    mood: "upbeat",
    energy: 4,
    popularity: 2,
    vocalist: "Mara",
  },
  {
    id: "song-parade",
    title: "Parade",
    durationSec: 205,
    bpm: 130,
    key: "D",
    mood: "punchy",
    energy: 4,
    popularity: 2,
    vocalist: "Jonah",
  },
  {
    id: "song-half-light",
    title: "Half Light",
    durationSec: 246,
    bpm: 112,
    key: "Em",
    mood: "warm",
    energy: 3,
    popularity: 2,
    vocalist: "Mara",
  },
  {
    id: "song-carousel",
    title: "Carousel",
    durationSec: 222,
    bpm: 108,
    key: "A",
    mood: "wistful",
    energy: 3,
    popularity: 2,
    vocalist: "Jonah",
  },
  {
    id: "song-dancing-in-the-dark",
    title: "Dancing in the Dark",
    artist: "Bruce Springsteen",
    isCover: true,
    durationSec: 240,
    bpm: 148,
    key: "B",
    mood: "energetic",
    energy: 4,
    popularity: 3,
    vocalist: "Mara",
    notes: "Crowd-favorite cover.",
  },
  {
    id: "song-just-like-heaven",
    title: "Just Like Heaven",
    artist: "The Cure",
    isCover: true,
    durationSec: 214,
    bpm: 148,
    key: "A",
    mood: "jangly",
    energy: 4,
    popularity: 2,
    vocalist: "Jonah",
    notes: "Cover — encore option.",
  },
  {
    id: "song-slow-tide",
    title: "Slow Tide",
    durationSec: 268,
    bpm: 92,
    key: "F",
    mood: "melancholic",
    energy: 2,
    popularity: 2,
    vocalist: "Mara",
  },
  {
    id: "song-paper-walls",
    title: "Paper Walls",
    durationSec: 259,
    bpm: 88,
    key: "Dm",
    mood: "brooding",
    energy: 2,
    popularity: 1,
    vocalist: "Jonah",
  },
  {
    id: "song-embers",
    title: "Embers",
    durationSec: 284,
    bpm: 72,
    key: "C",
    mood: "intimate",
    energy: 1,
    popularity: 1,
    vocalist: "Mara",
    notes: "Acoustic closer.",
  },
  {
    id: "song-quiet-hours",
    title: "Quiet Hours",
    durationSec: 297,
    bpm: 66,
    key: "G",
    mood: "ambient",
    energy: 1,
    popularity: 1,
    vocalist: "Mara",
  },
];

async function main() {
  await prisma.bandProfile.upsert({
    where: { id: "band" },
    update: {
      name: "The Midnight Placeholders",
      genre: "indie rock",
      homeTown: "Portland, OR",
      bio: "Four-piece indie rock band trading neon-lit anthems for hushed late-night ballads.",
      links: JSON.stringify({
        website: "https://midnightplaceholders.example",
        instagram: "https://instagram.com/midnightplaceholders",
        tiktok: "https://tiktok.com/@midnightplaceholders",
        youtube: "https://youtube.com/@midnightplaceholders",
        spotify:
          "https://open.spotify.com/artist/midnightplaceholders",
      }),
      audienceNotes:
        "Core fans 18-34, discover us on Reels/TikTok; strongest in the Pacific Northwest.",
    },
    create: {
      id: "band",
      name: "The Midnight Placeholders",
      genre: "indie rock",
      homeTown: "Portland, OR",
      bio: "Four-piece indie rock band trading neon-lit anthems for hushed late-night ballads.",
      links: JSON.stringify({
        website: "https://midnightplaceholders.example",
        instagram: "https://instagram.com/midnightplaceholders",
        tiktok: "https://tiktok.com/@midnightplaceholders",
        youtube: "https://youtube.com/@midnightplaceholders",
        spotify:
          "https://open.spotify.com/artist/midnightplaceholders",
      }),
      audienceNotes:
        "Core fans 18-34, discover us on Reels/TikTok; strongest in the Pacific Northwest.",
    },
  });

  for (const s of songs) {
    const data = {
      title: s.title,
      artist: s.artist ?? null,
      isCover: s.isCover ?? false,
      isSingle: s.isSingle ?? false,
      durationSec: s.durationSec,
      bpm: s.bpm ?? null,
      key: s.key ?? "",
      mood: s.mood ?? "",
      energy: s.energy,
      popularity: s.popularity ?? 2,
      vocalist: s.vocalist ?? "",
      notes: s.notes ?? "",
    };
    await prisma.song.upsert({
      where: { id: s.id },
      update: data,
      create: { id: s.id, ...data },
    });
  }

  await prisma.gig.upsert({
    where: { id: "gig-kino-club" },
    update: {
      title: "Album warm-up @ Kino Club",
      venue: "Kino Club",
      city: "Portland, OR",
      date: daysFromNowUTC(28),
      status: "confirmed",
      fee: "$400 + door split",
      contactName: "Riley Chen",
      contactEmail: "booking@kinoclub.example",
      notes: "Warm-up show ahead of the album release.",
    },
    create: {
      id: "gig-kino-club",
      title: "Album warm-up @ Kino Club",
      venue: "Kino Club",
      city: "Portland, OR",
      date: daysFromNowUTC(28),
      status: "confirmed",
      fee: "$400 + door split",
      contactName: "Riley Chen",
      contactEmail: "booking@kinoclub.example",
      notes: "Warm-up show ahead of the album release.",
    },
  });

  const [bandCount, songCount, gigCount] = await Promise.all([
    prisma.bandProfile.count(),
    prisma.song.count(),
    prisma.gig.count(),
  ]);
  console.log(
    `Seed complete: ${bandCount} band, ${songCount} songs, ${gigCount} gig.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
