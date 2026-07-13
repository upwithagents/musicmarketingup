// Pure domain data for campaign template expansion (spec §4.2/§4.3/§4.4).
// No framework, no Prisma — src/core stays independent of the DB model.

export type Pillar =
  | "Process"
  | "Personality"
  | "Live"
  | "Education"
  | "Community"
  | "Promotion"
  | "Storytelling"
  | "Trend"
  | "Snippet"
  | "Milestone";

export interface TaskTemplate {
  offsetDays: number;
  title: string;
}

export interface PostTemplate {
  offsetDays: number;
  pillar: Pillar;
  platform: string;
  title: string;
  // body may reference {{band}}, {{venue}}, {{city}}, {{gigDate}},
  // {{releaseTitle}}, {{releaseDate}}, {{link}} — see expand.ts renderTemplate.
  body: string;
}

// spec §4.2 gig-promo checklist, rows verbatim (day offsets vs gig date
// D-0). D-42 appears twice in the source table — both rows are kept, not
// deduped by offset.
export const GIG_PROMO_TASKS: TaskTemplate[] = [
  {
    offsetDays: -42,
    title: "Announce the gig on all channels (as soon as confirmed)",
  },
  {
    offsetDays: -42,
    title:
      "Create event page (FB/Bandsintown) + add to website tour list",
  },
  {
    offsetDays: -35,
    title: "Design & order posters/flyers; sketch content plan for the run",
  },
  {
    offsetDays: -28,
    title: "Coordinate cross-promo with other bands on the bill; tag venue",
  },
  {
    offsetDays: -21,
    title:
      "Post rehearsal/BTS content; first email-list notice with event link",
  },
  {
    offsetDays: -14,
    title: "Email push #2; contact local press/blogs/radio; hang flyers",
  },
  {
    offsetDays: -7,
    title: "Start countdown content (Stories/Reels); share ticket link",
  },
  {
    offsetDays: -3,
    title: 'Post set time/logistics; "who\'s coming?" engagement post',
  },
  {
    offsetDays: -1,
    title: "Final reminder story; confirm gear, merch stock, load-in time",
  },
  {
    offsetDays: 0,
    title:
      "Day-of stories + soundcheck clip; merch table + email signup; assign photo/video person",
  },
  {
    offsetDays: 1,
    title: "Post recap (photos/clips); thank attendees",
  },
  {
    offsetDays: 3,
    title:
      'Thank-you notes to venue/promoter/other bands ("we\'d love to return")',
  },
  {
    offsetDays: 7,
    title: "Repurpose live footage into Reels/Shorts; add new contacts",
  },
];

// Curated subset of the §4.2 checklist reworded as social pillar posts:
// announce D-42 (Promotion), BTS D-21 (Process), countdown D-7 (Snippet),
// set-time D-3 (Community), day-of D-0 (Live), recap D+1 (Milestone),
// repurpose D+7 (Live).
export const GIG_PROMO_POSTS: PostTemplate[] = [
  {
    offsetDays: -42,
    pillar: "Promotion",
    platform: "All",
    title: "Announce the gig",
    body: "We're playing {{venue}} in {{city}} on {{gigDate}}! {{band}} just locked in the date — details & tickets: {{link}}.",
  },
  {
    offsetDays: -21,
    pillar: "Process",
    platform: "TikTok",
    title: "Rehearsal / BTS",
    body: "Rehearsal footage from {{band}} ahead of {{gigDate}} at {{venue}} — here's what getting ready for the show looks like.",
  },
  {
    offsetDays: -7,
    pillar: "Snippet",
    platform: "TikTok",
    title: "Countdown snippet",
    body: "One week out from {{venue}}! Here's a 15-second loop of the hook we can't wait to play live in {{city}}.",
  },
  {
    offsetDays: -3,
    pillar: "Community",
    platform: "Stories",
    title: "Set time + who's coming",
    body: "Set time and logistics for {{gigDate}} at {{venue}} are up — who's coming? Drop a comment below.",
  },
  {
    offsetDays: 0,
    pillar: "Live",
    platform: "TikTok",
    title: "Day-of stories",
    body: "Live from {{venue}} in {{city}} — soundcheck's done, doors are open. {{band}} plays tonight!",
  },
  {
    offsetDays: 1,
    pillar: "Milestone",
    platform: "Stories",
    title: "Recap",
    body: "Thank you {{city}}! {{band}}'s night at {{venue}} was one for the books — recap photos and clips up now.",
  },
  {
    offsetDays: 7,
    pillar: "Live",
    platform: "TikTok",
    title: "Repurposed live footage",
    body: "Best moments from {{band}} at {{venue}}, cut for the feed — a full set's energy in 30 seconds.",
  },
];

// spec §4.3 single-release waterfall chore rows: distributor upload R-42,
// pre-save + playlist pitching R-28, playlist re-pitch R+7, plan next
// single R+28. The other §4.3 rows are content-posting beats and are
// covered by RELEASE_POSTS below.
export const RELEASE_TASKS: TaskTemplate[] = [
  {
    offsetDays: -42,
    title: "Lock release date; upload to distributor (playlist-pitch lead time)",
  },
  {
    offsetDays: -28,
    title:
      "Launch pre-save campaign; submit editorial + independent playlist pitches",
  },
  {
    offsetDays: 7,
    title: "Repurpose into short clips; pitch more playlists; recap",
  },
  {
    offsetDays: 28,
    title: "Plan next waterfall single (stack previous track onto it)",
  },
];

// Curated subset of the §4.3 waterfall reworded as social pillar posts:
// art reveal R-35 (Storytelling), BTS R-21 (Process), video teaser R-14
// (Snippet), countdown R-7 (Snippet), out-tomorrow R-1 (Promotion),
// release-day R-0 (Promotion), fan reactions R+1 (Community), clips R+7
// (Live).
export const RELEASE_POSTS: PostTemplate[] = [
  {
    offsetDays: -35,
    pillar: "Storytelling",
    platform: "Reels",
    title: "Art reveal",
    body: "The cover art for {{releaseTitle}} is here — {{band}} will be telling the story behind it soon.",
  },
  {
    offsetDays: -21,
    pillar: "Process",
    platform: "TikTok",
    title: "Studio BTS",
    body: "Behind-the-scenes in the studio: {{band}} working on {{releaseTitle}}, out {{releaseDate}}.",
  },
  {
    offsetDays: -14,
    pillar: "Snippet",
    platform: "TikTok",
    title: "Video teaser",
    body: "Teaser for {{releaseTitle}} — the full video/visualizer drops with the song on {{releaseDate}}.",
  },
  {
    offsetDays: -7,
    pillar: "Snippet",
    platform: "TikTok",
    title: "Countdown",
    body: "{{releaseTitle}} drops {{releaseDate}} — a week of countdown snippets and lyric teasers starts now.",
  },
  {
    offsetDays: -1,
    pillar: "Promotion",
    platform: "All",
    title: "Out tomorrow",
    body: "{{releaseTitle}} is out tomorrow, {{releaseDate}}! Pre-save it now: {{link}}.",
  },
  {
    offsetDays: 0,
    pillar: "Promotion",
    platform: "All",
    title: "Release day",
    body: "{{releaseTitle}} is out now! Stream {{band}}'s new track here: {{link}}.",
  },
  {
    offsetDays: 1,
    pillar: "Community",
    platform: "Stories",
    title: "Fan reactions",
    body: "Loving the reactions to {{releaseTitle}} — thank you for streaming and sharing, {{band}} fans!",
  },
  {
    offsetDays: 7,
    pillar: "Live",
    platform: "TikTok",
    title: "Clips",
    body: "Repurposing {{releaseTitle}} into short clips for the feed — more playlist pitches going out too.",
  },
];

// Always-on cadence rotation (spec §4.4): cycles through pillars other
// than Promotion/Trend; Promotion is inserted separately by the 1-in-5
// rule in expand.ts, and Trend is left out of the fixed rotation.
export const ALWAYS_ON_PILLAR_ROTATION: Pillar[] = [
  "Process",
  "Personality",
  "Live",
  "Community",
  "Storytelling",
  "Education",
  "Snippet",
  "Milestone",
];
