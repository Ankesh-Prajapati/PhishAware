// Unit tests for assets/js/storage.js.
//
// storage.js is written as a plain browser script (it attaches PGStorage to
// `window` and talks to `localStorage`/`CustomEvent` directly), so these
// tests load the real source file into an isolated vm context with a small
// in-memory shim for the browser globals it touches. No bundler, no
// framework - just Node's built-in test runner.
//
// Run with:  node --test tests

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storageSrc = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'js', 'storage.js'),
  'utf8'
);

class FakeLocalStorage {
  #store = new Map();
  getItem(key) { return this.#store.has(key) ? this.#store.get(key) : null; }
  setItem(key, value) { this.#store.set(key, String(value)); }
  removeItem(key) { this.#store.delete(key); }
  clear() { this.#store.clear(); }
}

class FakeCustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}

function createSandbox() {
  // Note: objects/arrays/errors created inside this vm context belong to a
  // different realm than this test file, so don't compare them structurally
  // with assert.deepEqual/instanceof - check primitive fields, or JSON
  // round-trip a value through *this* realm first.
  const localStorage = new FakeLocalStorage();
  const window = {
    crypto: globalThis.crypto,
    dispatchEvent: () => true,
  };
  const context = vm.createContext({
    window,
    localStorage,
    CustomEvent: FakeCustomEvent,
    console,
  });
  vm.runInContext(storageSrc, context);
  return { window, localStorage };
}

test('getState returns a fresh, well-shaped state when nothing is stored', () => {
  const { window } = createSandbox();
  const state = window.PGStorage.getState();
  assert.equal(state.version, window.PGStorage.schemaVersion);
  assert.equal(Object.keys(state.attempts).length, 0);
  assert.equal(state.history.length, 0);
  assert.equal(Object.keys(state.training).length, 0);
  assert.equal(state.certificate, null);
});

test('recordResult clamps points to 0-100', () => {
  const { window } = createSandbox();
  const record = window.PGStorage.recordResult({ scenarioId: 'email', points: 150, correct: true });
  assert.equal(record.points, 100);

  const record2 = window.PGStorage.recordResult({ scenarioId: 'email', points: -20, correct: false });
  assert.equal(record2.points, 0);
});

test('recordResult tracks best score across repeated attempts on the same scenario', () => {
  const { window } = createSandbox();
  window.PGStorage.recordResult({ scenarioId: 'email', points: 90, correct: true });
  window.PGStorage.recordResult({ scenarioId: 'email', points: 40, correct: false });
  const state = window.PGStorage.getState();
  assert.equal(state.attempts.email.score, 40, 'score reflects the latest attempt');
  assert.equal(state.attempts.email.bestScore, 90, 'bestScore should not regress');
  assert.equal(state.attempts.email.attemptCount, 2);
});

test('recordResult requires a scenarioId', () => {
  const { window } = createSandbox();
  assert.throws(() => window.PGStorage.recordResult({ points: 10 }), err => err.name === 'TypeError');
});

test('setTrainingComplete marks and unmarks a lesson', () => {
  const { window } = createSandbox();
  window.PGStorage.setTrainingComplete('links');
  assert.equal(window.PGStorage.isTrainingComplete(window.PGStorage.getState().training.links), true);

  window.PGStorage.setTrainingComplete('links', false);
  assert.equal(window.PGStorage.getState().training.links, undefined);
});

test('getSummary computes average score and a Low risk rating for strong results', () => {
  const { window } = createSandbox();
  window.PGStorage.recordResult({ scenarioId: 'a', points: 100, correct: true });
  window.PGStorage.recordResult({ scenarioId: 'b', points: 100, correct: true });
  window.PGStorage.setTrainingComplete('links');

  const summary = window.PGStorage.getSummary({ scenarioTotal: 2, trainingTotal: 1 });
  assert.equal(summary.completedScenarios, 2);
  assert.equal(summary.averageScore, 100);
  assert.equal(summary.progress, 100);
  assert.equal(summary.riskRating, 'Low');
});

test('getSummary returns a High risk rating with no activity', () => {
  const { window } = createSandbox();
  const summary = window.PGStorage.getSummary({ scenarioTotal: 9, trainingTotal: 7 });
  assert.equal(summary.completedScenarios, 0);
  assert.equal(summary.riskScore, 100);
  assert.equal(summary.riskRating, 'High');
});

test('issueCertificate rejects names under 2 characters', () => {
  const { window } = createSandbox();
  assert.throws(() => window.PGStorage.issueCertificate('a', 90), err => err.name === 'TypeError');
});

test('issueCertificate trims and collapses whitespace, and clamps score to 0-100', () => {
  const { window } = createSandbox();
  const cert = window.PGStorage.issueCertificate('  Ankesh   Patel  ', 142);
  assert.equal(cert.recipientName, 'Ankesh Patel');
  assert.equal(cert.score, 100);
  assert.match(cert.certificateId, /^PA-\d{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
});

test('saveSession / getSession / clearSession round-trip per scenario', () => {
  const { window } = createSandbox();
  window.PGStorage.saveSession('email', { stepIndex: 2, cluesFound: ['a', 'b'] });
  const session = window.PGStorage.getSession('email');
  assert.equal(session.stepIndex, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(session.cluesFound)), ['a', 'b']);

  window.PGStorage.clearSession('email');
  assert.equal(window.PGStorage.getSession('email'), null);
});

test('reset clears persisted state from localStorage', () => {
  const { window, localStorage } = createSandbox();
  window.PGStorage.recordResult({ scenarioId: 'email', points: 80, correct: true });
  assert.ok(localStorage.getItem(window.PGStorage.key));

  window.PGStorage.reset();
  assert.equal(localStorage.getItem(window.PGStorage.key), null);
});

test('exportData returns a detached deep copy of the current state', () => {
  const { window } = createSandbox();
  window.PGStorage.recordResult({ scenarioId: 'email', points: 80, correct: true });
  const exported = window.PGStorage.exportData();
  exported.attempts.email.score = 0;
  assert.equal(window.PGStorage.getState().attempts.email.score, 80, 'mutating the export must not affect stored state');
});
