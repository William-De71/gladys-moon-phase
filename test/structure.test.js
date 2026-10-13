// -----------------------------------------------------------------------------
// Non-regression of everything users store: every key of the manifest a
// dashboard, a scene or a saved configuration refers to, and the image keys
// the core caches.
//
// test/fixtures/discovery.baseline.json was generated from version 1.0.0,
// before any change. A failure here means existing users would lose a widget
// setting or a scene: never update the baseline without a documented
// migration. (A provider integration has no devices: no external ids.)
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { imageKey, parseImageKey } from '../src/widget.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const baseline = read('./fixtures/discovery.baseline.json');
const manifest = read('../gladys-assistant-integration.json');

const keys = (list) => (list ?? []).map((entry) => entry.key);
const byKey = (list) => new Map((list ?? []).map((entry) => [entry.key, entry]));
const optionValues = (field) => (field?.options ?? []).map((option) => option.value);

/**
 * @description Check that every stored option value is still offered.
 * @param {object[]} fields - The current fields of a manifest entry.
 * @param {object} options - The baseline `{ fieldKey: [values] }`.
 * @param {string} where - The entry, for the messages.
 */
function assertOptionsKept(fields, options, where) {
  const current = byKey(fields);
  for (const [key, stored] of Object.entries(options ?? {})) {
    const offered = optionValues(current.get(key));
    for (const value of stored) {
      assert.ok(offered.includes(value), `${where}.${key}: ${value}`);
    }
  }
}

test('stays a provider integration', () => {
  assert.equal(manifest.type, baseline.manifest.type);
});

test('no configuration key disappears or changes type', () => {
  const current = byKey(manifest.config_schema);
  for (const { key, type } of baseline.manifest.config_schema) {
    assert.equal(current.get(key)?.type, type, `config_schema.${key}`);
  }
});

test('no configuration action, scene trigger or scene action disappears', () => {
  for (const list of ['actions', 'scene_triggers', 'scene_actions']) {
    const current = keys(manifest[list]);
    for (const entry of baseline.manifest[list]) {
      const key = typeof entry === 'string' ? entry : entry.key;
      assert.ok(current.includes(key), `${list}.${key}`);
    }
  }
});

test('widgets keep their keys, settings, setting types and option values', () => {
  const current = byKey(manifest.widgets);
  for (const widget of baseline.manifest.widgets) {
    const now = current.get(widget.key);
    assert.ok(now, `widgets.${widget.key}`);
    const settings = byKey(now.settings);
    for (const { key, type } of widget.settings) {
      assert.equal(settings.get(key)?.type, type, `${widget.key}.settings.${key}`);
    }
    assertOptionsKept(now.settings, widget.options, widget.key);
  }
});

test('the image keys cached by the core are still produced and understood', () => {
  for (const [key, disk] of Object.entries(baseline.image_keys.examples)) {
    assert.equal(imageKey(disk.illumination, disk.waxing), key);
    assert.deepEqual(parseImageKey(key), disk);
  }
});
