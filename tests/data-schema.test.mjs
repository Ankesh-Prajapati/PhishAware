// Schema validation for assets/js/data.js.
//
// This exists because renderArtifact() in simulation.js reads specific
// `fields.X` / `clues.X` keys per scenario type with no runtime guard for
// most of them - a missing or misnamed key renders as a literal "undefined"
// in the UI rather than throwing. The schema below is the authoritative list
// of what each renderArtifact branch actually dereferences (extracted
// directly from the source, not from memory), so this test catches a
// content/code mismatch immediately instead of someone noticing a broken
// example by eye.
//
// Run with: node --test tests/data-schema.test.mjs   (or just `node --test`)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataSrc = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'js', 'data.js'),
  'utf8'
);

function loadData() {
  const window = {};
  const context = vm.createContext({ window, console });
  vm.runInContext(dataSrc, context);
  return window;
}

// One entry per scenario id. `fields`/`clues` are the complete set of keys
// renderArtifact reads for that type. `nullableFields` lists fields the
// rendering code explicitly guards (e.g. `f.secrecyLine ? ... : ''`), so
// `null` is a deliberate, safe value there - everything else must be a
// non-empty value on every variant.
const SCHEMA = {
  email: {
    fields: ['subject', 'senderName', 'senderEmail', 'time', 'greeting', 'body', 'cta', 'linkPreview'],
    nullableFields: [],
    clues: ['subject', 'senderEmail', 'cta', 'greeting'],
  },
  login: {
    fields: ['urlText', 'urlSecure', 'tabTitle', 'brandLabel', 'brandIcon', 'passwordNote'],
    nullableFields: [],
    booleanFields: ['urlSecure'],
    clues: ['url', 'tabTitle', 'passwordNote'],
  },
  qr: {
    fields: ['posterTitle', 'zone', 'heading', 'instruction', 'posterIcon', 'stickerLabel', 'urgencyText', 'fakeDomain'],
    nullableFields: [],
    clues: ['sticker', 'urgency', 'branding', 'domain'],
  },
  smishing: {
    fields: ['contactName', 'contactIcon', 'dateLabel', 'messageHtml', 'fee', 'deadline', 'link'],
    nullableFields: ['fee'],
    clues: ['contact', 'fee', 'deadline', 'link'],
  },
  social: {
    fields: ['handle', 'age', 'followers', 'prizeLabel', 'prizeSub', 'bodyHtml', 'code', 'fee', 'visualIcon'],
    nullableFields: [],
    clues: ['age', 'prize', 'code', 'fee'],
  },
  bec: {
    fields: ['execName', 'execTitle', 'execEmail', 'subject', 'amount', 'ask', 'secrecyLine', 'urgencyLine', 'signoff'],
    nullableFields: ['secrecyLine'],
    clues: ['secrecy', 'urgency', 'ask', 'email'],
  },
  'mfa-fatigue': {
    fields: ['time', 'day', 'location', 'pushCount', 'callerLabel', 'callerLine'],
    nullableFields: [],
    clues: ['noAttempt', 'location', 'callerLine', 'repeat'],
  },
  'upi-fraud': {
    fields: ['callerLabel', 'callerNumber', 'line1', 'line2', 'collectAmount', 'collectLabel', 'collectFrom', 'urgencyNote'],
    nullableFields: ['callerLabel', 'callerNumber', 'line2', 'collectAmount'],
    clues: ['knowsDetail', 'otpAsk', 'collect', 'urgency'],
  },
  'oauth-consent': {
    fields: ['appName', 'appIcon', 'publisherNote', 'scopeMail', 'scopeContacts', 'scopeOther1', 'scopeOther2', 'sourceNote'],
    nullableFields: [],
    clues: ['publisher', 'scopeMail', 'scopeContacts', 'source'],
  },
};

test('PA_SCENARIOS and PA_QUESTION_BANK have exactly matching scenario ids', () => {
  const { PA_SCENARIOS, PA_QUESTION_BANK } = loadData();
  // .join(',') sidesteps a cross-realm array-identity mismatch: arrays
  // produced by methods called on a vm-context array use that context's
  // Array constructor, so assert.deepEqual against a plain array here would
  // fail even when the contents are identical. Strings are primitives and
  // have no such issue.
  const scenarioIds = PA_SCENARIOS.map(s => s.id).sort().join(',');
  const bankIds = Object.keys(PA_QUESTION_BANK).sort().join(',');
  assert.equal(scenarioIds, bankIds, 'every scenario must have a question bank entry and vice versa');
  assert.equal(scenarioIds, Object.keys(SCHEMA).sort().join(','), 'this test\'s SCHEMA must cover exactly the same scenario ids - update SCHEMA when adding/removing a scenario type');
});

test('every PA_SCENARIOS entry has the catalog fields it needs', () => {
  const { PA_SCENARIOS } = loadData();
  for (const scenario of PA_SCENARIOS) {
    for (const key of ['id', 'title', 'icon', 'page', 'difficulty', 'summary']) {
      assert.ok(typeof scenario[key] === 'string' && scenario[key].length > 0, `${scenario.id || '?'}.${key} must be a non-empty string`);
    }
  }
});

test('every scenario has exactly 3 example variants with unique ids', () => {
  const { PA_QUESTION_BANK } = loadData();
  for (const [scenarioId, variants] of Object.entries(PA_QUESTION_BANK)) {
    assert.equal(variants.length, 3, `${scenarioId} should have exactly 3 variants (this app is built around 3-step walkthroughs)`);
    const ids = variants.map(v => v.id);
    assert.equal(new Set(ids).size, ids.length, `${scenarioId} variant ids must be unique: ${ids}`);
  }
});

test('every variant has the exact fields/clues its renderArtifact branch reads', () => {
  const { PA_QUESTION_BANK } = loadData();
  for (const [scenarioId, variants] of Object.entries(PA_QUESTION_BANK)) {
    const schema = SCHEMA[scenarioId];
    assert.ok(schema, `no SCHEMA entry for scenario "${scenarioId}" - add one`);

    for (const variant of variants) {
      const label = `${scenarioId}/${variant.id}`;

      for (const key of schema.fields) {
        assert.ok(Object.prototype.hasOwnProperty.call(variant.fields, key), `${label}: fields.${key} is missing`);
        const value = variant.fields[key];
        if (schema.booleanFields && schema.booleanFields.includes(key)) {
          assert.equal(typeof value, 'boolean', `${label}: fields.${key} must be a boolean`);
        } else if (schema.nullableFields.includes(key)) {
          assert.ok(value === null || (typeof value === 'string' && value.length > 0) || typeof value === 'number',
            `${label}: fields.${key} must be null or a non-empty value`);
        } else {
          assert.ok((typeof value === 'string' && value.length > 0) || typeof value === 'number',
            `${label}: fields.${key} must be a non-empty value (this field has no fallback in renderArtifact - null/undefined renders as a literal "null"/"undefined" in the UI)`);
        }
      }

      for (const key of schema.clues) {
        const value = variant.clues[key];
        assert.ok(typeof value === 'string' && value.length > 0, `${label}: clues.${key} must be a non-empty string (every clue key is always rendered, even for variants where a related field is null)`);
      }
    }
  }
});

test('every variant has a well-formed question/options/answer/explanation', () => {
  const { PA_QUESTION_BANK } = loadData();
  for (const [scenarioId, variants] of Object.entries(PA_QUESTION_BANK)) {
    for (const variant of variants) {
      const label = `${scenarioId}/${variant.id}`;
      assert.ok(typeof variant.question === 'string' && variant.question.length > 0, `${label}: question must be a non-empty string`);
      assert.ok(Array.isArray(variant.options) && variant.options.length === 4, `${label}: options must be an array of exactly 4 choices`);
      for (const option of variant.options) {
        assert.ok(typeof option === 'string' && option.length > 0, `${label}: every option must be a non-empty string`);
      }
      assert.ok(Number.isInteger(variant.answer) && variant.answer >= 0 && variant.answer < variant.options.length,
        `${label}: answer must be a valid index into options`);
      assert.ok(typeof variant.explanation === 'string' && variant.explanation.length > 0, `${label}: explanation must be a non-empty string`);
    }
  }
});

test('icon-bearing fields actually differ across a scenario\'s 3 variants', () => {
  // Not a hard requirement everywhere, but for the scenario types that carry
  // a brand/poster/visual icon, three near-identical variants with the same
  // icon would suggest a copy-paste that forgot to update it - exactly the
  // class of bug this test suite exists to catch.
  const { PA_QUESTION_BANK } = loadData();
  const ICON_FIELD = {
    login: 'brandIcon',
    qr: 'posterIcon',
    social: 'visualIcon',
    smishing: 'contactIcon',
    'oauth-consent': 'appIcon',
  };
  for (const [scenarioId, iconField] of Object.entries(ICON_FIELD)) {
    const icons = PA_QUESTION_BANK[scenarioId].map(v => v.fields[iconField]);
    assert.equal(new Set(icons).size, icons.length, `${scenarioId}: all 3 variants should use distinct ${iconField} values (got ${icons.join(', ')})`);
  }
});

test('PA_TRAINING lessons are well-formed', () => {
  const { PA_TRAINING } = loadData();
  assert.ok(PA_TRAINING.length > 0);
  for (const lesson of PA_TRAINING) {
    for (const key of ['id', 'title', 'icon', 'body']) {
      assert.ok(typeof lesson[key] === 'string' && lesson[key].length > 0, `${lesson.id || '?'}.${key} must be a non-empty string`);
    }
    assert.ok(Number.isFinite(lesson.minutes) && lesson.minutes > 0, `${lesson.id}.minutes must be a positive number`);
  }
});
