# MusicMarketingUp

A virtual "music agent" for an independent band or solo singer — everything
around the music except making it: gigs, marketing/social media, and band
chores. Part of the **up** ecosystem (walletup, sheetup, cleanup, …):
standalone apps that also plug into the shared agent core in `upagent`.
Music production is the sister project `musicproductionup` (out of scope
here).

## What the MVP does

One spine: **songs → setlists → gigs → promotion**.

- **Band profile**: name, genre, home town, bio, links, audience notes —
  feeds every generated text.
- **Song library + setlist builder**: songs with live-performance
  attributes (duration, BPM, energy, mood, cover/original, popularity);
  deterministic energy-arc auto-ordering, then manual reorder; print view.
- **Gig tracker + promo checklist**: gig pipeline (idea → contacted →
  confirmed → played/cancelled); confirming a gig generates a dated promo
  checklist.
- **Marketing campaigns + content calendar**: campaign templates (gig
  promo, single release, always-on presence) materialize dated post
  drafts; optional AI assist (with `ANTHROPIC_API_KEY`) rewrites copy in
  the band's voice — the app is fully usable without a key.

This repo currently holds the scaffold only (toolchain, quality gates,
placeholder page); the schema and features land in subsequent tasks.

## Running it

Prerequisites: Node 20+, pnpm.

```sh
pnpm install
cp .env.example .env       # add ANTHROPIC_API_KEY for AI draft assist (optional)
pnpm run db:push           # creates data/musicmarketingup.db (once a schema exists)
pnpm run dev               # http://localhost:3000
```

Tests: `pnpm test` (vitest).

## Stack

Next.js 16 + TypeScript + Tailwind 4, Prisma 7 on SQLite
(better-sqlite3), vitest. Layering is strict: `src/core` is pure TS
(domain logic, no `next`/`react` imports); `src/app` holds UI and thin API
routes.
