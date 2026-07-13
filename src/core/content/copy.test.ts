import { describe, expect, it } from "vitest";
import { bandContextFromProfile } from "@/core/content/copy";

describe("bandContextFromProfile", () => {
  it("maps profile fields and parses links JSON", () => {
    const ctx = bandContextFromProfile({
      name: "The Ramps",
      genre: "Indie Rock",
      homeTown: "Chicago",
      bio: "Four friends, one van.",
      audienceNotes: "Skews 18-30, loves DIY venues.",
      links: '{"instagram":"https://instagram.com/theramps","spotify":"https://open.spotify.com/artist/x"}',
    });

    expect(ctx).toEqual({
      name: "The Ramps",
      genre: "Indie Rock",
      homeTown: "Chicago",
      bio: "Four friends, one van.",
      audienceNotes: "Skews 18-30, loves DIY venues.",
      links: {
        instagram: "https://instagram.com/theramps",
        spotify: "https://open.spotify.com/artist/x",
      },
    });
  });

  it("tolerates malformed JSON in links, falling back to {}", () => {
    const ctx = bandContextFromProfile({
      name: "The Ramps",
      genre: "Indie Rock",
      homeTown: "Chicago",
      bio: "Four friends, one van.",
      audienceNotes: "Skews 18-30.",
      links: "not valid json {{{",
    });

    expect(ctx.links).toEqual({});
    expect(ctx.name).toBe("The Ramps");
  });

  it("falls back to {} when links is an empty string", () => {
    const ctx = bandContextFromProfile({
      name: "The Ramps",
      genre: "Indie Rock",
      homeTown: "Chicago",
      bio: "Four friends, one van.",
      audienceNotes: "Skews 18-30.",
      links: "",
    });

    expect(ctx.links).toEqual({});
  });
});
