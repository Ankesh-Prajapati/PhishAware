# Architecture

## Runtime Model

PhishAware is a static multi-page application. Every route loads a shared application shell from `assets/js/app.js`, which renders the sidebar, top bar, toast area, theme control, and progress indicator. Page-specific scripts render their content into `#appContent` after the `pa:ready` event.

## Modules

- `data.js`: scenario and training datasets; no external data is requested.
- `storage.js`: versioned LocalStorage schema, migration, validation, attempt history, CRUD helpers, scoring summaries, and risk calculation.
- `app.js`: shared layout, navigation, storage adapter, aggregate statistics, dark mode, responsive sidebar, and toasts.
- `simulation.js`: randomized, timed multi-question engine selected by each page's `data-scenario` attribute; records every answer immediately, awards bounded speed bonuses, autosaves active sessions, and restores question or feedback state without duplicate records.
- `dashboard.js`: summary metrics and Chart.js visualizations.
- `simulations.js`: scenario catalog and completion state.
- `training.js`: training lesson rendering and completion controls.
- `report.js`: attempt statistics, latest and best scores, decision history, risk recommendations, report chart, reset flow, and jsPDF export.
- `certificate.js`: certificate eligibility check, HTML-escaped recipient rendering, and jsPDF certificate export.
- `login-enhancement.js`: isolated fake-login form behavior that clears fields without reading, retaining, or transmitting their contents.
- `realistic.css`: contained application-replica and executive-report styling, separated from the minified core design system.
- `landing.js`: redirects the root page to the dashboard for returning users or the selection page for new users.

## Persistence

Application records use LocalStorage key `phishAwareStateV2`. The stored object contains latest and best scenario results, bounded attempt history, completed training lessons, profile timestamps, and resumable sessions. A session stores randomized question IDs, current position, submitted answers, phase, active elapsed time, and question elapsed time. Theme choice uses `phishAwareTheme`. Data saved under `phishAwareStateV1` is migrated automatically on first read.

The versioned key permits future migrations without mixing incompatible data formats. The storage wrapper tolerates absent or invalid JSON and falls back to a clean state.

## Scoring

Each simulation contains three questions in a shuffled order. Every selected answer is written immediately as an immutable attempt record with its question ID, decision, correctness, response time, and points. Correct answers receive 80 base points plus a speed bonus: 20 within 10 seconds, 15 within 20, 10 within 30, 5 within 45, then zero. Incorrect answers receive zero. The scenario score is the running average and is updated after every question.

The risk score begins at 100 and is reduced by a weighted resilience score: average best scenario score contributes 60 percent, the overall correct-decision rate contributes 25 percent, and training lesson completion contributes 15 percent. Report labels are Low below 25, Medium below 55, and High at 55 or above.

## Security and Privacy

No credentials or personal data are requested. Links shown inside simulated malicious content are non-navigable or use reserved `.example` domains. User state never leaves the browser. CDN dependencies are version-pinned with SHA-384 Subresource Integrity hashes, and each page enforces a same-origin Content-Security-Policy; high-assurance deployments can self-host these files (see `README.md`). Clue hotspots are reachable and operable by keyboard (`tabindex`, `role="button"`, Enter/Space activation), not just pointer devices.
