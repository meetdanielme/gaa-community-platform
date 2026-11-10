# Contributing

Thanks for helping build a better platform for GAA clubs! This guide gets you from zero to a merged pull request.

## 1. Set up

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/<you>/saints-community-platform.git
cd saints-community-platform
pnpm install
pnpm dev          # http://localhost:3000 — click "Explore the demo"
```

No Docker or database install needed: `pnpm dev` runs Postgres locally inside Node.

## 2. Pick something to work on

- Browse issues labelled **`good first issue`** or **`help wanted`**.
- Comment on the issue so others know you're on it.
- For a new feature, **open an issue first** describing the problem it solves for club members. The best ideas start from a real club need — "parents can't see which training sessions moved" beats "add a calendar widget".

## 3. Make your change

```bash
git checkout -b feat/short-description
```

Follow the existing shape: **page → action → service → rule**.

| You're changing… | Put it in… |
| --- | --- |
| A decision ("can this person vote?", "is the event full?") | `src/lib/rules/` as a pure function, with a test in `rules.test.ts` |
| Database reads/writes | `src/server/` — use a transaction when several writes must happen together |
| Form handling | a `"use server"` `actions.ts` next to the page — always call `requireUser()` and validate with Zod |
| Screens | `src/app/(app)/…` — Server Components by default; add `"use client"` only for interactivity |
| Tables | `src/db/schema.ts`, then `pnpm db:generate` to create a migration (commit it) |
| Club-specific text, colours or fees | `src/club.config.ts` — never hard-code "Saints" in a component |
| Club officer (admin) screens | `src/app/admin/…` — every action starts with `requireAdmin()`, and services record changes with `audit()` |

Guidelines:

- **Security:** never trust the browser. Every action re-checks the signed-in user and whether they may act on that record (e.g. they manage that family member).
- **Inclusion:** treat all four codes equally, write plain language, and keep it usable on a phone with one hand. Check keyboard navigation and colour contrast.
- **Children's data:** collect only what a feature needs. Ask in the issue before adding any new personal data field.
- Keep pull requests small and focused. One feature or fix per PR.

## 4. Check it

```bash
pnpm lint && pnpm typecheck && pnpm test
```

All three run in CI on every pull request.

## 5. Open a pull request

- Explain **what** changed and **why**, and link the issue (`Closes #12`).
- Add screenshots for UI changes (phone and desktop).
- A maintainer will review. Expect friendly questions — that's how we all learn.

## Code of conduct

Be kind, assume good intent, and help each other learn. Harassment or discrimination of any kind isn't tolerated. Raise concerns privately with a maintainer.
