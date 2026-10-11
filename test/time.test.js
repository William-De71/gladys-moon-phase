import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isValidTimezone,
  resolveTimezone,
  timezoneOffsetMs,
  localDay,
  zonedTime,
  calendarDaysBetween,
  secondsUntilMidnight,
  formatTime,
  formatShortDate,
} from '../src/time.js';

const PARIS = 'Europe/Paris';

test('recognizes IANA timezones', () => {
  assert.equal(isValidTimezone('Europe/Paris'), true);
  assert.equal(isValidTimezone('Mars/Olympus'), false);
  assert.equal(isValidTimezone(''), false);
  assert.equal(isValidTimezone(undefined), false);
});

test('takes the timezone of Gladys from TZ, with a fallback', () => {
  assert.equal(resolveTimezone({ TZ: 'America/New_York' }), 'America/New_York');
  const fallback = resolveTimezone({ TZ: 'Mars/Olympus' });
  assert.equal(isValidTimezone(fallback), true);
});

test('measures the offset on both sides of a DST change', () => {
  assert.equal(timezoneOffsetMs(new Date('2026-01-15T12:00:00Z'), PARIS), 3600 * 1000);
  assert.equal(timezoneOffsetMs(new Date('2026-07-15T12:00:00Z'), PARIS), 7200 * 1000);
});

test('gives the local day of an instant', () => {
  assert.equal(localDay(new Date('2026-08-23T21:59:00Z'), PARIS), '2026-08-23');
  assert.equal(localDay(new Date('2026-08-23T22:00:00Z'), PARIS), '2026-08-24');
  assert.equal(localDay(new Date('2026-07-05T16:00:00Z'), 'Asia/Tokyo'), '2026-07-06');
});

test('finds the instant of a local time, DST days included', () => {
  assert.equal(zonedTime('2026-08-23', 0, PARIS).toISOString(), '2026-08-22T22:00:00.000Z');
  assert.equal(zonedTime('2026-01-10', 12, PARIS).toISOString(), '2026-01-10T11:00:00.000Z');
  // Midnight and noon of the days the clocks change
  assert.equal(zonedTime('2026-03-29', 12, PARIS).toISOString(), '2026-03-29T10:00:00.000Z');
  assert.equal(zonedTime('2026-10-25', 0, PARIS).toISOString(), '2026-10-24T22:00:00.000Z');
  assert.equal(zonedTime('2026-10-25', 12, PARIS).toISOString(), '2026-10-25T11:00:00.000Z');
});

test('counts calendar days, not elapsed hours', () => {
  const lateEvening = new Date('2026-08-23T21:30:00Z'); // 23:30 in Paris
  const tomorrowMorning = new Date('2026-08-24T05:00:00Z'); // 07:00 in Paris
  assert.equal(calendarDaysBetween(tomorrowMorning, lateEvening, PARIS), 1);
  assert.equal(calendarDaysBetween(lateEvening, lateEvening, PARIS), 0);
  assert.equal(calendarDaysBetween(new Date('2026-08-28T04:19:00Z'), lateEvening, PARIS), 5);
  // Across a DST change, still whole days
  assert.equal(
    calendarDaysBetween(new Date('2026-10-26T10:00:00Z'), new Date('2026-10-24T10:00:00Z'), PARIS),
    2,
  );
});

test('counts the seconds to the next local midnight', () => {
  assert.equal(secondsUntilMidnight(new Date('2026-08-23T21:30:00Z'), PARIS), 1800);
  assert.equal(secondsUntilMidnight(new Date('2026-08-23T22:00:00Z'), PARIS), 86400);
  // The night the clocks go back lasts 25 hours
  assert.equal(secondsUntilMidnight(new Date('2026-10-24T22:00:00Z'), PARIS), 90000);
});

test('formats times as HH:mm in the timezone', () => {
  assert.equal(formatTime(new Date('2026-08-23T16:45:54Z'), PARIS), '18:45');
  assert.equal(formatTime(new Date('2026-08-23T22:05:00Z'), PARIS), '00:05');
  assert.equal(formatTime(null, PARIS), '--:--');
  assert.equal(formatTime(new Date(NaN), PARIS), '--:--');
});

test('formats short dates in the language and timezone', () => {
  const date = new Date('2026-10-15T23:30:00Z'); // Friday 16 in Paris
  assert.match(formatShortDate(date, 'fr', PARIS), /^ven\.? 16 oct\.?$/);
  assert.match(formatShortDate(date, 'en', PARIS), /Fri/);
  assert.match(formatShortDate(date, 'en', 'UTC'), /Thu/);
});
