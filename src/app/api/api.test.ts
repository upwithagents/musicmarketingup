import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { GET as profileGET, PUT as profilePUT } from "./profile/route";
import { GET as songsGET, POST as songsPOST } from "./songs/route";
import { PUT as songPUT, DELETE as songDELETE } from "./songs/[id]/route";

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("profile API", () => {
  // The BandProfile row is a fixed-id singleton shared with other test files
  // (e.g. src/lib/db.test.ts) against the same test.db — reset it after each
  // test so this file doesn't leak state into others.
  afterEach(async () => {
    await prisma.bandProfile.deleteMany({ where: { id: "band" } });
  });

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
});
