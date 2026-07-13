import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { GET as profileGET, PUT as profilePUT } from "./profile/route";
import { GET as songsGET, POST as songsPOST } from "./songs/route";
import { PUT as songPUT, DELETE as songDELETE } from "./songs/[id]/route";
import { GET as setlistsGET, POST as setlistsPOST } from "./setlists/route";
import {
  GET as setlistGET,
  PUT as setlistPUT,
  DELETE as setlistDELETE,
} from "./setlists/[id]/route";
import { POST as autoorderPOST } from "./setlists/[id]/autoorder/route";
import { GET as gigsGET, POST as gigsPOST } from "./gigs/route";
import { GET as gigGET, PUT as gigPUT, DELETE as gigDELETE } from "./gigs/[id]/route";
import { POST as promotePOST } from "./gigs/[id]/promote/route";
import { PATCH as taskPATCH } from "./tasks/[id]/route";
import { GET as campaignsGET, POST as campaignsPOST } from "./campaigns/route";
import { PATCH as postPATCH } from "./posts/[id]/route";
import { POST as refinePOST } from "./posts/[id]/refine/route";
import { GET as aiStatusGET } from "./posts/ai-status/route";
import {
  GIG_PROMO_TASKS,
  GIG_PROMO_POSTS,
  RELEASE_TASKS,
  RELEASE_POSTS,
} from "@/core/campaigns/templates";

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("profile API", () => {
  it("PUT then GET roundtrip", async () => {
    const putRes = await profilePUT(
      jsonRequest("http://localhost/api/profile", "PUT", {
        name: "The Test Band",
        genre: "indie rock",
        homeTown: "Springfield",
        bio: "A band that tests things.",
        links: JSON.stringify({ website: "https://example.com" }),
        audienceNotes: "18-34, urban",
      }),
    );
    expect(putRes.status).toBe(200);
    const putBody = await putRes.json();
    expect(putBody.profile.name).toBe("The Test Band");
    expect(putBody.profile.id).toBe("band");

    const getRes = await profileGET();
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.profile.name).toBe("The Test Band");
    expect(getBody.profile.homeTown).toBe("Springfield");
    expect(getBody.profile.links).toBe(JSON.stringify({ website: "https://example.com" }));
  });

  it("PUT with missing name returns 400", async () => {
    const res = await profilePUT(
      jsonRequest("http://localhost/api/profile", "PUT", { genre: "punk" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});

describe("songs API", () => {
  it("POST -> GET includes it -> PUT changes energy -> DELETE removes", async () => {
    const postRes = await songsPOST(
      jsonRequest("http://localhost/api/songs", "POST", {
        title: "Zzz Test Song Roundtrip",
        artist: null,
        isCover: false,
        isSingle: true,
        durationSec: 210,
        bpm: 120,
        key: "A minor",
        mood: "upbeat",
        energy: 4,
        popularity: 3,
        vocalist: "Alex",
        notes: "",
      }),
    );
    expect(postRes.status).toBe(201);
    const postBody = await postRes.json();
    expect(postBody.song.title).toBe("Zzz Test Song Roundtrip");
    const id = postBody.song.id as string;

    const getRes = await songsGET();
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.songs.some((s: { id: string }) => s.id === id)).toBe(true);

    const putRes = await songPUT(
      jsonRequest(`http://localhost/api/songs/${id}`, "PUT", { energy: 2 }),
      { params: Promise.resolve({ id }) },
    );
    expect(putRes.status).toBe(200);
    const putBody = await putRes.json();
    expect(putBody.song.energy).toBe(2);

    const deleteRes = await songDELETE(
      jsonRequest(`http://localhost/api/songs/${id}`, "DELETE"),
      { params: Promise.resolve({ id }) },
    );
    expect(deleteRes.status).toBe(200);

    const getAfterDelete = await songsGET();
    const bodyAfterDelete = await getAfterDelete.json();
    expect(bodyAfterDelete.songs.some((s: { id: string }) => s.id === id)).toBe(false);
  });

  it("POST with energy 9 returns 400", async () => {
    const res = await songsPOST(
      jsonRequest("http://localhost/api/songs", "POST", {
        title: "Bad Energy Song",
        durationSec: 180,
        energy: 9,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("POST with non-positive durationSec returns 400", async () => {
    const res = await songsPOST(
      jsonRequest("http://localhost/api/songs", "POST", {
        title: "Bad Duration Song",
        durationSec: 0,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST with missing title returns 400", async () => {
    const res = await songsPOST(
      jsonRequest("http://localhost/api/songs", "POST", {
        durationSec: 180,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("PUT with out-of-range popularity returns 400", async () => {
    const postRes = await songsPOST(
      jsonRequest("http://localhost/api/songs", "POST", {
        title: "Zzz Test Song For Bad Put",
        durationSec: 150,
      }),
    );
    const postBody = await postRes.json();
    const id = postBody.song.id as string;

    const putRes = await songPUT(
      jsonRequest(`http://localhost/api/songs/${id}`, "PUT", { popularity: 7 }),
      { params: Promise.resolve({ id }) },
    );
    expect(putRes.status).toBe(400);

    // cleanup
    await songDELETE(jsonRequest(`http://localhost/api/songs/${id}`, "DELETE"), {
      params: Promise.resolve({ id }),
    });
  });

  it("DELETE of a nonexistent song returns 404", async () => {
    const res = await songDELETE(
      jsonRequest("http://localhost/api/songs/does-not-exist", "DELETE"),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(res.status).toBe(404);
  });

  it("PUT of a nonexistent song returns 404", async () => {
    const res = await songPUT(
      jsonRequest("http://localhost/api/songs/does-not-exist", "PUT", { energy: 2 }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});

describe("setlists API", () => {
  const SONG_PREFIX = "Zzz Setlist Test Song";
  const SETLIST_PREFIX = "Zzz Setlist Test";

  // Cleans up any Setlist/SetlistItem/Song rows created by these tests so
  // the suite stays order-independent (Setlist deletion cascades items;
  // deleting the fixture songs catches anything a test forgot to remove).
  afterEach(async () => {
    await prisma.setlist.deleteMany({ where: { name: { startsWith: SETLIST_PREFIX } } });
    await prisma.song.deleteMany({ where: { title: { startsWith: SONG_PREFIX } } });
  });

  /** Six songs (durationSec 200 each => 1200s total), varied enough to exercise every ordering slot. */
  async function createFixtureSongs() {
    const specs = [
      { title: `${SONG_PREFIX} A`, durationSec: 200, energy: 3, popularity: 2, isSingle: false, isCover: false, mood: "a" },
      { title: `${SONG_PREFIX} B`, durationSec: 200, energy: 5, popularity: 3, isSingle: true, isCover: false, mood: "b" },
      { title: `${SONG_PREFIX} C`, durationSec: 200, energy: 1, popularity: 1, isSingle: false, isCover: false, mood: "c" },
      { title: `${SONG_PREFIX} D`, durationSec: 200, energy: 4, popularity: 2, isSingle: false, isCover: false, mood: "d" },
      { title: `${SONG_PREFIX} E`, durationSec: 200, energy: 2, popularity: 1, isSingle: false, isCover: false, mood: "e" },
      { title: `${SONG_PREFIX} F`, durationSec: 200, energy: 3, popularity: 2, isSingle: false, isCover: true, mood: "f" },
    ];
    const songs = [];
    for (const spec of specs) {
      songs.push(await prisma.song.create({ data: spec }));
    }
    return songs;
  }

  it("POST creates an ordered setlist: contiguous positions, encore after main, warnings present", async () => {
    const songs = await createFixtureSongs();

    const res = await setlistsPOST(
      jsonRequest("http://localhost/api/setlists", "POST", {
        name: `${SETLIST_PREFIX} Ordered`,
        targetDurationSec: 1200,
        songIds: songs.map((s) => s.id),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    const items = body.setlist.items as { position: number; section: string }[];

    expect(items).toHaveLength(6);
    expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4, 5, 6]);

    // Encore items (if any) must all come after every main item.
    const lastMainIndex = items.map((i) => i.section).lastIndexOf("main");
    const firstEncoreIndex = items.map((i) => i.section).indexOf("encore");
    if (firstEncoreIndex !== -1) {
      expect(firstEncoreIndex).toBeGreaterThan(lastMainIndex);
    }
    expect(Array.isArray(body.setlist.warnings)).toBe(true);
  });

  it("PUT with an order array rewrites positions", async () => {
    const songs = await createFixtureSongs();
    const postRes = await setlistsPOST(
      jsonRequest("http://localhost/api/setlists", "POST", {
        name: `${SETLIST_PREFIX} Reorder`,
        targetDurationSec: 1200,
        songIds: songs.map((s) => s.id),
      }),
    );
    const postBody = await postRes.json();
    const id = postBody.setlist.id as string;

    // Rewrite to only 4 of the 6 songs, in a specific custom order.
    // Contract: all "main" entries must come before any "encore" entry.
    const customOrder = [
      { songId: songs[3].id, section: "main" as const },
      { songId: songs[0].id, section: "main" as const },
      { songId: songs[2].id, section: "main" as const },
      { songId: songs[1].id, section: "encore" as const },
    ];
    const putRes = await setlistPUT(
      jsonRequest(`http://localhost/api/setlists/${id}`, "PUT", { order: customOrder }),
      { params: Promise.resolve({ id }) },
    );
    expect(putRes.status).toBe(200);
    const putBody = await putRes.json();
    const items = putBody.setlist.items as { position: number; section: string; song: { id: string } }[];

    expect(items).toHaveLength(4);
    expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4]);
    expect(items.map((i) => i.song.id)).toEqual(customOrder.map((o) => o.songId));
    expect(items.map((i) => i.section)).toEqual(["main", "main", "main", "encore"]);
  });

  it("PUT with an encore item followed by a main item returns 400", async () => {
    const songs = await createFixtureSongs();
    const postRes = await setlistsPOST(
      jsonRequest("http://localhost/api/setlists", "POST", {
        name: `${SETLIST_PREFIX} Interleaved`,
        targetDurationSec: 1200,
        songIds: songs.map((s) => s.id),
      }),
    );
    const postBody = await postRes.json();
    const id = postBody.setlist.id as string;

    // Invalid: an "encore" entry followed by a "main" entry.
    const interleavedOrder = [
      { songId: songs[3].id, section: "main" as const },
      { songId: songs[0].id, section: "main" as const },
      { songId: songs[1].id, section: "encore" as const },
      { songId: songs[2].id, section: "main" as const },
    ];
    const putRes = await setlistPUT(
      jsonRequest(`http://localhost/api/setlists/${id}`, "PUT", { order: interleavedOrder }),
      { params: Promise.resolve({ id }) },
    );
    expect(putRes.status).toBe(400);
    const body = await putRes.json();
    expect(body.error).toBeTruthy();
  });

  it("PUT with a duplicate songId in the order array returns 400", async () => {
    const songs = await createFixtureSongs();
    const postRes = await setlistsPOST(
      jsonRequest("http://localhost/api/setlists", "POST", {
        name: `${SETLIST_PREFIX} DupSong`,
        targetDurationSec: 1200,
        songIds: songs.map((s) => s.id),
      }),
    );
    const postBody = await postRes.json();
    const id = postBody.setlist.id as string;

    const dupOrder = [
      { songId: songs[0].id, section: "main" as const },
      { songId: songs[0].id, section: "main" as const },
    ];
    const putRes = await setlistPUT(
      jsonRequest(`http://localhost/api/setlists/${id}`, "PUT", { order: dupOrder }),
      { params: Promise.resolve({ id }) },
    );
    expect(putRes.status).toBe(400);
    const body = await putRes.json();
    expect(body.error).toBeTruthy();
  });

  it("PUT with a nonexistent songId in the order array returns 400 (not 500)", async () => {
    const songs = await createFixtureSongs();
    const postRes = await setlistsPOST(
      jsonRequest("http://localhost/api/setlists", "POST", {
        name: `${SETLIST_PREFIX} BogusSong`,
        targetDurationSec: 1200,
        songIds: songs.map((s) => s.id),
      }),
    );
    const postBody = await postRes.json();
    const id = postBody.setlist.id as string;

    const bogusOrder = [{ songId: "does-not-exist-song", section: "main" as const }];
    const putRes = await setlistPUT(
      jsonRequest(`http://localhost/api/setlists/${id}`, "PUT", { order: bogusOrder }),
      { params: Promise.resolve({ id }) },
    );
    expect(putRes.status).toBe(400);
    const body = await putRes.json();
    expect(body.error).toBeTruthy();
  });

  it("autoorder after a manual PUT reorder restores heuristic order", async () => {
    const songs = await createFixtureSongs();
    const postRes = await setlistsPOST(
      jsonRequest("http://localhost/api/setlists", "POST", {
        name: `${SETLIST_PREFIX} Autoorder`,
        targetDurationSec: 1200,
        songIds: songs.map((s) => s.id),
      }),
    );
    const postBody = await postRes.json();
    const id = postBody.setlist.id as string;
    const canonicalSongIds = (postBody.setlist.items as { song: { id: string } }[]).map(
      (i) => i.song.id,
    );

    // Scramble the order (reverse) via PUT.
    const scrambled = songs
      .slice()
      .reverse()
      .map((s) => ({ songId: s.id, section: "main" as const }));
    const putRes = await setlistPUT(
      jsonRequest(`http://localhost/api/setlists/${id}`, "PUT", { order: scrambled }),
      { params: Promise.resolve({ id }) },
    );
    const putBody = await putRes.json();
    expect((putBody.setlist.items as unknown[]).map((_, idx) => idx + 1)).toEqual(
      (putBody.setlist.items as { position: number }[]).map((i) => i.position),
    );
    expect((putBody.setlist.items as { song: { id: string } }[]).map((i) => i.song.id)).toEqual(
      scrambled.map((o) => o.songId),
    );

    // Re-running auto-order should restore the same deterministic heuristic order.
    const autoorderRes = await autoorderPOST(
      jsonRequest(`http://localhost/api/setlists/${id}/autoorder`, "POST"),
      { params: Promise.resolve({ id }) },
    );
    expect(autoorderRes.status).toBe(200);
    const autoorderBody = await autoorderRes.json();
    const items = autoorderBody.setlist.items as { position: number; song: { id: string } }[];
    expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(items.map((i) => i.song.id)).toEqual(canonicalSongIds);
    expect(Array.isArray(autoorderBody.setlist.warnings)).toBe(true);
  });

  it("DELETE cascades: no orphan SetlistItems remain", async () => {
    const songs = await createFixtureSongs();
    const postRes = await setlistsPOST(
      jsonRequest("http://localhost/api/setlists", "POST", {
        name: `${SETLIST_PREFIX} Delete`,
        targetDurationSec: 1200,
        songIds: songs.map((s) => s.id),
      }),
    );
    const postBody = await postRes.json();
    const id = postBody.setlist.id as string;
    expect(postBody.setlist.items.length).toBeGreaterThan(0);

    const deleteRes = await setlistDELETE(
      jsonRequest(`http://localhost/api/setlists/${id}`, "DELETE"),
      { params: Promise.resolve({ id }) },
    );
    expect(deleteRes.status).toBe(200);

    const orphanItems = await prisma.setlistItem.findMany({ where: { setlistId: id } });
    expect(orphanItems).toHaveLength(0);

    const getRes = await setlistGET(jsonRequest(`http://localhost/api/setlists/${id}`, "GET"), {
      params: Promise.resolve({ id }),
    });
    expect(getRes.status).toBe(404);
  });

  it("GET list includes item counts and total durations", async () => {
    const songs = await createFixtureSongs();
    await setlistsPOST(
      jsonRequest("http://localhost/api/setlists", "POST", {
        name: `${SETLIST_PREFIX} List`,
        targetDurationSec: 1200,
        songIds: songs.map((s) => s.id),
      }),
    );

    const listRes = await setlistsGET();
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    const entry = (listBody.setlists as { name: string; itemCount: number; totalDurationSec: number }[]).find(
      (s) => s.name === `${SETLIST_PREFIX} List`,
    );
    expect(entry).toBeTruthy();
    expect(entry!.itemCount).toBeGreaterThan(0);
    expect(entry!.totalDurationSec).toBeGreaterThan(0);
  });

  it("POST with missing name returns 400", async () => {
    const res = await setlistsPOST(
      jsonRequest("http://localhost/api/setlists", "POST", { targetDurationSec: 600 }),
    );
    expect(res.status).toBe(400);
  });

  it("POST with a nonexistent gigId returns 400 (not 500)", async () => {
    const res = await setlistsPOST(
      jsonRequest("http://localhost/api/setlists", "POST", {
        name: `${SETLIST_PREFIX} BogusGig`,
        targetDurationSec: 600,
        gigId: "does-not-exist-gig",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("POST with a nonexistent songId in songIds returns 400 (not 500)", async () => {
    const songs = await createFixtureSongs();
    const res = await setlistsPOST(
      jsonRequest("http://localhost/api/setlists", "POST", {
        name: `${SETLIST_PREFIX} BogusSongId`,
        targetDurationSec: 600,
        songIds: [songs[0].id, "does-not-exist-song"],
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("PUT of a nonexistent setlist returns 404", async () => {
    const res = await setlistPUT(
      jsonRequest("http://localhost/api/setlists/does-not-exist", "PUT", { name: "X" }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(res.status).toBe(404);
  });

  it("DELETE of a nonexistent setlist returns 404", async () => {
    const res = await setlistDELETE(
      jsonRequest("http://localhost/api/setlists/does-not-exist", "DELETE"),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(res.status).toBe(404);
  });
});

describe("gigs + promote API", () => {
  const GIG_PREFIX = "Zzz Gig Test";
  const BAND_NAME = "Zzz Promo Test Band";

  // Cleans up any Gig/Campaign/PostDraft/ChoreTask rows these tests create.
  // BandProfile is reset by the shared vitest.setup.ts afterEach.
  afterEach(async () => {
    const gigs = await prisma.gig.findMany({ where: { title: { startsWith: GIG_PREFIX } } });
    const gigIds = gigs.map((g) => g.id);
    if (gigIds.length > 0) {
      const campaigns = await prisma.campaign.findMany({ where: { gigId: { in: gigIds } } });
      const campaignIds = campaigns.map((c) => c.id);
      if (campaignIds.length > 0) {
        await prisma.postDraft.deleteMany({ where: { campaignId: { in: campaignIds } } });
      }
      await prisma.choreTask.deleteMany({ where: { gigId: { in: gigIds } } });
      await prisma.campaign.deleteMany({ where: { gigId: { in: gigIds } } });
      await prisma.gig.deleteMany({ where: { id: { in: gigIds } } });
    }
  });

  function utcMidnight(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  function daysFromToday(days: number): Date {
    const today = utcMidnight(new Date());
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + days));
  }

  async function createGig(overrides: Partial<Record<string, unknown>> = {}) {
    const res = await gigsPOST(
      jsonRequest("http://localhost/api/gigs", "POST", {
        title: `${GIG_PREFIX} Roundtrip`,
        venue: "The Venue",
        city: "Springfield",
        date: daysFromToday(28).toISOString(),
        status: "confirmed",
        fee: "$200",
        contactName: "Alex Booker",
        contactEmail: "alex@example.com",
        ...overrides,
      }),
    );
    return res;
  }

  it("POST creates a gig -> GET includes it -> PUT changes status -> DELETE removes", async () => {
    const postRes = await createGig();
    expect(postRes.status).toBe(201);
    const postBody = await postRes.json();
    expect(postBody.gig.title).toBe(`${GIG_PREFIX} Roundtrip`);
    expect(postBody.gig.status).toBe("confirmed");
    const id = postBody.gig.id as string;

    const getRes = await gigGET(jsonRequest(`http://localhost/api/gigs/${id}`, "GET"), {
      params: Promise.resolve({ id }),
    });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.gig.id).toBe(id);
    expect(Array.isArray(getBody.gig.tasks)).toBe(true);
    expect(Array.isArray(getBody.gig.campaigns)).toBe(true);

    const listRes = await gigsGET();
    const listBody = await listRes.json();
    expect(listBody.gigs.some((g: { id: string }) => g.id === id)).toBe(true);

    const putRes = await gigPUT(
      jsonRequest(`http://localhost/api/gigs/${id}`, "PUT", { status: "played" }),
      { params: Promise.resolve({ id }) },
    );
    expect(putRes.status).toBe(200);
    const putBody = await putRes.json();
    expect(putBody.gig.status).toBe("played");

    const deleteRes = await gigDELETE(jsonRequest(`http://localhost/api/gigs/${id}`, "DELETE"), {
      params: Promise.resolve({ id }),
    });
    expect(deleteRes.status).toBe(200);

    const getAfterDelete = await gigGET(jsonRequest(`http://localhost/api/gigs/${id}`, "GET"), {
      params: Promise.resolve({ id }),
    });
    expect(getAfterDelete.status).toBe(404);
  });

  it("POST with an invalid status returns 400", async () => {
    const res = await gigsPOST(
      jsonRequest("http://localhost/api/gigs", "POST", {
        title: `${GIG_PREFIX} BadStatus`,
        date: daysFromToday(10).toISOString(),
        status: "maybe",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("POST with an unparseable date returns 400", async () => {
    const res = await gigsPOST(
      jsonRequest("http://localhost/api/gigs", "POST", {
        title: `${GIG_PREFIX} BadDate`,
        date: "not-a-date",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST normalizes a time-bearing date to UTC midnight", async () => {
    const res = await gigsPOST(
      jsonRequest("http://localhost/api/gigs", "POST", {
        title: `${GIG_PREFIX} TimeOfDay`,
        date: "2026-08-10T15:30:00.000Z",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.gig.date).toBe("2026-08-10T00:00:00.000Z");
  });

  it("PUT of a nonexistent gig returns 404", async () => {
    const res = await gigPUT(
      jsonRequest("http://localhost/api/gigs/does-not-exist", "PUT", { status: "played" }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(res.status).toBe(404);
  });

  it("DELETE of a nonexistent gig returns 404", async () => {
    const res = await gigDELETE(
      jsonRequest("http://localhost/api/gigs/does-not-exist", "DELETE"),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(res.status).toBe(404);
  });

  it("promote is 404 for a nonexistent gig", async () => {
    const res = await promotePOST(
      jsonRequest("http://localhost/api/gigs/does-not-exist/promote", "POST"),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(res.status).toBe(404);
  });

  it("promote creates the expected task/post counts, clamps past-offset dates to today, and substitutes venue/band into posts", async () => {
    await profilePUT(
      jsonRequest("http://localhost/api/profile", "PUT", {
        name: BAND_NAME,
        genre: "indie",
        homeTown: "Springfield",
        bio: "",
        links: "{}",
        audienceNotes: "",
      }),
    );

    // Gig is only 10 days out, so early-offset tasks (-42..-14) land before
    // today and must clamp; late-offset tasks (-7..+7) stay in the future.
    const gigDate = daysFromToday(10);
    const postRes = await createGig({
      title: `${GIG_PREFIX} Promote`,
      venue: "The Venue",
      city: "Springfield",
      date: gigDate.toISOString(),
    });
    const postBody = await postRes.json();
    const gigId = postBody.gig.id as string;

    const promoteRes = await promotePOST(
      jsonRequest(`http://localhost/api/gigs/${gigId}/promote`, "POST"),
      { params: Promise.resolve({ id: gigId }) },
    );
    expect(promoteRes.status).toBe(201);
    const promoteBody = await promoteRes.json();
    expect(promoteBody.campaignId).toBeTruthy();
    expect(promoteBody.taskCount).toBe(GIG_PROMO_TASKS.length);
    expect(promoteBody.postCount).toBe(GIG_PROMO_POSTS.length);

    const getRes = await gigGET(jsonRequest(`http://localhost/api/gigs/${gigId}`, "GET"), {
      params: Promise.resolve({ id: gigId }),
    });
    const getBody = await getRes.json();
    const tasks = getBody.gig.tasks as { title: string; dueDate: string; status: string }[];
    expect(tasks).toHaveLength(GIG_PROMO_TASKS.length);
    expect(tasks.every((t) => t.status === "open")).toBe(true);

    const today = utcMidnight(new Date());
    const clampedOffsets = GIG_PROMO_TASKS.filter((t) => t.offsetDays <= -14);
    expect(clampedOffsets.length).toBeGreaterThan(0);
    const clampedDueDates = new Set(
      tasks
        .filter((t) => clampedOffsets.some((tpl) => tpl.title === t.title))
        .map((t) => new Date(t.dueDate).toISOString()),
    );
    expect(clampedDueDates.size).toBe(1);
    expect([...clampedDueDates][0]).toBe(today.toISOString());

    const campaign = getBody.gig.campaigns.find(
      (c: { type: string }) => c.type === "gig_promo",
    );
    expect(campaign).toBeTruthy();
    expect(campaign.name).toBe(`Promo: ${GIG_PREFIX} Promote`);

    const posts = await prisma.postDraft.findMany({ where: { campaignId: campaign.id } });
    expect(posts).toHaveLength(GIG_PROMO_POSTS.length);
    const announcePost = posts.find((p) => p.title === "Announce the gig");
    expect(announcePost).toBeTruthy();
    expect(announcePost!.body).toContain("The Venue");
    expect(announcePost!.body).toContain(BAND_NAME);
    expect(announcePost!.body).toContain("Springfield");
    // {{link}} has no known value (Gig has no link field), so it's left
    // intact rather than replaced with an empty string — that's the
    // documented renderTemplate contract, not a bug.
    expect(announcePost!.body).toContain("{{link}}");
    expect(announcePost!.status).toBe("idea");
  });

  it("second promote for the same gig returns 409", async () => {
    const postRes = await createGig({ title: `${GIG_PREFIX} DoublePromote` });
    const postBody = await postRes.json();
    const gigId = postBody.gig.id as string;

    const firstRes = await promotePOST(
      jsonRequest(`http://localhost/api/gigs/${gigId}/promote`, "POST"),
      { params: Promise.resolve({ id: gigId }) },
    );
    expect(firstRes.status).toBe(201);

    const secondRes = await promotePOST(
      jsonRequest(`http://localhost/api/gigs/${gigId}/promote`, "POST"),
      { params: Promise.resolve({ id: gigId }) },
    );
    expect(secondRes.status).toBe(409);
    const secondBody = await secondRes.json();
    expect(secondBody.error).toBeTruthy();
  });

  it("task PATCH toggles status open -> done", async () => {
    const postRes = await createGig({ title: `${GIG_PREFIX} TaskToggle` });
    const postBody = await postRes.json();
    const gigId = postBody.gig.id as string;

    const promoteRes = await promotePOST(
      jsonRequest(`http://localhost/api/gigs/${gigId}/promote`, "POST"),
      { params: Promise.resolve({ id: gigId }) },
    );
    const promoteBody = await promoteRes.json();
    expect(promoteBody.taskCount).toBeGreaterThan(0);

    const getRes = await gigGET(jsonRequest(`http://localhost/api/gigs/${gigId}`, "GET"), {
      params: Promise.resolve({ id: gigId }),
    });
    const getBody = await getRes.json();
    const taskId = getBody.gig.tasks[0].id as string;
    expect(getBody.gig.tasks[0].status).toBe("open");

    const patchRes = await taskPATCH(
      jsonRequest(`http://localhost/api/tasks/${taskId}`, "PATCH", { status: "done" }),
      { params: Promise.resolve({ id: taskId }) },
    );
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.task.status).toBe("done");
  });

  it("task PATCH with an invalid status returns 400", async () => {
    const postRes = await createGig({ title: `${GIG_PREFIX} TaskBadStatus` });
    const postBody = await postRes.json();
    const gigId = postBody.gig.id as string;
    const promoteRes = await promotePOST(
      jsonRequest(`http://localhost/api/gigs/${gigId}/promote`, "POST"),
      { params: Promise.resolve({ id: gigId }) },
    );
    const promoteBody = await promoteRes.json();
    const getRes = await gigGET(jsonRequest(`http://localhost/api/gigs/${gigId}`, "GET"), {
      params: Promise.resolve({ id: gigId }),
    });
    const getBody = await getRes.json();
    const taskId = getBody.gig.tasks[0].id as string;

    const res = await taskPATCH(
      jsonRequest(`http://localhost/api/tasks/${taskId}`, "PATCH", { status: "in_progress" }),
      { params: Promise.resolve({ id: taskId }) },
    );
    expect(res.status).toBe(400);
    expect(promoteBody.campaignId).toBeTruthy();
  });

  it("task PATCH of a nonexistent task returns 404", async () => {
    const res = await taskPATCH(
      jsonRequest("http://localhost/api/tasks/does-not-exist", "PATCH", { status: "done" }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(res.status).toBe(404);
  });
});

describe("campaigns + posts API", () => {
  const CAMPAIGN_PREFIX = "Zzz Campaign Test";
  const BAND_NAME = "Zzz Campaign Test Band";

  // Cleans up any Campaign/PostDraft/ChoreTask rows these tests create
  // (dependency-ordered: posts + tasks reference campaignId, so delete them
  // before the campaigns they belong to).
  afterEach(async () => {
    const campaigns = await prisma.campaign.findMany({
      where: { name: { startsWith: CAMPAIGN_PREFIX } },
    });
    const campaignIds = campaigns.map((c) => c.id);
    if (campaignIds.length > 0) {
      await prisma.postDraft.deleteMany({ where: { campaignId: { in: campaignIds } } });
      await prisma.choreTask.deleteMany({ where: { campaignId: { in: campaignIds } } });
      await prisma.campaign.deleteMany({ where: { id: { in: campaignIds } } });
    }
  });

  function utcMidnight(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  function daysFromToday(days: number): Date {
    const today = utcMidnight(new Date());
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + days));
  }

  it("POST single_release creates R-offset posts+tasks with releaseTitle/band substituted", async () => {
    await profilePUT(
      jsonRequest("http://localhost/api/profile", "PUT", {
        name: BAND_NAME,
        genre: "indie",
        homeTown: "Springfield",
        bio: "",
        links: "{}",
        audienceNotes: "",
      }),
    );

    const releaseName = `${CAMPAIGN_PREFIX} Neon Skyline`;
    const anchor = daysFromToday(60);
    const res = await campaignsPOST(
      jsonRequest("http://localhost/api/campaigns", "POST", {
        type: "single_release",
        name: releaseName,
        anchorDate: anchor.toISOString(),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.campaignId).toBeTruthy();
    expect(body.postCount).toBe(RELEASE_POSTS.length);
    expect(body.taskCount).toBe(RELEASE_TASKS.length);

    const posts = await prisma.postDraft.findMany({ where: { campaignId: body.campaignId } });
    expect(posts).toHaveLength(RELEASE_POSTS.length);
    const releaseDayPost = posts.find((p) => p.title === "Release day");
    expect(releaseDayPost).toBeTruthy();
    expect(releaseDayPost!.body).toContain(releaseName);
    expect(releaseDayPost!.body).toContain(BAND_NAME);
    expect(releaseDayPost!.status).toBe("idea");

    const tasks = await prisma.choreTask.findMany({ where: { campaignId: body.campaignId } });
    expect(tasks).toHaveLength(RELEASE_TASKS.length);
    expect(tasks.every((t) => t.status === "open")).toBe(true);
  });

  it("POST always_on weeks=2 creates 8 posts obeying the 1-in-5 promotion rule", async () => {
    const anchor = daysFromToday(7);
    const res = await campaignsPOST(
      jsonRequest("http://localhost/api/campaigns", "POST", {
        type: "always_on",
        name: `${CAMPAIGN_PREFIX} AlwaysOn`,
        anchorDate: anchor.toISOString(),
        weeks: 2,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.postCount).toBe(8);
    expect(body.taskCount).toBe(0);

    const posts = await prisma.postDraft.findMany({
      where: { campaignId: body.campaignId },
      orderBy: { date: "asc" },
    });
    expect(posts).toHaveLength(8);
    const pillars = posts.map((p) => p.pillar);
    expect(pillars.filter((_, i) => (i + 1) % 5 === 0).every((p) => p === "Promotion")).toBe(true);
  });

  it("POST with type gig_promo returns 400 (must go via the gig promote route)", async () => {
    const res = await campaignsPOST(
      jsonRequest("http://localhost/api/campaigns", "POST", {
        type: "gig_promo",
        name: `${CAMPAIGN_PREFIX} BadType`,
        anchorDate: daysFromToday(30).toISOString(),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("POST with an unparseable anchorDate returns 400", async () => {
    const res = await campaignsPOST(
      jsonRequest("http://localhost/api/campaigns", "POST", {
        type: "single_release",
        name: `${CAMPAIGN_PREFIX} BadDate`,
        anchorDate: "not-a-date",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST always_on with a non-positive weeks returns 400", async () => {
    const res = await campaignsPOST(
      jsonRequest("http://localhost/api/campaigns", "POST", {
        type: "always_on",
        name: `${CAMPAIGN_PREFIX} BadWeeks`,
        anchorDate: daysFromToday(7).toISOString(),
        weeks: 0,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("GET lists campaigns with their posts and tasks", async () => {
    const res = await campaignsPOST(
      jsonRequest("http://localhost/api/campaigns", "POST", {
        type: "single_release",
        name: `${CAMPAIGN_PREFIX} List`,
        anchorDate: daysFromToday(60).toISOString(),
      }),
    );
    const body = await res.json();

    const listRes = await campaignsGET();
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    const entry = (listBody.campaigns as { id: string; posts: unknown[]; tasks: unknown[] }[]).find(
      (c) => c.id === body.campaignId,
    );
    expect(entry).toBeTruthy();
    expect(entry!.posts).toHaveLength(RELEASE_POSTS.length);
    expect(entry!.tasks).toHaveLength(RELEASE_TASKS.length);
  });

  it("PATCH post updates body and status", async () => {
    const res = await campaignsPOST(
      jsonRequest("http://localhost/api/campaigns", "POST", {
        type: "single_release",
        name: `${CAMPAIGN_PREFIX} PatchPost`,
        anchorDate: daysFromToday(60).toISOString(),
      }),
    );
    const body = await res.json();
    const posts = await prisma.postDraft.findMany({ where: { campaignId: body.campaignId } });
    const postId = posts[0].id;

    const patchRes = await postPATCH(
      jsonRequest(`http://localhost/api/posts/${postId}`, "PATCH", {
        body: "Edited draft text",
        status: "drafted",
      }),
      { params: Promise.resolve({ id: postId }) },
    );
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.post.body).toBe("Edited draft text");
    expect(patchBody.post.status).toBe("drafted");
  });

  it("PATCH post with an invalid status returns 400", async () => {
    const res = await campaignsPOST(
      jsonRequest("http://localhost/api/campaigns", "POST", {
        type: "single_release",
        name: `${CAMPAIGN_PREFIX} PatchBadStatus`,
        anchorDate: daysFromToday(60).toISOString(),
      }),
    );
    const body = await res.json();
    const posts = await prisma.postDraft.findMany({ where: { campaignId: body.campaignId } });
    const postId = posts[0].id;

    const patchRes = await postPATCH(
      jsonRequest(`http://localhost/api/posts/${postId}`, "PATCH", { status: "published" }),
      { params: Promise.resolve({ id: postId }) },
    );
    expect(patchRes.status).toBe(400);
  });

  it("PATCH of a nonexistent post returns 404", async () => {
    const res = await postPATCH(
      jsonRequest("http://localhost/api/posts/does-not-exist", "PATCH", { status: "drafted" }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(res.status).toBe(404);
  });

  describe("AI refine (no network — ANTHROPIC_API_KEY forced unset)", () => {
    const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY;

    afterEach(() => {
      if (ORIGINAL_KEY === undefined) {
        delete process.env.ANTHROPIC_API_KEY;
      } else {
        process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY;
      }
    });

    it("GET /api/posts/ai-status returns {enabled:false} when no key is configured", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const res = await aiStatusGET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ enabled: false });
    });

    it("POST refine returns 503 without hitting the network when no key is configured", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const res = await refinePOST(
        jsonRequest("http://localhost/api/posts/does-not-exist/refine", "POST"),
        { params: Promise.resolve({ id: "does-not-exist" }) },
      );
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toBe("ANTHROPIC_API_KEY not configured");
    });
  });
});
