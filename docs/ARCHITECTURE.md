# Architecture

## Runtime Model

PhishAware is a static multi-page application. Every route loads a shared application shell from `assets/js/app.js`, which renders the sidebar, top bar, toast area, theme control, and progress indicator. Page-specific scripts render their content into `#appContent` after the `pa:ready` event.

## Modules

- `data.js`: scenario catalog, training lessons, and a per-scenario question bank of three example variants (each with its own artifact content, clue set, question, and explanation); no external data is requested. The Final Exam's question bank is not hand-authored - it's generated from the other categories (one variant from each, tagged with its source category) so it can never drift out of sync with them.
- `storage.js`: versioned LocalStorage schema, migration, validation, attempt history, CRUD helpers, scoring summaries, and risk calculation.
- `app.js`: shared layout, navigation, storage adapter, aggregate statistics, dark mode, responsive sidebar, and toasts.
- `simulation.js`: randomized, timed multi-question engine selected by each page's `data-scenario` attribute; gates every entry to a simulation - fresh or resumed - behind an explicit "Start simulation"/"Resume simulation" button, so the timer and speed bonus never start counting before the learner has chosen to begin; renders a different example artifact for each of the three questions in shuffled order, records every answer immediately, awards bounded speed bonuses, autosaves active sessions, restores question or feedback state without duplicate records, and dispatches a `pa:artifact-rendered` event (with the active scenario ID and variant) after each artifact render so page-specific scripts can react to every example, not just the first.
- `dashboard.js`: summary metrics and Chart.js visualizations.
- `simulations.js`: scenario catalog and completion state.
- `training.js`: training lesson rendering and completion controls.
- `report.js`: attempt statistics, latest and best scores, decision history, risk recommendations, report chart, reset flow, and jsPDF export.
- `certificate.js`: certificate eligibility check, HTML-escaped recipient rendering, and jsPDF certificate export.
- `login-enhancement.js`: isolated fake-login form behavior, listening for `pa:artifact-rendered` so it rebuilds the simulated sign-in form for every example variant shown (not just the first); clears fields without reading, retaining, or transmitting their contents, and never auto-selects an answer on submit.
- `realistic.css`: contained application-replica and executive-report styling, separated from the minified core design system.
- `landing.js`: redirects the root page to the dashboard for returning users or the selection page for new users.

## Persistence

Application records use LocalStorage key `phishAwareStateV2`. The stored object contains latest and best scenario results, bounded attempt history, completed training lessons, profile timestamps, and resumable sessions. A session stores randomized question IDs, current position, submitted answers, phase, active elapsed time, and question elapsed time. Theme choice uses `phishAwareTheme`. Data saved under `phishAwareStateV1` is migrated automatically on first read.

The versioned key permits future migrations without mixing incompatible data formats. The storage wrapper tolerates absent or invalid JSON and falls back to a clean state.

## Scoring

Each of the 12 regular simulations contains three questions in a shuffled order, each paired with a different example artifact (a different phishing email, login page, message, etc., depending on the scenario type) rather than one shared example. Every selected answer is written immediately as an immutable attempt record with its question ID, decision, correctness, response time, and points. Correct answers receive 80 base points plus a speed bonus: 20 within 10 seconds, 15 within 20, 10 within 30, 5 within 45, then zero. Incorrect answers receive zero. The scenario score is the running average and is updated after every question.

## Final Exam

`final-exam.html` is a 13th entry in `PA_SCENARIOS`, but its question bank isn't separately authored: `data.js` builds it by taking the first variant from each of the other 12 categories and tagging it with `_artifactType` so `simulation.js` knows which `renderArtifact` branch to use for that specific question (each question in the exam belongs to a different category, unlike a regular simulation where every question shares the page's own type). The 12 questions are shuffled and answered exactly like a regular simulation, scored and stored under its own `scenarioId` of `final-exam` so it never mixes into the per-category practice stats shown elsewhere.

Because `PACertificateEligibility()` in `app.js` iterates over all of `PA_SCENARIOS` generically, the Final Exam is automatically included as a required category for certificate eligibility alongside the 12 regular ones - no separate gating logic exists or is needed.

The risk score begins at 100 and is reduced by a weighted resilience score: average best scenario score contributes 60 percent, the overall correct-decision rate contributes 25 percent, and training lesson completion contributes 15 percent. Report labels are Low below 25, Medium below 55, and High at 55 or above.

## Security and Privacy

No credentials or personal data are requested. Links shown inside simulated malicious content are non-navigable or use reserved `.example` domains. User state never leaves the browser. CDN dependencies are version-pinned with SHA-384 Subresource Integrity hashes, and each page enforces a same-origin Content-Security-Policy; high-assurance deployments can self-host these files (see `README.md`). Clue hotspots are reachable and operable by keyboard (`tabindex`, `role="button"`, Enter/Space activation), not just pointer devices.
