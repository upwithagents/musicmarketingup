import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  expandAlwaysOn,
  expandRelease,
  type ExpandContext,
  type ExpandedCampaign,
} from "@/core/campaigns/expand";
import { bandContextFromProfile } from "@/core/content/copy";
import { parseCampaignCreateInput } from "./validation";

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

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { anchorDate: "desc" },
    include: {
      posts: { orderBy: { date: "asc" } },
      tasks: { orderBy: { dueDate: "asc" } },
    },
  });
  return NextResponse.json({ campaigns });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = parseCampaignCreateInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { type, name, anchorDate, weeks } = parsed.value;

  const profile = await prisma.bandProfile.findUnique({ where: { id: "band" } });
  const bandContext = bandContextFromProfile(profile ?? FALLBACK_PROFILE);

  const today = utcMidnight(new Date());
  let expanded: ExpandedCampaign;
  if (type === "single_release") {
    const ctx: ExpandContext = {
      band: bandContext.name,
      releaseTitle: name,
      releaseDate: anchorDate,
    };
    expanded = expandRelease(anchorDate, today, ctx);
  } else {
    const ctx: ExpandContext = { band: bandContext.name };
    expanded = expandAlwaysOn(anchorDate, weeks, ctx);
  }

  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.campaign.create({
      data: { type, name, anchorDate, status: "active" },
    });

    if (expanded.tasks.length > 0) {
      await tx.choreTask.createMany({
        data: expanded.tasks.map((task) => ({
          campaignId: created.id,
          title: task.title,
          dueDate: task.dueDate,
          status: "open",
        })),
      });
    }

    if (expanded.posts.length > 0) {
      await tx.postDraft.createMany({
        data: expanded.posts.map((post) => ({
          campaignId: created.id,
          date: post.date,
          platform: post.platform,
          pillar: post.pillar,
          title: post.title,
          body: post.body,
          status: "idea",
        })),
      });
    }

    return created;
  });

  return NextResponse.json(
    {
      campaignId: campaign.id,
      postCount: expanded.posts.length,
      taskCount: expanded.tasks.length,
    },
    { status: 201 },
  );
}
