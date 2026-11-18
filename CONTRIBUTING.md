# Contributing

Thanks for helping build a better platform for GAA clubs! This guide takes you from your first look at the code to a merged pull request.

## Ways to help

You don't need to write code to contribute:

- **Report a bug.** Open an issue with the **Bug report** template.
- **Suggest a feature.** Use the **Feature idea** template and describe the problem a real club has. If you're a club officer, coach or parent, your experience is exactly what we're missing.
- **Test it.** Try the [demo](https://saintsgaa.social) on your phone, with a keyboard, or with a screen reader, and tell us what got in the way.
- **Translate or write.** Irish language (Gaeilge) support, clearer wording, and better docs and setup guides are all welcome.
- **Write code.** Pick an issue labelled **`good first issue`** or **`help wanted`**.

## 1. Set up

You need **Node.js 20+** and **pnpm** (`npm i -g pnpm`).

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/<you>/gaa-community-platform.git
cd gaa-community-platform
pnpm install
pnpm dev          # http://localhost:3000, then click "Explore the demo"
```

You don't need Docker or a database install: `pnpm dev` runs Postgres locally inside Node and seeds the demo club. Demo logins are `evan@example.com` (member) and `admin@example.com` (club admin), both with the password `saints-demo-2026`.

## 2. Pick something to work on

- Comment on the issue so others know you've picked it up.
- For a new feature, **open an issue first** and describe the problem it solves for club members. "Parents can't see which training sessions moved" is a better starting point than "add a calendar widget".
- For bigger changes (a new table, a new area of the app, a new dependency), agree the approach in the issue before you write a lot of code.

## 3. Make your change

```bash
git checkout -b feat/short-description
```

Follow the existing pattern: **page → action → service → rule**.

| You're changing… | Put it in… |
| --- | --- |
| A decision ("can this person vote?", "is the event full?") | `src/lib/rules/` as a pure function, with a test in `rules.test.ts` |
| Database reads and writes | `src/server/`. Use a transaction when several writes must happen together |
| Form handling | a `"use server"` `actions.ts` next to the page. Always call `requireUser()` and validate input with Zod |
| Screens | `src/app/(app)/…`. Use Server Components by default, and add `"use client"` only for interactivity |
| Club officer (admin) screens | `src/app/admin/…`. Every action starts with `requireAdmin()`, and services record changes with `audit()` |
| Tables | `src/db/schema.ts`, then run `pnpm db:generate` to create a migration (commit the migration too) |
| Club-specific text, colours or fees | `src/club.config.ts`. Never hard-code "Saints" in a component |

Guidelines:

- **Security:** never trust the browser. Every action re-checks the signed-in user, and whether they're allowed to act on that record (for example, that they manage that family member).
- **Inclusion:** treat all four codes equally, write in plain language, and make sure it works on a phone held in one hand. Check keyboard navigation and colour contrast.
- **Children's data:** collect only what a feature needs. Ask in the issue before you add any new personal data field.
- **Keep it white-label:** the platform should work for any club, so anything club-specific belongs in config or seed data.
- **Small pull requests:** one feature or fix per PR.

### Using AI tools

You're welcome to use AI coding tools. We built most of this app with one. You're still responsible for what you submit: read and understand every line, run the checks, and test the change in the browser. Mention in the PR description if AI wrote a significant part of it.

## 4. Check it

```bash
pnpm lint && pnpm typecheck && pnpm test
```

All three run in CI on every pull request.

## 5. Open a pull request

- Explain **what** changed and **why**, and link the issue (`Closes #12`).
- Add screenshots for UI changes, on both phone and desktop.
- A maintainer will review it. Expect friendly questions; that's how we all learn.

By contributing, you agree that your contribution is licensed under the project's [MIT license](LICENSE).

## Code of conduct

Be kind, assume good intent and help each other learn. Harassment or discrimination of any kind isn't tolerated. Raise any concerns privately with a maintainer.
