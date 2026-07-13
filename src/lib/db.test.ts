import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

describe("db client", () => {
  it("creates and reads a Song with defaults", async () => {
    const song = await prisma.song.create({
      data: { title: "Test Song", durationSec: 180 },
    });
    const found = await prisma.song.findUniqueOrThrow({
      where: { id: song.id },
    });
    expect(found.title).toBe("Test Song");
    expect(found.energy).toBe(3);
    expect(found.popularity).toBe(2);
    expect(found.isCover).toBe(false);
    expect(found.isSingle).toBe(false);
  });

  it("upserts the singleton BandProfile with fixed id", async () => {
    const band = await prisma.bandProfile.upsert({
      where: { id: "band" },
      update: { name: "Updated Name" },
      create: { id: "band", name: "The Midnight Placeholders" },
    });
    expect(band.id).toBe("band");
    expect(band.genre).toBe("");
    expect(band.links).toBe("{}");
  });
});
