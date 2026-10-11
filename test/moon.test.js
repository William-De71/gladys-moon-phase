// Port of server/test/lib/house/house.getMoonState.test.js (core PR #2990):
// same dates, same expectations, so the integration computes what the core
// widget computed.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getMoonState,
  findNextZeroCrossing,
  findNextExtremum,
  findNextLunarEclipse,
  SYNODIC_MONTH_DAYS,
} from '../src/moon.js';
import { localDay } from '../src/time.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PARIS = 'Europe/Paris';
const parisHouse = { latitude: 48.8566, longitude: 2.3522 };
const summerNoon = new Date('2026-07-05T12:00:00.000Z');

const state = (date, options = {}) =>
  getMoonState(parisHouse, date, { timezone: PARIS, ...options });
const daysBetween = (a, b) => (a.getTime() - b.getTime()) / MS_PER_DAY;

describe('getMoonState', () => {
  test('returns a phase, a phase name and an illumination', () => {
    const moon = state(summerNoon);
    assert.ok(moon.phase >= 0 && moon.phase < 1);
    assert.equal(typeof moon.phase_name, 'string');
    assert.ok(moon.illumination >= 0 && moon.illumination <= 100);
  });

  test('returns the current position and distance of the moon', () => {
    const moon = state(summerNoon);
    assert.ok(moon.azimuth >= 0 && moon.azimuth < 360);
    assert.ok(moon.elevation >= -90 && moon.elevation <= 90);
    // The moon orbit stays between roughly 356 000 and 407 000 km
    assert.ok(moon.distance > 355000 && moon.distance < 408000);
  });

  test('reports a full moon as fully illuminated', () => {
    // Full moon of 2026-08-28
    const moon = state(new Date('2026-08-28T04:19:00.000Z'));
    assert.equal(moon.phase_name, 'fullMoon');
    assert.ok(moon.illumination >= 99);
  });

  test('reports a new moon as not illuminated', () => {
    // New moon of 2026-09-11
    const moon = state(new Date('2026-09-11T03:27:00.000Z'));
    assert.equal(moon.phase_name, 'newMoon');
    assert.ok(moon.illumination <= 1);
  });

  test('reports the moon as waxing before the full moon and waning after', () => {
    assert.equal(state(new Date('2026-08-25T12:00:00.000Z')).waxing, true);
    assert.equal(state(new Date('2026-09-01T12:00:00.000Z')).waxing, false);
  });

  test('returns the age of the moon within a lunation', () => {
    const moon = state(summerNoon);
    assert.ok(moon.age_days >= 0 && moon.age_days < SYNODIC_MONTH_DAYS);
  });

  test('returns the four next phases, each within one lunation', () => {
    const moon = state(summerNoon);
    const nextPhases = [
      moon.next_new_moon,
      moon.next_first_quarter,
      moon.next_full_moon,
      moon.next_last_quarter,
    ];
    nextPhases.forEach((date) => {
      assert.ok(date instanceof Date);
      assert.ok(date.getTime() > summerNoon.getTime());
      // Each phase happens once per lunation, so the next one is never further away
      assert.ok(daysBetween(date, summerNoon) < SYNODIC_MONTH_DAYS + 1);
    });
    // The four phases are distinct moments of the same lunation
    assert.equal(new Set(nextPhases.map((date) => date.getTime())).size, 4);
  });

  test('finds the next full moon close to the published one', () => {
    // Published full moon: 2026-08-28 04:19 UTC
    const moon = state(new Date('2026-08-23T12:00:00.000Z'));
    const hours =
      Math.abs(daysBetween(moon.next_full_moon, new Date('2026-08-28T04:19:00.000Z'))) * 24;
    assert.ok(hours < 6, `${hours} h`);
  });

  test('returns a perigee closer than the apogee', () => {
    const moon = state(summerNoon);
    assert.ok(moon.next_perigee instanceof Date);
    assert.ok(moon.next_apogee instanceof Date);
    // Both happen once per anomalistic month, so within ~28 days
    assert.ok(daysBetween(moon.next_perigee, summerNoon) < 29);
    assert.ok(daysBetween(moon.next_apogee, summerNoon) < 29);
    assert.ok(state(moon.next_perigee).distance < state(moon.next_apogee).distance);
  });

  test('returns the next node within a draconic month', () => {
    const moon = state(summerNoon);
    assert.ok(moon.next_node instanceof Date);
    assert.ok(daysBetween(moon.next_node, summerNoon) < 29);
  });

  test('heads to the descending node while north of the ecliptic and still climbing', () => {
    const moon = state(new Date('2026-08-28T12:00:00.000Z'));
    assert.equal(moon.ascending, true);
    assert.equal(moon.next_node_ascending, false);
  });

  test('heads to the ascending node while south of the ecliptic and still falling', () => {
    const moon = state(new Date('2026-09-10T12:00:00.000Z'));
    assert.equal(moon.ascending, false);
    assert.equal(moon.next_node_ascending, true);
  });

  test('names the constellation on the sidereal zodiac', () => {
    // Midnight in Paris on 2026-08-23, as published by lunar calendars: the
    // moon is in Sagittarius (Capricorn on the tropical zodiac).
    assert.equal(state(new Date('2026-08-22T22:00:00.000Z')).zodiac_sign, 'sagittarius');
  });

  test('returns a distance matching the published ephemerides', () => {
    // Published distance at midnight in Paris on 2026-08-23: 404 453 km
    const moon = state(new Date('2026-08-22T22:00:00.000Z'));
    assert.ok(Math.abs(moon.distance - 404453) < 300);
  });

  test('measures the age from the real last new moon', () => {
    // Published age at midnight in Paris on 2026-08-23: 10 days 4 hours
    const moon = state(new Date('2026-08-22T22:00:00.000Z'));
    assert.ok(Math.abs(moon.age_days - 10.2) < 0.5);
  });

  test('keeps the age consistent with the last new moon', () => {
    assert.ok(state(new Date('2026-09-11T06:00:00.000Z')).age_days < 1);
    assert.ok(state(new Date('2026-10-09T00:00:00.000Z')).age_days > 27);
  });

  test('finds the next lunar eclipse on a full moon', () => {
    const moon = state(new Date('2026-01-15T00:00:00.000Z'));
    assert.ok(moon.next_eclipse instanceof Date);
    assert.ok(['penumbral', 'partialOrTotal'].includes(moon.next_eclipse_type));
    assert.ok(state(moon.next_eclipse).illumination >= 97);
  });

  test('returns moonrise and moonset of the local day', () => {
    const date = new Date('2026-08-23T12:00:00.000Z');
    const moon = state(date);
    assert.ok(moon.moonrise instanceof Date);
    assert.ok(moon.moonset instanceof Date);
    assert.equal(localDay(moon.moonrise, PARIS), '2026-08-23');
    assert.equal(localDay(moon.moonset, PARIS), '2026-08-23');
  });

  test('computes the moon times on the local day of the timezone', () => {
    const tokyoHouse = { latitude: 35.6762, longitude: 139.6503 };
    // 15:00 in Tokyo, so the local day is not the UTC day
    const tokyoAfternoon = new Date('2026-07-05T06:00:00.000Z');
    const moon = getMoonState(tokyoHouse, tokyoAfternoon, { timezone: 'Asia/Tokyo' });
    const day = localDay(tokyoAfternoon, 'Asia/Tokyo');
    assert.ok(moon.moonrise || moon.moonset);
    [moon.moonrise, moon.moonset].filter(Boolean).forEach((time) => {
      assert.equal(localDay(time, 'Asia/Tokyo'), day);
    });
  });

  test('returns the timezone the values were computed in', () => {
    const moon = getMoonState(parisHouse, summerNoon, { timezone: 'Asia/Tokyo' });
    assert.equal(moon.timezone, 'Asia/Tokyo');
  });

  test('returns a null moon time when the moon does not cross the horizon', () => {
    // Far enough north, the moon can stay below or above the horizon all day
    const tromso = { latitude: 69.6492, longitude: 18.9553 };
    let found = false;
    for (let day = 0; day < 30 && !found; day += 1) {
      const moon = getMoonState(tromso, new Date(Date.UTC(2026, 6, 1 + day, 12)), {
        timezone: 'Europe/Oslo',
      });
      found = moon.moonrise === null || moon.moonset === null;
    }
    assert.equal(found, true);
  });

  test('computes the values at local midnight when asked to', () => {
    // 23:00 in Paris: the values of the moment differ from those of midnight
    const evening = new Date('2026-08-23T21:00:00.000Z');
    const live = state(evening);
    const atMidnight = state(evening, { atMidnight: true });
    assert.ok(live.illumination > atMidnight.illumination);
    assert.ok(live.distance < atMidnight.distance);
    assert.ok(live.age_days > atMidnight.age_days);
    // The midnight values are the ones lunar calendars publish for that day
    assert.equal(atMidnight.illumination, 75);
    assert.ok(Math.abs(atMidnight.distance - 404453) < 300);
    assert.equal(atMidnight.computed_at.toISOString(), '2026-08-22T22:00:00.000Z');
  });

  test('gives the same midnight values whatever time of the day it is asked', () => {
    const morning = state(new Date('2026-08-23T04:00:00.000Z'), { atMidnight: true });
    const evening = state(new Date('2026-08-23T21:00:00.000Z'), { atMidnight: true });
    assert.equal(morning.illumination, evening.illumination);
    assert.equal(morning.distance, evening.distance);
    assert.equal(morning.age_days, evening.age_days);
    assert.equal(morning.zodiac_sign, evening.zodiac_sign);
    assert.equal(morning.next_full_moon.getTime(), evening.next_full_moon.getTime());
  });

  test('keeps the moon times of the local day when computing at midnight', () => {
    const evening = new Date('2026-08-23T21:00:00.000Z');
    const live = state(evening);
    const atMidnight = state(evening, { atMidnight: true });
    assert.equal(atMidnight.moonrise.getTime(), live.moonrise.getTime());
    assert.equal(atMidnight.moonset.getTime(), live.moonset.getTime());
  });

  test('computes at midnight of the given timezone, not of the process', () => {
    const tokyoHouse = { latitude: 35.6762, longitude: 139.6503 };
    const tokyo = { timezone: 'Asia/Tokyo' };
    // 15:00 in Tokyo on 2026-07-05, so local midnight is 2026-07-04T15:00Z
    const atMidnight = getMoonState(tokyoHouse, new Date('2026-07-05T06:00:00.000Z'), {
      ...tokyo,
      atMidnight: true,
    });
    const atTokyoMidnight = getMoonState(tokyoHouse, new Date('2026-07-04T15:00:00.000Z'), tokyo);
    assert.equal(atMidnight.illumination, atTokyoMidnight.illumination);
    assert.equal(atMidnight.distance, atTokyoMidnight.distance);
  });

  test('keeps the current time by default', () => {
    const evening = new Date('2026-08-23T21:00:00.000Z');
    assert.equal(state(evening).distance, state(evening, { atMidnight: false }).distance);
    assert.equal(state(evening).computed_at.getTime(), evening.getTime());
  });

  test('keeps the phase consistent across a whole lunation', () => {
    const start = new Date('2026-08-13T00:00:00.000Z');
    for (let day = 0; day < 30; day += 1) {
      const moon = state(new Date(start.getTime() + day * MS_PER_DAY));
      if (moon.phase_name === 'fullMoon') {
        assert.ok(moon.illumination >= 96);
      }
      if (moon.phase_name === 'newMoon') {
        assert.ok(moon.illumination <= 4);
      }
      if (moon.phase_name === 'firstQuarter' || moon.phase_name === 'lastQuarter') {
        assert.ok(moon.illumination >= 40 && moon.illumination <= 60);
      }
      assert.equal(moon.waxing, moon.phase < 0.5);
    }
  });

  test('defaults to UTC without a timezone', () => {
    assert.equal(getMoonState(parisHouse, summerNoon).timezone, 'UTC');
  });
});

describe('search helpers', () => {
  test('return null when no zero crossing happens in the window', () => {
    assert.equal(
      findNextZeroCrossing(new Date('2026-08-23T00:00:00Z'), () => 1, 10, 6),
      null,
    );
  });

  test('return null when no extremum happens in the window', () => {
    const increasing = (date) => date.getTime();
    assert.equal(findNextExtremum(new Date('2026-08-23T00:00:00Z'), increasing, true, 10), null);
  });

  test('return null when every phase search fails', () => {
    assert.equal(findNextLunarEclipse(new Date(NaN)), null);
  });

  test('give up when the scanned window holds no eclipse', () => {
    const from = new Date('2026-03-10T00:00:00.000Z');
    assert.equal(findNextLunarEclipse(from, 1), null);
    assert.notEqual(findNextLunarEclipse(from), null);
  });
});
