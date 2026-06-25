# Changelog

All notable changes to this project are documented here.

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
