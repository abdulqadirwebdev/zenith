# ZENITH implementation plan

Implementation and verification completed for the delivered local application. All five browser tests, 16 unit tests, lint, strict TypeScript and production build pass. The README explicitly distinguishes delivered behavior from remaining advanced scope. See `docs/VERIFICATION.md` for evidence and visual deviations.

## Phase 1 — foundation
- Vite, React, strict TypeScript, Tailwind, shared accessible UI and midnight design tokens.
- Versioned Dexie schema, typed entities, Zustand UI state, onboarding and preferences.
- Gate: typecheck and persistence tests.

## Phase 2 — core productivity
- Estimated tasks, CRUD, views, ordering, bulk actions, archive and subtasks.
- Timestamp-based recoverable timer; atomic session completion and reward ledger.
- Deterministic scheduler prioritizing urgency then deadline, respecting busy intervals and work windows, splitting blocks and inserting breaks. Preview before applying.
- Gate: timer, scheduling and integrity unit tests.

## Phase 3 — daily tools
- Calendar views, event editing, manual adjustments and conflicts.
- Synthesized ambient mixer, imported local audio, persistent mixes.
- Recovery timers and guided breathing.
- Gate: functional browser checks.

## Phase 4 — reflection and learning
- Analytics from stored activity, CSV export, streaks and optional rewards.
- Markdown notes, flashcards with spaced repetition, exam goals.
- Gate: analytics and reward tests.

## Phase 5 — delivery
- Command palette, notifications, backups/import validation, appearance/accessibility.
- Responsive review, essential Playwright flows, lint, typecheck, production build.
- README with exact implemented scope, limitations and deployment instructions.

## Non-negotiable integrity rules
- Minutes are finite and nonnegative; task estimates are strictly positive.
- Calendar intervals use timestamps and end after start; automatic blocks never overlap.
- Session IDs uniquely identify completion; XP uses unique source keys.
- Deleting a task detaches session/event references transactionally.
- Browser storage is local to this browser and origin; no cloud-sync claim.
- Browser notifications work only while the application can execute.
