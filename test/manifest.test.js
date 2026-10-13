import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { WIDGET_KEY } from '../src/widget.js';
import { TRIGGER_KEY } from '../src/events.js';
import { SCENE_ACTION_KEY } from '../src/scene-actions.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const manifest = read('../gladys-assistant-integration.json');
const pkg = read('../package.json');

test('is a provider reading the house locations, in lockstep with package.json', () => {
  assert.equal(manifest.type, 'provider');
  assert.equal(manifest.location, true);
  assert.equal(manifest.version, pkg.version);
  assert.ok(manifest.docker_image.endsWith(`:${pkg.version}`));
});

test('is listed under Local: everything is computed in the container, no network', () => {
  assert.deepEqual(manifest.transports, ['local']);
});

test('declares exactly the widget the code handles, with the settings it reads', () => {
  assert.deepEqual(
    manifest.widgets.map((widget) => widget.key),
    [WIDGET_KEY],
  );
  const settings = new Map(manifest.widgets[0].settings.map((field) => [field.key, field]));
  assert.deepEqual([...settings.keys()], ['house', 'display_details', 'compute_at_midnight']);
  assert.equal(settings.get('display_details').default, true);
  assert.equal(settings.get('compute_at_midnight').default, false);
});

test('uses a free-text house, accepted by the released versions of Gladys', () => {
  // `source: "houses"` is refused by Gladys 5.1 (only `devices` there)
  const house = manifest.widgets[0].settings.find((field) => field.key === 'house');
  assert.equal(house.type, 'string');
  assert.equal(house.source, undefined);
  assert.equal(house.required, false);
});

test('keeps the descriptions within the bounds of the core', () => {
  Object.values(manifest.description).forEach((text) =>
    assert.ok(text.length >= 10 && text.length <= 100, text),
  );
});

test('declares exactly the scene trigger and the scene action the code handles', () => {
  assert.deepEqual(
    manifest.scene_triggers.map((entry) => entry.key),
    [TRIGGER_KEY],
  );
  assert.deepEqual(
    manifest.scene_actions.map((entry) => entry.key),
    [SCENE_ACTION_KEY],
  );
  // Scenes need Gladys 5.1.0: the minimum does not move.
  assert.equal(manifest.gladys_version, '>=5.1.1');
});
