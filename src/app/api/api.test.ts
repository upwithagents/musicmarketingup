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
    const customOrder = [
      { songId: songs[3].id, section: "main" as const },
      { songId: songs[0].id, section: "main" as const },
      { songId: songs[1].id, section: "encore" as const },
      { songId: songs[2].id, section: "main" as const },
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
    expect(items.map((i) => i.section)).toEqual(customOrder.map((o) => o.section));
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
