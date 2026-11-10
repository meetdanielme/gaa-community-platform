# Saints GAA Community Platform

**One club. Every generation.** An open-source community platform for GAA clubs: one place for players and families across hurling, football, camogie and ladies' football to follow club news, respond to events, pay membership and fund shared goals they choose together.

It started as Group 16's design project for **IS2204 Visual Thinking for Systems Analysis & Design** at University College Cork, built around the fictional multi-code club *Saints*. The aim now is to grow it, with contributions from the rest of the class, into a **white-label platform any GAA club in Ireland can run**.

> **Try the demo:** open **[saintsgaa.social](https://saintsgaa.social)** and click **Explore the demo** to sign in as Evan, a family supporter with three linked family members, or **Explore as club admin** to run the club as Aoife, the club secretary. Payments are simulated — no money is ever taken — and the demo resets every night.

## What it does

### For members

| | Feature | Use case |
| --- | --- | --- |
| 📰 | **Feed** — club updates from all four codes, filterable by code | UC2 View club updates and events |
| 📅 | **Events** — calendar filtered by code, event details and schedules, reminders, share links | UC2 |
| ✅ | **Respond** for yourself or any family member you manage, with capacity and deadline checks | UC3 Respond to event invitations |
| 💳 | **Membership fees** per playing member per season (demo payments) | UC5 Pay membership fees |
| 💛 | **Donate** to the club's one active goal, with a transparent cost breakdown | UC6 Make a donation |
| 🗳️ | **Vote** for the next goal — one member, one vote; the top goal becomes active when the current one is funded | UC7 Vote for next donation goal |
| 👪 | **Profiles** — contact details; add, edit and remove linked family members | UC1 Maintain member and family profile |
| 🔗 | **Share** goals and events; **add events to your calendar** (.ics) | Share fundraising goal details |
| 🧾 | **Your donations** — donation history with receipts | UC6 |
| 🔐 | **Account** — change or reset your password, delete your account (GDPR) | — |

### For club officers (`/admin`)

| | Feature |
| --- | --- |
| 📊 | **Dashboard** — accounts, membership collected and outstanding, donations, current goal, and an **activity log** of every admin change for transparent governance |
| 📰 | **Posts** — publish, edit and delete feed updates, with photos and call-to-action buttons |
| 📅 | **Events** — create, edit, cancel (families who said "going" are emailed) and delete; see who's going and **export to CSV** |
| 💛 | **Fundraising** — propose goals with a cost breakdown, withdraw/restore them, record money raised offline, and **choose the next goal when a vote is tied** (BR08) |
| 👥 | **Members** — search accounts, grant admin access, edit roles and family members, record cash or sponsored memberships |
| 🧾 | **Donations** — the full ledger with filters and CSV export |

Admins are ordinary accounts with the admin flag — no separate login. A daily job emails event reminders and resets the public demo.

The scope matches the team's **Sprint 4** submission: the hi-fi prototype screens and the donation/voting core from the DFDs. Volunteering (UC4) is in the use-case model but not the prototype, so it's left for a future contribution.

Every rule behind those features (BR01–BR08 from the coursework) lives in [`src/lib/rules`](src/lib/rules) as small, tested functions. See [docs/coursework-traceability.md](docs/coursework-traceability.md) for how use cases, activity diagrams, rules, code and tests line up.

## Quick start

You need **Node.js 20+** and **pnpm** (`npm i -g pnpm`). That's it — no Docker, no cloud accounts.

```bash
git clone https://github.com/<your-fork>/saints-community-platform.git
cd saints-community-platform
pnpm install
pnpm dev
```

Open <http://localhost:3000> and click **Explore the demo** or **Explore as club admin** (or sign in as `evan@example.com` / `admin@example.com`, password `saints-demo-2026`). Emails (password resets, reminders) are printed in the terminal.

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

## Brand

The Saints identity — logo, compact badge, colours (blue `#003660`, yellow `#FFCB05`, red `#E82C2E`, black `#231F20`) and Inter typography — lives in [`docs/brand`](docs/brand), with usage rules in [`brand-guidelines.md`](docs/brand/brand-guidelines.md). In short: use the logo artwork (never retype the wordmark), place it on white or a light surface, and keep red for sparing accents rather than small text. Web-ready files are in `public/brand/`; the app and share icons are in `src/app/`.

## Make it your club's

1. Edit **[`src/club.config.ts`](src/club.config.ts)** — name, tagline, season, brand colours, logo, codes, membership fee, donation presets. Replace the files in `public/brand/` and the icons in `src/app/` with your club's.
2. Deploy with `DEMO_MODE=false` (no sample content, no demo buttons, no nightly reset) and `ADMIN_EMAILS=you@yourclub.ie`.
3. Sign up with that email — you're the club's first admin. Create events, posts and fundraising goals from **/admin**, and grant admin access to other officers from **Members**.
4. For email (password resets, reminders, cancellations), add `RESEND_API_KEY` and `EMAIL_FROM` from [Resend](https://resend.com).

The Saints sample content lives in [`src/server/demo-data.ts`](src/server/demo-data.ts). Proper multi-club support (many clubs on one deployment) is on the [roadmap](#roadmap).

## Deploy to Vercel

1. Import the repository into [Vercel](https://vercel.com/new).
2. Add a Postgres database: **Storage → Create → Neon** (this sets `DATABASE_URL`).
3. Add `BETTER_AUTH_SECRET` (generate with `openssl rand -base64 32`) and `CRON_SECRET` (any long random string — it protects the daily job).
4. Deploy. The build runs migrations and, in demo mode, seeds the demo data if the database is empty (`pnpm vercel-build`).

All settings, including email and custom domains, are listed in [`.env.example`](.env.example).

> Preview deployments share the production database unless you enable Neon's preview-branch integration. Turn it on before accepting pull requests that change the schema.

## Contributing

Classmates, other clubs and anyone who loves the GAA are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then pick an issue labelled `good first issue`.

## Roadmap

Ideas we'd love help with — open an issue to discuss before starting on a big one:

- **Volunteering (UC4)** — sign up for roles at events, with capacity and conflict checks (BR04 is already specified in the coursework)
- **Photo uploads** — upload images for posts and events (e.g. with Vercel Blob) instead of linking them
- **Seasons** — roll memberships over to a new season and set fees per age group
- **Multi-club (multi-tenant)** — host many clubs on one deployment, each with its own branding
- **Real payments** — implement the `PaymentProvider` interface in `src/server/payments.ts` with Stripe
- **More notifications** — push notifications, RSVP-deadline nudges and goal milestones (email reminders and cancellations exist)
- **Attendance & integration insights** for coaches across the four codes, with privacy for under-18s built in
- **Irish language (Gaeilge) translation** and accessibility audits

## Credits

Designed and built by IS2204 Group 16, University College Cork (2026): Evan Alam, Idayat Majolagbe, Daniel Marcinkowski, Chloe Mitellus, Emma Ntumobe and Sandu Stati Suman.

Photography by Adrian Payne (sliotar), Rémi Müller (pitch maintenance) and enrico bet (Croke Park) on [Unsplash](https://unsplash.com/license). Saints is a fictional club; any costs shown are illustrative.

## License

[MIT](LICENSE)
