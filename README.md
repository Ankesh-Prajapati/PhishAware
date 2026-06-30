# PhishAware

PhishAware is a production-ready, frontend-only phishing awareness simulation platform. It runs directly in a browser, stores progress locally, and can be hosted as a static GitHub Pages site.

**[Live demo](https://ankesh-prajapati.github.io/PhishAware/)**

<!--
  Add a screenshot or short GIF of the dashboard / a simulation in progress here, e.g.:
  ![PhishAware dashboard](assets/screenshot-dashboard.png)
  A 10-second screen recording converted to GIF works well too - GitHub renders
  GIFs inline. This is the single highest-impact addition for anyone skimming
  the repo for 30 seconds.
-->

## Why I Built This

I work in security testing (VAPT, web/network/Chrome-extension assessments), and most phishing-awareness training I'd seen treated every example as obviously malicious - which trains pattern-matching, not judgment. PhishAware is built around realistic, full-fidelity replicas of the actual interfaces people get phished through (Gmail, Outlook, Microsoft/Google login, UPI payment screens, browser extension install prompts, OAuth consent pages) rather than text descriptions of attacks, with three distinct examples per category so the same lesson can't be learned by memorizing one fixed scenario. It's deliberately zero-backend: no server, no database, no account system, no data leaving the browser except optional anonymous page-view analytics - the entire platform is static HTML/CSS/JS that runs from any host, including a GitHub Pages URL with no setup.

## What's Technically Interesting Here

- **A content-generation guarantee, not a copy-paste**: the 12-question Final Exam isn't hand-authored - `data.js` builds it at load time from the other 12 categories, so it can never silently drift out of sync if a category's content changes later (see `docs/ARCHITECTURE.md`).
- **Tests that target the actual failure modes of this codebase**, not generic coverage: `tests/data-schema.test.mjs` checks every example's data against the exact fields the rendering code reads (extracted from the source, not memorized), and `tests/simulation-engine.test.mjs` drives all 13 pages through a real DOM (jsdom) to catch rendering bugs - both were built after finding real bugs by hand (a hardcoded icon left over from an earlier design, a clue losing its accessibility attributes after a secondary script rebuilt part of the page) and verified by deliberately reintroducing each bug and confirming the relevant test fails. See `CHANGELOG.md` for the specifics.
- **Defense-in-depth that's actually wired up, not just declared**: every CDN script is pinned with a real SHA-384 Subresource Integrity hash computed from the verified npm package (not assumed), and a same-origin Content-Security-Policy is enforced via `<meta>` on every page - a CSP that would have silently blocked third-party services like Google Analytics if I hadn't gone back and updated it when adding them.

## Features

- Twelve interactive phishing simulations, each walking through three distinct example scenarios in sequence (e.g. three different phishing emails, three different fake login pages) with its own tailored question, options, and explanation: email, fake login, QR, SMS, social media, business email compromise, MFA fatigue / push-bombing, banking OTP fraud, OAuth consent phishing, fake job offers, malicious browser extensions, and vishing / deepfake calls
- A Final Exam capstone: one question from every one of the 12 categories above, in randomized order, generated from the same content so it can never drift out of sync - completing it is required for the certificate, in addition to all 12 individual categories
- Realistic Gmail-style, Microsoft-style, mobile lock-screen, banking call/UPI, OAuth consent, social-feed, parking-payment, and Outlook-style training replicas
- Keyboard-accessible clue hotspots (Tab + Enter/Space) with visible focus rings, in addition to click/tap
- Immediate per-answer LocalStorage persistence, running scores, clue discovery, decision feedback, progress tracking, and attempt history
- Fisher-Yates randomized scenario cards and question order for every new attempt
- Active-time timers, response-time evidence, and speed bonuses for correct decisions - gated behind an explicit "Start simulation"/"Resume simulation" button so time spent reading the page first is never counted
- Exact resume after refresh, including question order, position, answers, feedback state, elapsed time, and running score
- Dashboard statistics with Chart.js bar and doughnut charts
- Training center with seven practical lessons
- Executive resilience report with risk posture, threat performance, evidence history, prioritized actions, and downloadable PDF
- LocalStorage persistence, responsive Bootstrap navigation, dark mode, and toast notifications
- Subresource Integrity (SRI) hashes and a same-origin Content-Security-Policy on every CDN asset
- Favicon, web app manifest, Open Graph/Twitter preview image, `robots.txt`, `sitemap.xml`, and a custom 404 page
- A small Node-based unit test suite for the scoring/storage logic, run automatically via GitHub Actions on every push
- No backend, database, authentication, API calls, package manager, or build process to *run* the site (a `package.json` exists only to run the optional dev tests/linting below)

## Folder Structure

```text
.
|-- index.html
|-- dashboard.html
|-- simulations.html
|-- email-phishing.html
|-- fake-login.html
|-- qr-phishing.html
|-- smishing.html
|-- social-media-scam.html
|-- ceo-fraud.html
|-- mfa-fatigue.html
|-- upi-fraud.html
|-- oauth-consent.html
|-- job-offer-scam.html
|-- malicious-extension.html
|-- vishing-deepfake.html
|-- final-exam.html
|-- training.html
|-- report.html
|-- certificate.html
|-- 404.html
|-- robots.txt
|-- sitemap.xml
|-- package.json
|-- package-lock.json
|-- .htmlvalidate.json
|-- .gitignore
|-- CHANGELOG.md
|-- assets/
|   |-- favicon.svg
|   |-- og-image.png
|   |-- site.webmanifest
|   |-- icons/
|   |   |-- icon-16.png
|   |   |-- icon-32.png
|   |   |-- icon-192.png
|   |   |-- icon-512.png
|   |   `-- apple-touch-icon.png
|   |-- css/
|   |   |-- styles.css
|   |   |-- realistic.css
|   |   `-- certificate.css
|   `-- js/
|       |-- app.js
|       |-- analytics.js
|       |-- certificate.js
|       |-- dashboard.js
|       |-- data.js
|       |-- landing.js
|       |-- login-enhancement.js
|       |-- report.js
|       |-- simulation.js
|       |-- simulations.js
|       |-- storage.js
|       `-- training.js
|-- tests/
|   |-- storage.test.mjs
|   |-- data-schema.test.mjs
|   `-- simulation-engine.test.mjs
|-- .github/
|   `-- workflows/
|       `-- ci.yml
`-- docs/
    |-- ARCHITECTURE.md
    |-- DEPLOYMENT.md
    `-- USER_GUIDE.md
```

## Run Locally

Open `index.html` in a current browser. No local server or installation is required. An internet connection is needed on first load for the pinned Bootstrap, Bootstrap Icons, Chart.js, and jsPDF CDN assets, each loaded with a Subresource Integrity (SRI) hash.

For an offline deployment, download those vendor files (Bootstrap CSS/JS, Bootstrap Icons CSS, Chart.js, jsPDF), place them under `assets/vendor`, and update the corresponding `script`/`link` elements in each HTML page. Self-hosting unmodified copies of the same versions keeps the existing `integrity` attributes valid; if you swap in different versions, regenerate the hashes (`openssl dgst -sha384 -binary file.js | openssl base64 -A`) or the browser will refuse to load the file.

## GitHub Pages

1. Create a GitHub repository and add the entire project at the repository root.
2. Push the files to the `main` branch.
3. In GitHub, open **Settings > Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose `main`, select `/ (root)`, and click **Save**.
6. Open the published URL shown by GitHub after deployment finishes.
7. Replace the placeholder `https://your-username.github.io/your-repo/` with your real published URL across `robots.txt`, `sitemap.xml`, and the `canonical`/`og:url`/`og:image`/`twitter:image` tags in each HTML file (a single find-and-replace works, since the placeholder string is identical everywhere). This isn't required for the app to function - it only affects social-share previews and search engine indexing.

All links are relative, so the app works both on a user site and under a repository subpath. More detail is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Data and Privacy

All scores, attempt history, lesson completion, and theme preferences stay in the browser's LocalStorage. PDF reports are generated locally. Clearing site data or using **Reset** on the report page removes learning records for that browser and origin. Existing `V1` progress is automatically migrated to the versioned `V2` schema. None of this learning data is ever sent anywhere - the simulations, scoring, and reports work entirely offline once the page is loaded.

Separately, every page loads Google Analytics (GA4) for page-view and interaction tracking, configured in `assets/js/analytics.js` with the tracking ID hardcoded in both that file and the `<script async src="https://www.googletagmanager.com/gtag/js?id=...">` tag on every page. This sends standard GA4 analytics data (page views, browser/device info, approximate location) to Google and sets GA's cookies - update the ID in both places, or delete both script tags plus the CSP allowances for `googletagmanager.com`/`google-analytics.com`, if you fork this for your own deployment. If this matters for where you publish it, consider whether a cookie notice is appropriate for your audience.

## Browser Support

Use a current version of Chrome, Edge, Firefox, or Safari. JavaScript and LocalStorage must be enabled.

## Customizing Scenarios

Edit `PA_SCENARIOS` in `assets/js/data.js`. Each scenario has a stable `id`, page route, question, answer index, explanation, and clue list. Training lessons live in `PA_TRAINING`, and the per-scenario follow-up question bank lives in `PA_QUESTION_BANK`, in the same file. Keep scenario IDs stable after launch so existing LocalStorage records remain associated with the correct exercise. Adding a scenario also needs a matching HTML page (copy an existing one and update `data-page`/`data-scenario`), a sidebar entry in `assets/js/app.js`, and an artifact renderer branch in `renderArtifact()` in `assets/js/simulation.js`.

**A scope note worth knowing if you keep adding categories:** the certificate currently requires completing all 12 individual categories *and* the 12-question Final Exam - this happened automatically as a side effect of `PACertificateEligibility()` in `app.js` iterating over every entry in `PA_SCENARIOS` generically, with no separate gating logic. That's a reasonable choice for "this represents thorough, comprehensive training," but if the goal drifts back toward "a quick but genuine individual awareness check," it's worth deciding on purpose rather than by accumulation - either trim the certificate requirement to a subset of categories, or split the Final Exam out of the requirement so it stays an optional capstone instead of a mandatory 13th step.

## Security

- Every CDN-loaded script and stylesheet (Bootstrap, Bootstrap Icons, Chart.js, jsPDF) is pinned with a SHA-384 Subresource Integrity hash and `crossorigin="anonymous"`, so a compromised or modified CDN file will simply fail to load rather than execute silently.
- Each page sets a same-origin Content-Security-Policy via a `<meta>` tag (`default-src 'self'`, with explicit allowances for the jsDelivr CDN, Google Analytics' `googletagmanager.com`/`google-analytics.com`/`analytics.google.com`, and the inline `style` attributes this app's progress bars and charts rely on). No inline or remote script execution outside that policy is permitted - if you remove Google Analytics, tighten the CSP back down to just the jsDelivr allowances (see `CHANGELOG.md` v1.5.0 for the exact prior policy).
- All learner-supplied input that's reflected back to the page (the certificate recipient name) is HTML-escaped before insertion.
- Static hosts like GitHub Pages can't set the `frame-ancestors` CSP directive or `X-Frame-Options` header (browsers ignore `frame-ancestors` delivered via `<meta>`), so this app has no built-in clickjacking protection beyond what your CDN/host adds. Front it with Cloudflare or a similar edge proxy if that matters for your deployment.

## Development

The app itself has no build step, but a small dev-only toolchain exists to catch regressions before they ship:

```bash
npm install       # fetches jsdom and html-validate (dev-only - the deployed site needs none of this)
npm test          # runs everything in tests/
npm run lint:html # structural HTML validation (catches things like duplicate ids or unescaped entities)
```

`npm test` runs three suites:
- `tests/storage.test.mjs` - the scoring, summary, and certificate logic in `storage.js` (no DOM, no dependencies).
- `tests/data-schema.test.mjs` - checks every example variant in `data.js` has exactly the `fields`/`clues` keys its `renderArtifact` branch in `simulation.js` reads, a well-formed question/options/answer, and that icon-bearing fields are distinct across a scenario's 3 variants. Catches a content/code mismatch (a missing field, a typo'd key) immediately instead of someone noticing a broken example by eye.
- `tests/simulation-engine.test.mjs` - drives each of the 12 scenario pages plus the Final Exam through a real (jsdom) DOM, and asserts: the examples are actually distinct, every clue stays keyboard-accessible at every step, the simulation reaches completion, for scenario types with a brand/poster/visual icon that each example shows its own icon and never a sibling's, and that the Final Exam's 12 cross-category questions each render their own correct artifact type.

The last two exist because of two real bugs found by hand while building the multi-example feature (see `CHANGELOG.md` v1.2.0/v1.2.1) that neither a unit test nor an HTML validator would have caught - one was a rendering-engine state bug, the other a hardcoded icon left over from an earlier single-example design. `.github/workflows/ci.yml` runs the full suite plus HTML validation on every push and pull request to `main`.
