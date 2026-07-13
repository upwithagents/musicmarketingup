import { afterEach, describe, expect, it } from "vitest";
import {
  anthropicClient,
  refineDraft,
  type CompletionClient,
} from "@/core/ai/refine";
import type { BandContext } from "@/core/content/copy";

const BAND: BandContext = {
  name: "The Ramps",
  genre: "Indie Rock",
  homeTown: "Chicago",
  bio: "Four friends, one van.",
  audienceNotes: "Skews 18-30, loves DIY venues.",
  links: { instagram: "https://instagram.com/theramps" },
};

describe("anthropicClient", () => {
  const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY;
    }
  });

  it("returns null when ANTHROPIC_API_KEY is unset", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(anthropicClient()).toBeNull();
  });

  it("returns null when ANTHROPIC_API_KEY is an empty string", () => {
    process.env.ANTHROPIC_API_KEY = "";
    expect(anthropicClient()).toBeNull();
  });
});

class FakeClient implements CompletionClient {
  lastSystem: string | null = null;
  lastUser: string | null = null;
  constructor(private readonly response: string) {}

  async complete(system: string, user: string): Promise<string> {
    this.lastSystem = system;
    this.lastUser = user;
    return this.response;
  }
}

describe("refineDraft", () => {
  it("sends a prompt containing band name, pillar, platform, and the original body", async () => {
    const fake = new FakeClient("  Refined draft text.  ");

    await refineDraft(
      {
        body: "Original draft body about our new single.",
        pillar: "Storytelling",
        platform: "Instagram",
        band: BAND,
      },
      fake,
    );

    expect(fake.lastUser).toContain("The Ramps");
    expect(fake.lastUser).toContain("Storytelling");
    expect(fake.lastUser).toContain("Instagram");
    expect(fake.lastUser).toContain(
      "Original draft body about our new single.",
    );
  });

  it("returns the fake client's response, trimmed", async () => {
    const fake = new FakeClient("  Refined draft text.  ");

    const result = await refineDraft(
      {
        body: "Original draft body.",
        pillar: "Storytelling",
        platform: "Instagram",
        band: BAND,
      },
      fake,
    );

    expect(result).toBe("Refined draft text.");
  });

  it("uses a system prompt describing the copywriter role", async () => {
    const fake = new FakeClient("Refined.");

    await refineDraft(
      {
        body: "Original draft body.",
        pillar: "Storytelling",
        platform: "Instagram",
        band: BAND,
      },
      fake,
    );

    expect(fake.lastSystem).toMatch(/social.media copywriter/i);
    expect(fake.lastSystem).toMatch(/indie musicians/i);
  });
});
