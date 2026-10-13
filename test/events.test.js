import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import SunCalc from 'suncalc';

import { moonPosition, nextPhaseInstant } from '../src/ephemeris.js';
import { LUNAR_EVENTS, TRIGGER_KEY, buildLunarEvent, eventId, nextEvents } from '../src/events.js';
import { LANGUAGES } from '../src/i18n.js';

const manifest = JSON.parse(
  readFileSync(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const MINUTE = 60000;
const PARIS = 'Europe/Paris';

// Reference instants: PyEphem 4.2 (VSOP87 / ELP-2000), in UTC.
const REFERENCE = [
  ['2026-10-13', 0, '2026-11-09T07:02:03Z'],
  ['2026-10-13', 90, '2026-10-18T16:12:36Z'],
  ['2026-10-13', 180, '2026-10-26T04:11:45Z'],
  ['2026-10-13', 270, '2026-11-01T20:28:22Z'],
  ['2027-06-01', 0, '2027-06-04T19:40:15Z'],
  ['2027-06-01', 180, '2027-06-19T00:44:15Z'],
  ['2030-01-01', 90, '2030-01-11T14:05:57Z'],
  ['2030-01-01', 270, '2030-01-26T18:14:19Z'],
];

test('the principal phases are within 5 minutes of the ephemerides', () => {
  for (const [from, angle, expected] of REFERENCE) {
    const found = nextPhaseInstant(new Date(`${from}T00:00:00Z`), angle);
    const offset = Math.abs(found - Date.parse(expected)) / MINUTE;
    assert.ok(offset <= 5, `${angle}° after ${from}: ${found.toISOString()} (${offset} min)`);
  }
});

test('SunCalc alone would put this full moon hours away: the reason for ephemeris.js', () => {
  // The widget keeps SunCalc to stay identical to the core widget.
  const full = Date.parse('2026-10-26T04:11:45Z');
  const phase = SunCalc.getMoonIllumination(new Date(full)).phase;
  assert.ok(Math.abs(phase - 0.5) > 0.003, String(phase));
});

test('the next events: every kind, the soonest first, a real eclipse dated at its full moon', () => {
  const events = nextEvents(new Date('2027-02-01T00:00:00Z'));
  assert.deepEqual([...new Set(events.map((e) => e.event))].sort(), [...LUNAR_EVENTS].sort());
  assert.deepEqual(
    events.map((e) => e.date.getTime()),
    events.map((e) => e.date.getTime()).sort((a, b) => a - b),
  );
  const eclipse = events.find((e) => e.event === 'lunar_eclipse');
  // Penumbral eclipse of 20 February 2027, greatest at 23:13 UTC.
  assert.equal(eclipse.eclipseType, 'penumbral');
  assert.ok(Math.abs(eclipse.date - Date.parse('2027-02-20T23:13:00Z')) < 30 * MINUTE);
  const fullMoon = events.find((e) => e.event === 'full_moon');
  assert.ok(Math.abs(fullMoon.date - eclipse.date) < MINUTE);
});

test('perigee and apogee: the distance is plausible', () => {
  const events = nextEvents(new Date('2026-10-13T00:00:00Z'));
  const perigee = moonPosition(events.find((e) => e.event === 'perigee').date).distance;
  const apogee = moonPosition(events.find((e) => e.event === 'apogee').date).distance;
  assert.ok(perigee > 356000 && perigee < 371000, String(perigee));
  assert.ok(apogee > 404000 && apogee < 407000, String(apogee));
});

test('an event id is its kind and its minute', () => {
  const date = new Date('2026-10-26T04:12:30Z');
  assert.equal(eventId({ event: 'full_moon', date }), 'full_moon@2026-10-26T04:12');
});

test('the scene event carries exactly the declared variables, flat, in every language', () => {
  const trigger = manifest.scene_triggers.find((entry) => entry.key === TRIGGER_KEY);
  const declared = new Map(trigger.variables.map((v) => [v.key, v.type]));
  const options = trigger.fields
    .find((f) => f.key === 'event')
    .options.map((option) => option.value);
  assert.deepEqual(options, LUNAR_EVENTS);
  for (const entry of nextEvents(new Date('2027-02-01T00:00:00Z'))) {
    for (const language of LANGUAGES) {
      const { key, data } = buildLunarEvent(entry, { language, timezone: PARIS });
      assert.equal(key, TRIGGER_KEY);
      assert.ok(options.includes(data.event));
      assert.deepEqual(
        Object.keys(data).sort(),
        [...declared.keys(), 'event'].filter((k, i, a) => a.indexOf(k) === i).sort(),
      );
      for (const [name, value] of Object.entries(data)) {
        assert.equal(typeof value, declared.get(name), name);
      }
      assert.ok(data.summary.length > 10 && data.summary.length < 300);
    }
  }
});

test('the summary names the event in the language, at the time of Gladys', () => {
  const entry = { event: 'full_moon', date: new Date('2026-10-26T04:11:45Z') };
  const { data } = buildLunarEvent(entry, { language: 'fr', timezone: PARIS });
  assert.equal(data.date, '2026-10-26');
  assert.equal(data.time, '05:11');
  assert.match(data.summary, /^Pleine lune à 05:11 : la lune est éclairée à 100 %/);
  const eclipse = buildLunarEvent(
    { event: 'lunar_eclipse', eclipseType: 'penumbral', date: new Date('2027-02-20T23:23:00Z') },
    { language: 'es', timezone: PARIS },
  );
  assert.equal(eclipse.data.event_name, 'Eclipse penumbral');
});
