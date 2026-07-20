<img src="docs/icon.svg" width="56" align="left" alt="" />

# MusicMarketingUp

A virtual music agent for an independent band or solo singer: gigs,
marketing/social media, and band chores — everything around the music
except making it. Part of the **up** ecosystem; sister project
`musicproductionup` handles production.

<br clear="left"/>

## What it does

One spine: **songs → setlists → gigs → promotion**.

- **Band profile** feeds every generated text.
- **Song library + setlist builder** with energy-arc auto-ordering.
- **Gig tracker** with an auto-generated promo checklist per gig.
- **Marketing campaigns + content calendar**, with optional AI-assisted copy.

Currently scaffold-only — schema and features land in subsequent tasks.

## Running it

```sh
pnpm install
cp .env.example .env       # add ANTHROPIC_API_KEY for AI draft assist (optional)
pnpm run db:push
pnpm run dev               # http://localhost:3000
```

Tests: `pnpm test`.

## Stack

Next.js 16 + TypeScript + Tailwind 4, Prisma 7 on SQLite, vitest.
