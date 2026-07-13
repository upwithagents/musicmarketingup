import type { BandContext } from "@/core/content/copy";

export interface CompletionClient {
  complete(system: string, user: string): Promise<string>;
}

const DEFAULT_MODEL = "claude-sonnet-5";

/**
 * Returns a CompletionClient backed by the real Anthropic API, or null if
 * no ANTHROPIC_API_KEY is configured. The SDK is imported lazily so the
 * app loads fine even when the package isn't installed or no key is set.
 */
export function anthropicClient(): CompletionClient | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  return {
    async complete(system: string, user: string): Promise<string> {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model,
        max_tokens: 512,
        system,
        messages: [{ role: "user", content: user }],
      });
      const block = message.content[0];
      return block && block.type === "text" ? block.text : "";
    },
  };
}

export interface RefineDraftArgs {
  body: string;
  pillar: string;
  platform: string;
  band: BandContext;
}

const SYSTEM_PROMPT =
  "You are a social media copywriter for indie musicians. Keep copy " +
  "authentic and non-salesy, at most 120 words, and match the norms of " +
  "the target platform.";

/**
 * Asks the given completion client to refine a draft post body, returning
 * the trimmed model response.
 */
export async function refineDraft(
  args: RefineDraftArgs,
  client: CompletionClient,
): Promise<string> {
  const { body, pillar, platform, band } = args;
  const linksText = Object.entries(band.links)
    .map(([label, url]) => `${label}: ${url}`)
    .join(", ");

  const userMessage = [
    `Band: ${band.name}`,
    `Genre: ${band.genre}`,
    `Home town: ${band.homeTown}`,
    `Bio: ${band.bio}`,
    `Audience notes: ${band.audienceNotes}`,
    linksText ? `Links: ${linksText}` : null,
    `Content pillar: ${pillar}`,
    `Platform: ${platform}`,
    `Current draft:`,
    body,
    ``,
    `Rewrite the draft above to be more engaging while keeping the same core message.`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const response = await client.complete(SYSTEM_PROMPT, userMessage);
  return response.trim();
}
