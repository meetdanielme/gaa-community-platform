# Saints GAA Community Platform

**One club. Every generation.** An open-source community platform for GAA clubs: one place for players, families and volunteers across hurling, football, camogie and ladies' football to follow club news, respond to events, volunteer, pay membership and fund shared goals they choose together.

It started as Group 16's design project for **IS2204 Visual Thinking for Systems Analysis & Design** at University College Cork, built around the fictional multi-code club *Saints*. The aim now is to grow it, with contributions from the rest of the class, into a **white-label platform any GAA club in Ireland can run**.

> **Try the demo:** open the deployed site and click **Explore the demo**. You'll be signed in as Evan, a family supporter with three linked family members. Payments are simulated — no money is ever taken.

## What it does

| | Feature | Use case |
| --- | --- | --- |
| 📰 | **Feed** — club updates from all four codes, with likes | UC2 View club updates and events |
| 📅 | **Events** — calendar filtered by code, event details and schedules, reminders, share links | UC2 |
| ✅ | **Respond** for yourself or any family member you manage, with capacity and deadline checks | UC3 Respond to event invitations |
| 🙋 | **Volunteer** for roles at events, with same-day conflict warnings | UC4 Volunteer for an activity |
| 💳 | **Membership fees** per member per season (demo payments) | UC5 Pay membership fees |
| 💛 | **Donate** to the club's one active goal, with a transparent cost breakdown | UC6 Make a donation |
| 🗳️ | **Vote** for the next goal — one member, one vote; the top goal becomes active when the current one is funded | UC7 Vote for next donation goal |
| 👪 | **Profiles** — contact details, roles, linked family members | UC1 Maintain member and family profile |

Every rule behind those features (BR01–BR08 from the coursework) lives in [`src/lib/rules`](src/lib/rules) as small, tested functions. See [docs/coursework-traceability.md](docs/coursework-traceability.md) for how use cases, activity diagrams, rules, code and tests line up.

## Quick start

You need **Node.js 20+** and **pnpm** (`npm i -g pnpm`). That's it — no Docker, no cloud accounts.

```bash
git clone https://github.com/<your-fork>/saints-community-platform.git
cd saints-community-platform
pnpm install
pnpm dev
```

Open <http://localhost:3000> and click **Explore the demo** (or sign in as `evan@example.com` / `saints-demo-2026`).

`pnpm dev` starts a local Postgres (embedded [PGlite](https://pglite.dev), stored in `.data/`), applies migrations, seeds demo data the first time, and runs Next.js.

### Useful scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Local database + migrations + seed + Next.js dev server |
| `pnpm test` | Business-rule unit tests and service integration tests (in-memory Postgres) |
| `pnpm typecheck` / `pnpm lint` | TypeScript and ESLint |
| `pnpm db:reset` | Wipe and reseed the database (with `pnpm dev` or `pnpm db:server` running) |
| `pnpm db:generate` | Create a migration after editing `src/db/schema.ts` |
| `pnpm db:server` | Run only the local database, e.g. for `pnpm db:studio` |

## How it's built

- **[Next.js 16](https://nextjs.org)** (App Router, Server Components, Server Actions) + **TypeScript**
- **[Tailwind CSS 4](https://tailwindcss.com)**, styled from the team's Figma hi-fi prototype
- **Postgres** via **[Drizzle ORM](https://orm.drizzle.team)** — PGlite locally, any Postgres in production (we use [Neon](https://neon.tech) on Vercel)
- **[Better Auth](https://better-auth.com)** for email/password accounts and sessions
- **[Vitest](https://vitest.dev)** for tests

```
src/
  club.config.ts        ← white-label settings: name, colours, codes, fees
  app/
    page.tsx            ← public landing page
    (auth)/             ← sign in, sign up
    (app)/              ← signed-in area: feed, events, donate, profile
      */actions.ts      ← Server Actions: validate input, call a service
  server/               ← services: database reads/writes + transactions
  lib/rules/            ← pure business rules (BR01–BR08) + unit tests
  db/schema.ts          ← database tables
  components/           ← shared UI (sheet/dialog, buttons, app shell)
scripts/                ← dev database, migrations, seed data
drizzle/                ← SQL migrations
docs/                   ← coursework traceability and design diagrams
```

The flow for any feature is **page → action → service → rule**. Pages render, actions check the signed-in user and validate input with Zod, services talk to the database inside transactions, and rules make the decisions. Rules are pure functions with no database access, so they're easy to read and test.

## Make it your club's

Everything club-specific is in two files:

1. **[`src/club.config.ts`](src/club.config.ts)** — name, tagline, season, brand colours, codes, membership fee, donation presets.
2. **[`scripts/seed-data.mts`](scripts/seed-data.mts)** — starting posts, events, fundraising goals and the demo family.

Change those, run `pnpm db:reset`, and you have a different club. Proper multi-club support (many clubs on one deployment) is on the [roadmap](#roadmap).

## Deploy to Vercel

1. Import the repository into [Vercel](https://vercel.com/new).
2. Add a Postgres database: **Storage → Create → Neon** (this sets `DATABASE_URL`).
3. Add `BETTER_AUTH_SECRET` — generate one with `openssl rand -base64 32`.
4. Deploy. The build runs migrations and seeds the demo data if the database is empty (`pnpm vercel-build`).

Optional: set `BETTER_AUTH_URL` to your production URL, or `AUTH_ALLOWED_HOSTS` (comma-separated) to allow extra custom domains. See [`.env.example`](.env.example).

> Preview deployments share the production database unless you enable Neon's preview-branch integration. Turn it on before accepting pull requests that change the schema.

## Contributing

Classmates, other clubs and anyone who loves the GAA are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then pick an issue labelled `good first issue`.

## Roadmap

Ideas we'd love help with — open an issue to discuss before starting on a big one:

- **Club admin area** — post updates, create events and volunteer roles, propose goals, resolve tied votes (today this is seed data only; club operations were outside the original design boundary)
- **Multi-club (multi-tenant)** — host many clubs on one deployment, each with its own branding
- **Real payments** — implement the `PaymentProvider` interface in `src/server/payments.ts` with Stripe
- **Notifications** — email/push for reminders, RSVP deadlines and goal milestones
- **Attendance & integration insights** for coaches across the four codes, with privacy for under-18s built in
- **Irish language (Gaeilge) translation** and accessibility audits
- **Nightly demo reset** so the public demo always starts fresh

## Credits

Designed and built by IS2204 Group 16, University College Cork (2026): Evan Alam, Idayat Majolagbe, Daniel Marcinkowski, Chloe Mitellus, Emma Ntumobe and Sandu Stati Suman.

Photography by Adrian Payne (sliotar), Rémi Müller (pitch maintenance) and enrico bet (Croke Park) on [Unsplash](https://unsplash.com/license). Saints is a fictional club; any costs shown are illustrative.

## License

[MIT](LICENSE)
