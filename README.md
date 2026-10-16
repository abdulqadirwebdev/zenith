# ZENITH — Your Personal Productivity Universe

A local-first student productivity application built with React, TypeScript and Vite. Tasks, focus history, notes, flashcards, events, preferences and imported audio live in IndexedDB. There is no account, backend, cloud sync, streaming integration or AI scheduler.

## Run locally

Use Node.js 22.12+ (developed on Node 24) and npm.

```sh
npm ci
npm run dev -- --port 5173
```

Open **http://localhost:5173**. Complete onboarding or skip it. Example tasks are opt-in; sessions and analytics are never fabricated.

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
npm run preview
```

Playwright uses installed Chrome (`channel: 'chrome'`). On a machine without Chrome, install Playwright Chromium with `npx playwright install chromium` and remove the `channel` setting in `playwright.config.ts`. The test runner starts Vite if needed. It uses isolated browser contexts, not your personal browser data.

## Implemented workspace

- **Onboarding and appearance:** name, role, study hours, durations, target, optional example tasks, dark/light/system themes, four accent palettes, density, 12/24-hour clock, week-start preference and reduced motion.
- **Dashboard:** greeting, daily target ring, genuine focus/task/streak metrics, recent weekly bars, priority tasks, weekly date strip, schedule rail, sound controls, and persistent show/hide/reordering of widgets.
- **Tasks:** required positive estimate; description, subject, priority, status, dates, tags, subtasks, notes, color and recurrence. List, board and subject-grouped presentations; search, sorting, ordering, duplicate, bulk completion, archive and confirmed deletion with task-record undo. Estimated and tracked minutes are shown together.
- **Focus Studio:** Pomodoro, long focus, deep work, custom, stopwatch, task-based and deadline timers; pause/resume, reset, skip, finish/save, extend, task switching, immersive mode and screen wake lock where supported. Global mini controls persist through navigation. Completion presents a recovery/next-task choice.
- **Planner:** day/week/month/agenda views, appointments, task blocks, breaks, all-day entries, daily/weekly recurrence, locked blocks, local-time display, conflict warnings, drag movement, resize handles, precise start/end editing, capacity and overload display. Auto-planning and rescheduling are previewed before application.
- **Sound studio:** generated brown/pink/white noise and synthesized rain, ocean, wind, forest, fireplace, cafe, thunder, tonal instrumental and lo-fi textures. Real analyser spectrum, independent layer volume, fade in/out, preset and saved mixes, sleep timer. Imported audio is stored as local Blobs with favorites, recent playback, playlist labels, seek, volume, mute, loop and shuffle. Imported playback survives navigation.
- **Breaks:** recovery countdowns, stretch/eye-rest/hydration/walk prompts, configurable breathing cycle, and opt-in eye-rest reminders while the break page is open.
- **Study:** Markdown notes with safe rendered preview, task links and subject filtering; flashcard decks, flip/review workflow and deterministic spaced review intervals; exam countdowns and revision goals.
- **Analytics:** actual stored focus minutes, subject totals, estimated/actual comparison, productive-hour heatmap, workload distribution, task completion rate, session completion ratio and streak history. Today/7/30/90-day/custom filters; daily/weekly/monthly trend aggregation and CSV export.
- **Rewards:** optional XP, levels, daily/weekly goal notices, six achievements, permanent unlock records, personal best session and completion celebration. Rewards are keyed to their original task/session.
- **Utilities:** command palette, keyboard shortcuts, in-app notices, optional browser completion notifications, versioned JSON backup validation/preview/restore, task/session CSV export and confirmed local reset.

## Scheduling rules

The planner is a deterministic heuristic, not AI and not an optimization solver.

1. Take incomplete, unarchived tasks without a future calendar block.
2. Sort urgent → high → medium → low, then earliest due date, then manual order.
3. Expand existing recurring appointments and subtract their occupied intervals from the chosen day's working hours. Past time is unavailable.
4. Use remaining estimate (`estimate − actual`). Split into the smallest of preferred focus duration, maximum block, remaining work and the available interval.
5. Require the minimum block length, except for a task's final smaller remainder.
6. Insert a short break after the configured number of blocks, including across occupied intervals. Do not place study blocks after the task's deadline.
7. Report each remainder that cannot fit and explain the constraint.
8. Apply only after preview. Recheck conflicts inside a transaction. Rescheduling replaces future, unlocked blocks for incomplete tasks on the selected day; locked events remain untouched.

Manual events may overlap only after the user confirms the warning. Automatic events must not overlap. Changing a recurring calendar event edits the entire series; there is no per-occurrence exception editor.

## Time and data integrity

Timers store accumulated elapsed seconds plus a running wall-clock timestamp. The UI interval refreshes the display; it does not count time. Time spent in a sleeping/background tab is recovered on return, including after refresh. Countdown elapsed time is capped at the intended duration; stopwatch time is uncapped. Backward clock movement cannot produce negative elapsed time. A large manual clock change cannot be distinguished perfectly from sleep: forward changes can finish a countdown, and backward changes temporarily stop progression until the stored timestamp is reached.

Session insertion, task duration update, reward insertion and timer removal are atomic. Completion checks the session ID, preventing duplicate recording/rewards across concurrent tabs. Task switching saves the previous segment against its original task. A running timer is global to this browser database. Reset discards an active segment after confirmation; Skip saves it as incomplete.

Tasks can recur daily/weekly. Completing a recurring task creates one next occurrence and stores a unique recurrence ledger entry. Toggling the original task cannot create more copies or rewards. Deletion detaches task references from notes, sessions, events and the timer.

Dexie schema versions 1 and 2 are declared in `src/db/index.ts`; version 2 adds archive normalization. Backups have their own format version (currently 1). Import validates structure, durations, preferences, unique IDs, event intervals and task references before a transactional replacement.

## Browser limitations and remaining scope

- Local storage is per browser profile and origin. Private browsing, eviction, clearing site data or device loss can remove data. Export regular backups. Moving from localhost to a deployed URL requires exporting/importing your workspace.
- JSON backups include structured workspace data and saved mixes, but exclude imported audio binaries and the in-progress timer. Audio files remain in your library during restore. Reimport them on another browser.
- Audio requires a user gesture. Synthesized scenes are stylized sound textures, not licensed nature/cafe recordings. Imported formats depend on browser codecs. There is no streaming catalog.
- Reminders cannot reliably run when the site is closed or the browser suspends it. Wake lock, fullscreen and notifications depend on browser support and permission. Denial does not block the app.
- Calendar dragging uses hourly drop slots; precise minute changes are available in the editor. Recurring events are edited as a series. All-day entries are local midnight-to-midnight intervals. Multi-timezone collaboration and external calendars are not included.
- Study folders/decks and audio playlists are label-based groupings rather than nested folder trees. The review algorithm is intentionally simple: Again in one minute, Good doubles days with a one-day minimum, Easy triples days with a three-day minimum.
- Custom chart ranges are capped to 367 displayed days to keep charts responsive. Subject workloads and estimate/actual comparisons reflect current tasks; deleted task history remains in sessions.
- The optional PWA/service-worker installation, cloud sync, integrations and configurable motivational challenges are not included.
- Task details open in an editor rather than supporting title editing directly inside list rows. Board columns present statuses; dragging currently reorders tasks rather than changing their status. Use the editor to change status. Search includes subjects/tags, but there are no separate priority/tag filter menus.
- Calendar event duration is represented in the day/week grid, but overlapping manual events are not arranged into separate side-by-side lanes. The dashboard date strip opens the planner rather than selecting a particular date. Task-deletion undo restores task records, not previously detached relationships.
- Dashboard numbers update directly; not every metric has an animated counter. Notifications cover upcoming sessions, deadlines, goals, achievements and completions; conflicts appear as immediate warnings rather than stored notification-center entries.

## Architecture

`src/app` composes the application. `components` contains shared dialogs, shell, onboarding, task forms and media controls. `pages` contains lazy-loaded workspaces. `db` defines models and transactions; `services` owns timers, scheduling, audio, backup validation and reminders. Zustand holds transient UI/player state; Dexie owns durable records. `hooks` provides live queries and timer lifecycle; `utils` contains analytics/export helpers.

Fonts are bundled locally. Charts, Markdown and settings validation load with their respective pages. Audio nodes, object URLs, intervals and animation frames have cleanup paths. Native dialogs provide modal focus containment and Escape handling; focus returns to the launching control. Motion respects OS and application reduced-motion preferences.

## Deployment

### GitHub Pages

The repository includes `.github/workflows/pages.yml`. Set **Settings → Pages → Source** to **GitHub Actions**. Push to `main` to run lint, unit tests, the production build and Pages deployment. The workflow derives Vite's base path from GitHub Pages metadata so assets work under the repository URL. No secrets or API keys are needed in the app.

For a local subpath build, set `VITE_BASE_PATH=/zenith/` before `npm run build`. Normal local development defaults to `/`.

Run `npm run build` and deploy the generated **dist/** directory to any static HTTPS host (for example a static Nginx directory, Cloudflare Pages, Netlify or Firebase Hosting). Use the root base path or set Vite's `base` for a subdirectory deployment. No API keys or environment variables are required. HTTPS is required for notification and wake-lock support outside localhost.

No deployment has been performed automatically. Hosting does not provide data synchronization: each visitor still has an independent browser-local workspace.

## Design and verification artifacts

The generated primary dashboard direction is `docs/dashboard-concept.png`. Browser captures and the visual comparison ledger are under `docs/`. Concept statistics were replaced with honest empty states or user data; the goal ring shares the focus panel, and compact metrics replace the concept's unsupported productivity score. See `docs/VERIFICATION.md` for the executed checks and known verification boundaries.
