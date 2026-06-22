# PhishAware

PhishAware is a production-ready, frontend-only phishing awareness simulation platform. It runs directly in a browser, stores progress locally, and can be hosted as a static GitHub Pages site.

## Features

- Six interactive phishing simulations with three scored questions each: email, fake login, QR, SMS, social media, and business email compromise
- Realistic Gmail-style, Microsoft-style, mobile, social-feed, parking-payment, and Outlook-style training replicas
- Immediate per-answer LocalStorage persistence, running scores, clue discovery, decision feedback, progress tracking, and attempt history
- Fisher-Yates randomized scenario cards and question order for every new attempt
- Active-time timers, response-time evidence, and speed bonuses for correct decisions
- Exact resume after refresh, including question order, position, answers, feedback state, elapsed time, and running score
- Dashboard statistics with Chart.js bar and doughnut charts
- Training center with six practical lessons
- Executive resilience report with risk posture, threat performance, evidence history, prioritized actions, and downloadable PDF
- LocalStorage persistence, responsive Bootstrap navigation, dark mode, and toast notifications
- No backend, database, authentication, API calls, package manager, or build process

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
|-- training.html
|-- report.html
|-- assets/
|   |-- css/
|   |   |-- styles.css
|   |   `-- realistic.css
|   `-- js/
|       |-- app.js
|       |-- dashboard.js
|       |-- data.js
|       |-- landing.js
|       |-- login-enhancement.js
|       |-- report.js
|       |-- simulation.js
|       |-- simulations.js
|       |-- storage.js
|       `-- training.js
`-- docs/
    |-- ARCHITECTURE.md
    |-- DEPLOYMENT.md
    `-- USER_GUIDE.md
```

## Run Locally

Open `index.html` in a current browser. No local server or installation is required. An internet connection is needed on first load for the pinned Bootstrap, Bootstrap Icons, Chart.js, and jsPDF CDN assets.

For an offline deployment, download those four vendor files, place them under `assets/vendor`, and update the corresponding `script` and `link` elements in each HTML page.

## GitHub Pages

1. Create a GitHub repository and add the entire project at the repository root.
2. Push the files to the `main` branch.
3. In GitHub, open **Settings > Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose `main`, select `/ (root)`, and click **Save**.
6. Open the published URL shown by GitHub after deployment finishes.

All links are relative, so the app works both on a user site and under a repository subpath. More detail is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Data and Privacy

All scores, attempt history, lesson completion, and theme preferences stay in the browser's LocalStorage. PDF reports are generated locally. Clearing site data or using **Reset** on the report page removes learning records for that browser and origin. Existing `V1` progress is automatically migrated to the versioned `V2` schema.

## Browser Support

Use a current version of Chrome, Edge, Firefox, or Safari. JavaScript and LocalStorage must be enabled.

## Customizing Scenarios

Edit `PA_SCENARIOS` in `assets/js/data.js`. Each scenario has a stable `id`, page route, question, answer index, explanation, and clue list. Training lessons live in `PA_TRAINING` in the same file. Keep scenario IDs stable after launch so existing LocalStorage records remain associated with the correct exercise.
