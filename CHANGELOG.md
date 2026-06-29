# Changelog

All notable changes to this project are documented here.

## v2.0.0

### Added

- Three new simulation categories (9 new examples total, 3 variants each): **Fake Job Offer** (WhatsApp/Telegram/email recruitment scams), **Malicious Browser Extension** (fake update/extension install prompts), and **Vishing / Deepfake Call** (including AI voice-cloning of a boss or family member).
- **Final Exam**: a 13th, capstone entry that pulls one question from every one of the 12 categories into a single 12-question assessment, in randomized order. Its question bank isn't hand-authored - `data.js` generates it from the other categories so it can never drift out of sync with them. Shown last in the Simulation Selection catalog with a distinct gold "Capstone" badge instead of a difficulty badge.
- Completing the Final Exam is now required for the certificate, alongside all 12 individual categories - this falls out automatically from the existing certificate-eligibility logic (which already iterated over every entry in `PA_SCENARIOS` generically), no special-case gating code was needed.
- An 8th training lesson, "Job Offers, Extensions, and Voice Calls," covering the three new categories.
- A new `tests/simulation-engine.test.mjs` test specifically for the Final Exam, verifying all 12 cross-category questions render their own correct artifact type rather than falling through to the empty state.
- `tests/data-schema.test.mjs` extended to validate the 3 new categories' content, plus a dedicated check that every Final Exam variant is valid against the schema of the category it was generated from.

### Fixed

- A genuine content/clue mismatch in the new Vishing artifact: a line describing what the caller was asking the user to do was tagged with a clue about the call being unsolicited - unrelated text and explanation. Caught during testing, before shipping, by manually reviewing each new artifact's clue wiring rather than only relying on automated checks (which can't judge whether a clue's *content* makes sense for the element it's attached to, only whether something is present).

## v1.5.0

### Added

- Google Analytics (GA4) page-view and interaction tracking on every page, via the standard `gtag.js` loader plus a small local `assets/js/analytics.js` holding the tracking ID (`G-ED9BYX2YY0`) in one place.

### Changed

- The Content-Security-Policy `<meta>` tag on every page now also allows `googletagmanager.com`, `google-analytics.com`, and `analytics.google.com` in `script-src`/`connect-src`/`img-src`, so the tracker can actually load and send data under the policy - previously it only allowed jsDelivr. The exact prior, narrower policy (jsDelivr-only) was:
  `default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self' https://cdn.jsdelivr.net data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`
- README's "Data and Privacy" section now discloses the GA integration explicitly, since it sends data externally - everything else in that section (LocalStorage-only learning data) is unchanged.

## v1.4.0

### Fixed

- The session and per-question timers (and therefore speed-bonus eligibility) used to start the instant a simulation page finished loading, with no indication to the learner that the clock was already running - time spent just reading the page intro counted against the first question's speed bonus. Every simulation entry, fresh or resumed, now shows an explicit "Start simulation" / "Resume simulation" button first; the timer is hidden and inactive until that button is clicked, at which point it starts from the correct baseline (zero for a fresh question, or the previously-saved cumulative session time for a resume - verified directly, not just inferred).
- Added a dedicated test (`tests/simulation-engine.test.mjs`) asserting the timer bar stays hidden and no question is answerable before the Start/Resume click, and that the question timer reads ~00:00 immediately after.

## v1.3.0

### Added

- `tests/data-schema.test.mjs`: validates every example variant in `data.js` against the exact `fields`/`clues` keys its `renderArtifact` branch reads (extracted directly from the `simulation.js` source, not from memory), plus question/options/answer shape and per-scenario icon-field uniqueness.
- `tests/simulation-engine.test.mjs`: drives all 9 scenario pages through a real DOM (jsdom) across all 3 example steps and asserts the examples are genuinely distinct, every clue stays keyboard-accessible at every step, the simulation reaches completion, and each example's brand/poster/visual icon matches its own data rather than a sibling's.
- `jsdom` added as a real devDependency (previously only installed ad hoc); `.github/workflows/ci.yml`'s test job now runs `npm install` first.

Both new suites were built by formalizing the exact manual browser-walkthrough process used to find the v1.2.0/v1.2.1 bugs, and were verified against this codebase by deliberately reintroducing each of those bugs and confirming the relevant test fails, then restoring the fix.

## v1.2.1

### Fixed

- Three example variants kept a hardcoded icon from the original single-variant design even though their brand/theme text changed: the Google and generic VPN-portal login examples still showed the Microsoft logo, all three QR-poster examples showed the parking icon, and all three social-media examples showed a gift icon regardless of whether the scam was a prize, a crypto pitch, or a fake verification badge. Each variant's icon now comes from its own data (`brandIcon`, `posterIcon`, `visualIcon`), fixed in both the initial render and (for the login form) the script that rebuilds it after the page loads.

## v1.2.0

### Added

- Every simulation now walks through three distinct example scenarios in sequence (e.g. three different phishing emails, three different fake login pages, three different QR posters) instead of showing one fixed example for all three questions. All 27 examples (9 scenarios x 3 variants) have their own realistic artifact content, four tailored clues, and a dedicated question/answer/explanation.
- A `pa:artifact-rendered` event, dispatched after every example renders, so page-specific enhancement scripts can react to each step rather than only the first.

### Changed

- `PA_SCENARIOS` entries no longer carry an unused single `question`/`options`/`clues` set (gameplay always read from the question bank; this dead data was removed for clarity).
- `login-enhancement.js` was rewritten to read the active example's brand/content/clue text dynamically and rebuild itself on every step, instead of a one-time hardcoded Microsoft-only form. It also no longer auto-selects an answer on form submit - it clears the fields and lets the learner choose.

### Fixed

- The fake-login example's password-manager clue lost its keyboard accessibility (`tabindex`/`role`) after the form-enhancement script rebuilt that part of the page - it's now reapplied every time that script runs.
- The Chart.js CDN reference pointed at `chart.umd.min.js`, a path jsDelivr only ever generates on the fly for that package rather than a real pinned file - switched to the actual static `chart.umd.js` (already-minified despite the name) so the Subresource Integrity hash is meaningful.

## v1.1.0

### Added

- Three new simulations: **MFA Fatigue / Push-Bombing**, **Banking OTP Fraud**, and **OAuth Consent Phishing**, each with its own realistic artifact mockup, three-question bank, and entry in the sidebar and simulation catalog.
- A seventh training lesson, "OTPs, MFA Prompts, and App Permissions," tying the three new scenarios together.
- Favicon (SVG + PNG fallbacks), web app manifest, and an Open Graph/Twitter social-preview image.
- `robots.txt`, `sitemap.xml`, and a branded custom `404.html` for GitHub Pages.
- Subresource Integrity (SHA-384) hashes and `crossorigin="anonymous"` on every CDN-loaded script/stylesheet.
- A same-origin Content-Security-Policy `<meta>` tag on every page.
- A small Node-based unit test suite (`tests/storage.test.mjs`, run via `node --test`) covering the scoring, summary, and certificate-issuance logic in `storage.js`.
- A GitHub Actions workflow (`.github/workflows/ci.yml`) running the unit tests and an HTML structural-validation check on every push and pull request.
- `package.json`, `.htmlvalidate.json`, and `.gitignore` to support the dev tooling above (no effect on the deployed static site).

### Changed

- Clue hotspots are now keyboard-accessible: focusable (`tabindex="0"`), announced as buttons (`role="button"`, `aria-label`), activatable with Enter/Space, and given a visible focus ring - not just clickable with a pointer.
- The Chart.js CDN reference now points at the real static `chart.umd.js` file (already-minified content despite the filename) instead of `chart.umd.min.js`, which jsDelivr only ever generated on the fly for that package - not a stable, hashable artifact suitable for SRI pinning.
- Certificate and page-copy text that hardcoded "six" scenarios/lessons now reads the live counts from `PA_SCENARIOS`/`PA_TRAINING`, so it stays accurate as scenarios are added or removed.
- Fixed unescaped `&` characters in `report.html`'s title/meta tags, the sidebar's "Score & Report" label, and the fake Microsoft login footer's "Privacy & cookies" text.
- Documentation (`README.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/USER_GUIDE.md`) updated for the new scenario/lesson counts, the corrected risk-score weighting (60/25/15, not 80/20), and the security/SEO/tooling additions above.

## v1.0.0

Initial release: six interactive phishing simulations (email, fake login, QR, SMS, social media, business email compromise), six training lessons, dashboard/report/certificate pages, LocalStorage persistence, and jsPDF export - frontend-only, no build process.

### Added

- Three new simulations: **MFA Fatigue / Push-Bombing**, **Banking OTP Fraud**, and **OAuth Consent Phishing**, each with its own realistic artifact mockup, three-question bank, and entry in the sidebar and simulation catalog.
- A seventh training lesson, "OTPs, MFA Prompts, and App Permissions," tying the three new scenarios together.
- Favicon (SVG + PNG fallbacks), web app manifest, and an Open Graph/Twitter social-preview image.
- `robots.txt`, `sitemap.xml`, and a branded custom `404.html` for GitHub Pages.
- Subresource Integrity (SHA-384) hashes and `crossorigin="anonymous"` on every CDN-loaded script/stylesheet.
- A same-origin Content-Security-Policy `<meta>` tag on every page.
- A small Node-based unit test suite (`tests/storage.test.mjs`, run via `node --test`) covering the scoring, summary, and certificate-issuance logic in `storage.js`.
- A GitHub Actions workflow (`.github/workflows/ci.yml`) running the unit tests and an HTML structural-validation check on every push and pull request.
- `package.json`, `.htmlvalidate.json`, and `.gitignore` to support the dev tooling above (no effect on the deployed static site).

### Changed

- Clue hotspots are now keyboard-accessible: focusable (`tabindex="0"`), announced as buttons (`role="button"`, `aria-label`), activatable with Enter/Space, and given a visible focus ring - not just clickable with a pointer.
- The Chart.js CDN reference now points at the real static `chart.umd.js` file (already-minified content despite the filename) instead of `chart.umd.min.js`, which jsDelivr only ever generated on the fly for that package - not a stable, hashable artifact suitable for SRI pinning.
- Certificate and page-copy text that hardcoded "six" scenarios/lessons now reads the live counts from `PA_SCENARIOS`/`PA_TRAINING`, so it stays accurate as scenarios are added or removed.
- Fixed unescaped `&` characters in `report.html`'s title/meta tags, the sidebar's "Score & Report" label, and the fake Microsoft login footer's "Privacy & cookies" text.
- Documentation (`README.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/USER_GUIDE.md`) updated for the new scenario/lesson counts, the corrected risk-score weighting (60/25/15, not 80/20), and the security/SEO/tooling additions above.

## v1.0.0

Initial release: six interactive phishing simulations (email, fake login, QR, SMS, social media, business email compromise), six training lessons, dashboard/report/certificate pages, LocalStorage persistence, and jsPDF export - frontend-only, no build process.
