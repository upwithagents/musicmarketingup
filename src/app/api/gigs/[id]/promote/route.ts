import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { expandGigPromo, type ExpandContext } from "@/core/campaigns/expand";
import { bandContextFromProfile } from "@/core/content/copy";

/** Fallback band context used when no BandProfile row exists yet. */
const FALLBACK_PROFILE = {
  name: "Your Band",
  genre: "",
  homeTown: "",
  bio: "",
  audienceNotes: "",
  links: "{}",
};

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const gig = await prisma.gig.findUnique({ where: { id } });
  if (!gig) {
    return NextResponse.json({ error: "Gig not found" }, { status: 404 });
  }

  const existingCampaign = await prisma.campaign.findFirst({
    where: { gigId: gig.id, type: "gig_promo" },
  });
  if (existingCampaign) {
    return NextResponse.json(
      { error: "A promo campaign already exists for this gig" },
      { status: 409 },
    );
  }

  const profile = await prisma.bandProfile.findUnique({ where: { id: "band" } });
  const bandContext = bandContextFromProfile(profile ?? FALLBACK_PROFILE);

  const ctx: ExpandContext = {
    band: bandContext.name,
    venue: gig.venue || undefined,
    city: gig.city || undefined,
    gigDate: gig.date,
  };

  const today = utcMidnight(new Date());
  const expanded = expandGigPromo(gig.date, today, ctx);

  const result = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        type: "gig_promo",
        name: `Promo: ${gig.title}`,
        anchorDate: gig.date,
        gigId: gig.id,
      },
    });

    if (expanded.tasks.length > 0) {
      await tx.choreTask.createMany({
        data: expanded.tasks.map((task) => ({
          gigId: gig.id,
          campaignId: campaign.id,
          title: task.title,
          dueDate: task.dueDate,
          status: "open",
        })),
      });
    }

    if (expanded.posts.length > 0) {
      await tx.postDraft.createMany({
        data: expanded.posts.map((post) => ({
          campaignId: campaign.id,
          date: post.date,
          platform: post.platform,
          pillar: post.pillar,
          title: post.title,
          body: post.body,
          status: "idea",
        })),
      });
    }

    return campaign;
  });

  return NextResponse.json(
    {
      campaignId: result.id,
      taskCount: expanded.tasks.length,
      postCount: expanded.posts.length,
    },
    { status: 201 },
  );
}
