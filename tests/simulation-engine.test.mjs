// Integration tests for the simulation engine (assets/js/simulation.js +
// assets/js/login-enhancement.js), driven through a real DOM via jsdom.
//
// These exist because the two real bugs found while building the
// multi-example feature - a clue losing its keyboard-accessibility
// attributes after login-enhancement.js rebuilt the form, and three login
// variants all showing the Microsoft icon regardless of brand - were both
// rendering-engine bugs that node --test in tests/storage.test.mjs and
// tests/data-schema.test.mjs cannot see, because neither touches the DOM.
// This file formalizes the manual browser-walkthrough script used to find
// those bugs into something that runs on every push.
//
// Run with: node --test tests/simulation-engine.test.mjs   (or just `node --test`)
// Requires jsdom (a devDependency - run `npm install` first).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jsdomPkg from 'jsdom';

const { JSDOM } = jsdomPkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.join(__dirname, '..');

const SAFETY_BANNER = 'Training simulation - no links, codes, or credentials leave this browser.';

// jsdom has no real layout/CSS/Bootstrap-JS engine, so these two errors are
// environment limitations, not application bugs - PAToast() calling into the
// (intentionally not loaded) Bootstrap CDN bundle, and Element#scrollIntoView
// not being implemented. Anything else thrown is a real failure.
const IGNORABLE_ERRORS = [/bootstrap is not defined/, /scrollIntoView is not a function/];

// For scenario types whose artifact carries a brand/poster/visual icon that
// should change with the variant (this is exactly the bug class found and
// fixed in v1.2.1), `identifyField` is a fields.* key whose value is unique
// per variant and appears verbatim in the rendered artifact text, used to
// work out which of the 3 variants is on screen at a given step.
const ICON_CHECKS = {
  login: { identifyField: 'tabTitle', iconField: 'brandIcon' },
  qr: { identifyField: 'posterTitle', iconField: 'posterIcon' },
  social: { identifyField: 'prizeLabel', iconField: 'visualIcon' },
  smishing: { identifyField: 'contactName', iconField: 'contactIcon' },
  'oauth-consent': { identifyField: 'appName', iconField: 'appIcon' },
};

const PAGES = [
  'email-phishing.html', 'fake-login.html', 'qr-phishing.html', 'smishing.html',
  'social-media-scam.html', 'ceo-fraud.html', 'mfa-fatigue.html', 'upi-fraud.html', 'oauth-consent.html',
];

function loadPage(pageFile) {
  const errors = [];
  let html = fs.readFileSync(path.join(projectDir, pageFile), 'utf8');
  const localScripts = [...html.matchAll(/<script src="(assets\/js\/[^"]+)"[^>]*><\/script>/g)].map(m => m[1]);
  html = html.replace(/<script[^>]*><\/script>/g, '');

  const dom = new JSDOM(html, { url: `https://example.org/${pageFile}`, runScripts: 'dangerously', pretendToBeVisual: true });
  dom.window.addEventListener('error', (e) => {
    const msg = String((e.error && e.error.message) || e.message || '');
    if (!IGNORABLE_ERRORS.some(re => re.test(msg))) errors.push(msg);
  });

  for (const src of localScripts) {
    dom.window.eval(fs.readFileSync(path.join(projectDir, src), 'utf8'));
  }
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));

  return { dom, errors, scenarioId: dom.window.document.body.dataset.scenario };
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Drives all 3 questions to completion, recording per-step artifact text,
// clue accessibility, and the active variant's identifying field (used by
// the icon checks below).
async function walkThrough({ dom, scenarioId }) {
  await wait(200);
  const doc = dom.window.document;
  const bank = dom.window.PA_QUESTION_BANK[scenarioId];
  const steps = [];

  const startBtn = doc.getElementById('startSimBtn');
  assert.ok(startBtn, 'expected a Start/Resume simulation button before the first question renders');
  startBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await wait(30);

  for (let i = 0; i < 3; i++) {
    const artifact = doc.getElementById('artifactStage');
    const rawHtml = artifact.innerHTML;
    const text = artifact.textContent.replace(SAFETY_BANNER, '').trim();
    const clues = [...artifact.querySelectorAll('.clue')];
    steps.push({
      text,
      rawHtml,
      cluesAccessible: clues.length > 0 && clues.every(el => el.getAttribute('tabindex') === '0' && el.getAttribute('role') === 'button'),
      clueCount: clues.length,
    });

    const optionBtn = doc.querySelector('.option-btn');
    if (!optionBtn) break;
    optionBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await wait(30);
    const nextBtn = doc.getElementById('nextQuestion');
    if (nextBtn) {
      nextBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      await wait(30);
    }
  }

  const completionText = doc.getElementById('questionCard')?.textContent || '';
  return { steps, bank, completed: /scored|complete/i.test(completionText) };
}

test('fake-login.html: timer stays hidden and inactive until Start is clicked', async () => {
  const loaded = loadPage('fake-login.html');
  try {
    await wait(200);
    const doc = loaded.dom.window.document;

    const timerBar = doc.getElementById('timerBar');
    assert.ok(timerBar.classList.contains('d-none'), 'timer bar should be hidden before the user clicks Start');
    assert.equal(doc.querySelector('.option-btn'), null, 'no answerable question should render before the user clicks Start');
    const startBtn = doc.getElementById('startSimBtn');
    assert.ok(startBtn, 'a Start simulation button should be shown instead');
    assert.match(startBtn.textContent, /Start simulation/);

    // Time passing before the click must never count against the user -
    // this is the actual bug report: the clock used to start at page load.
    await wait(150);
    startBtn.dispatchEvent(new loaded.dom.window.MouseEvent('click', { bubbles: true }));
    await wait(30);

    assert.ok(!doc.getElementById('timerBar').classList.contains('d-none'), 'timer bar should become visible once Start is clicked');
    assert.ok(doc.querySelector('.option-btn'), 'the first question should render once Start is clicked');
    const questionTimerText = doc.getElementById('questionTimer').textContent;
    assert.equal(questionTimerText, '00:00', `question timer should read close to 00:00 right after starting, not include the pre-click wait (got ${questionTimerText})`);
  } finally {
    loaded.dom.window.close();
  }
});

for (const pageFile of PAGES) {
  test(`${pageFile}: walks through 3 distinct, accessible examples and completes`, async () => {
    const loaded = loadPage(pageFile);
    try {
      const { steps, completed } = await walkThrough(loaded);

      assert.equal(steps.length, 3, `${pageFile}: expected 3 question steps`);

      const distinctTexts = new Set(steps.map(s => s.text));
      assert.equal(distinctTexts.size, 3, `${pageFile}: all 3 steps should show different example content, got ${steps.length - distinctTexts.size} duplicate(s)`);

      steps.forEach((step, i) => {
        assert.ok(step.text.length > 0, `${pageFile} step ${i}: artifact should not be empty`);
        assert.ok(step.cluesAccessible, `${pageFile} step ${i}: every .clue must have tabindex="0" and role="button" (found ${step.clueCount} clues)`);
      });

      assert.ok(completed, `${pageFile}: should reach a completion state after answering all 3 questions`);
      assert.deepEqual(loaded.errors, [], `${pageFile}: unexpected runtime errors`);
    } finally {
      loaded.dom.window.close();
    }
  });
}

const PAGE_FOR_SCENARIO = {
  email: 'email-phishing.html', login: 'fake-login.html', qr: 'qr-phishing.html',
  smishing: 'smishing.html', social: 'social-media-scam.html', bec: 'ceo-fraud.html',
  'mfa-fatigue': 'mfa-fatigue.html', 'upi-fraud': 'upi-fraud.html', 'oauth-consent': 'oauth-consent.html',
};

// Note on 'login': login-enhancement.js rebuilds that panel synchronously
// right after simulation.js's own render, before a browser would ever paint
// a frame - so a bug in simulation.js's initial login-icon line is genuinely
// invisible to real users, not just masked by this test's timing. This check
// validates the DOM as users actually see it (post-rebuild); it intentionally
// does not exercise simulation.js's initial render of that one line in
// isolation.
for (const [scenarioId, { identifyField, iconField }] of Object.entries(ICON_CHECKS)) {
  test(`${scenarioId}: each variant's own icon is shown, never a sibling's`, async () => {
    const loaded = loadPage(PAGE_FOR_SCENARIO[scenarioId]);
    try {
      const { steps, bank } = await walkThrough(loaded);
      for (const step of steps) {
        const activeVariant = bank.find(v => step.text.includes(v.fields[identifyField]));
        assert.ok(activeVariant, `${scenarioId}: could not identify which variant is active from its ${identifyField} - check that field is still unique per variant`);

        const expectedIcon = activeVariant.fields[iconField];
        assert.ok(step.rawHtml.includes(`"${expectedIcon}"`) || step.rawHtml.includes(`bi ${expectedIcon}`),
          `${scenarioId}/${activeVariant.id}: expected its own ${iconField} ("${expectedIcon}") to appear in the rendered artifact`);

        for (const sibling of bank) {
          if (sibling.id === activeVariant.id) continue;
          const siblingIcon = sibling.fields[iconField];
          if (siblingIcon === expectedIcon) continue; // not a useful negative check if two variants happen to share an icon
          assert.ok(!step.rawHtml.includes(`bi ${siblingIcon}`),
            `${scenarioId}/${activeVariant.id}: found sibling variant ${sibling.id}'s icon ("${siblingIcon}") in the rendered artifact - this is exactly the v1.2.0 icon-mismatch bug`);
        }
      }
    } finally {
      loaded.dom.window.close();
    }
  });
}
