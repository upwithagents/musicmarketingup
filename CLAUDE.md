# MusicMarketingUp — Agent Notes

Working name **MusicMarketingUp**: a virtual "music agent" for an
independent band or solo singer, covering gigs, marketing/social media,
and band chores (everything around the music except making it). Part of
the upwithagents ecosystem: standalone app first, portal zone second,
`upagent` expertise-pack later.

## Ground rules

- **Independence from any employer.** This project stays fully separate
  from any employer's accounts, infra, or tooling.
- **PRIVACY:** band profile, songs, gigs, and campaign data are real user
  data — `data/` (the SQLite DB) is gitignored. Only code, schema, docs,
  and anonymized example data get committed.
- **GitHub:** `github.com/upwithagents/musicmarketingup`. Contributions
  push under the repo-local `upwithagents` identity (repo-local git
  config + its own SSH alias `github-upwithagents`), never a
  contributor's personal or employer GitHub identity.

## Conventions

- Branches: `up/<max-3-word-kebab>` (project convention — not the owner's
  personal `lm/` prefix, since this repo may have other contributors one
  day). Large implementation work goes through branches even though this
  repo allows direct commits to `main`.
- Stack: Next.js 16 + TypeScript + Tailwind 4 + Prisma 7/SQLite + vitest
  (pnpm). Layering is strict: `src/core` is pure TS (domain logic:
  setlist ordering, promo checklist generation, campaign templates) and
  must not import from `next`/`react`; `src/app` holds UI and thin API
  routes.
- Run: `pnpm install && pnpm run db:push && pnpm run dev`. Tests:
  `pnpm test`.
- Plans live in the workspace-level
  `1_CLAUDE_WORKFLOW/plans/musicmarketingup/`, not in this repo.
