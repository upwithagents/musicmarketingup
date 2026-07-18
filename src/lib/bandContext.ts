import { prisma } from "@/lib/db";
import { bandContextFromProfile, type BandContext } from "@/core/content/copy";

/** Fallback band context used when no BandProfile row exists yet. */
const FALLBACK_PROFILE = {
  name: "Your Band",
  genre: "",
  homeTown: "",
  bio: "",
  audienceNotes: "",
  links: "{}",
};

/** Load the singleton band profile (or the fallback) as a BandContext. */
export async function getBandContext(): Promise<BandContext> {
  const profile = await prisma.bandProfile.findUnique({ where: { id: "band" } });
  return bandContextFromProfile(profile ?? FALLBACK_PROFILE);
}
