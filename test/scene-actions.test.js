import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { AUTO_LANGUAGE, normalizeConfig, readLanguage } from '../src/config.js';
import { LANGUAGES } from '../src/i18n.js';
import { getMoonState } from '../src/moon.js';
import { SCENE_ACTION_KEY, buildMoonOutputs } from '../src/scene-actions.js';

const manifest = JSON.parse(
  readFileSync(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const PARIS = 'Europe/Paris';
const house = { latitude: 48.8566, longitude: 2.3522 };
const now = new Date('2026-10-13T08:00:00Z');

test('the action returns exactly its declared outputs, scalars of the declared types', () => {
  const action = manifest.scene_actions.find((entry) => entry.key === SCENE_ACTION_KEY);
  assert.ok(action.timeout_seconds >= 5 && action.timeout_seconds <= 120);
  const declared = new Map(action.outputs.map((output) => [output.key, output.type]));
  for (const language of LANGUAGES) {
    const outputs = buildMoonOutputs(getMoonState(house, now, { timezone: PARIS }), {
      language,
      timezone: PARIS,
      now,
    });
    assert.deepEqual(Object.keys(outputs).sort(), [...declared.keys()].sort());
    for (const [key, value] of Object.entries(outputs)) {
      assert.equal(typeof value, declared.get(key), key);
    }
  }
});

test('the next full and new moon are the real instants, in the time of Gladys', () => {
  const outputs = buildMoonOutputs(getMoonState(house, now, { timezone: PARIS }), {
    language: 'fr',
    timezone: PARIS,
    now,
  });
  // 26 October 2026, 04:11 UTC = 05:11 in Paris (winter time since the 25th).
  assert.match(outputs.next_full_moon, /^2026-10-26 05:1\d$/);
  assert.equal(outputs.days_until_full_moon, 13);
  assert.match(outputs.next_new_moon, /^2026-11-09 08:0\d$/);
  assert.match(outputs.summary, /^Premier Croissant, éclairée à 8 %\. Prochaine pleine lune/);
});

test('the language of the scene texts: automatic unless a known language', () => {
  for (const language of LANGUAGES) {
    assert.equal(normalizeConfig({ language }).language, language);
  }
  assert.equal(normalizeConfig({ language: 'it' }).language, AUTO_LANGUAGE);
  assert.equal(normalizeConfig({}).language, AUTO_LANGUAGE);
  assert.equal(normalizeConfig(null).language, AUTO_LANGUAGE);
  assert.equal(readLanguage({ last_language: 'es' }, 'en'), 'es');
  assert.equal(readLanguage({ last_language: 'xx' }, 'en'), 'en');
});

test('the manifest offers the languages of the code, automatic by default, never required', () => {
  const field = manifest.config_schema.find((entry) => entry.key === 'language');
  assert.equal(field.type, 'select');
  assert.deepEqual(
    field.options.map((option) => option.value),
    [AUTO_LANGUAGE, ...LANGUAGES],
  );
  assert.equal(field.default, AUTO_LANGUAGE);
  assert.notEqual(field.required, true);
});
