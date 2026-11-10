## What and why

<!-- What does this change, and which club need does it serve? Link the issue: Closes #… -->

## Screenshots

<!-- For UI changes: phone and desktop. -->

## Checklist

- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass
- [ ] Server actions re-check the signed-in user and their permission
- [ ] No club-specific text or colours hard-coded (use `src/club.config.ts`)
- [ ] Schema changes include a migration from `pnpm db:generate`
