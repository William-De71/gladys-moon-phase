import { test } from 'node:test';
import assert from 'node:assert/strict';

import { nextPhaseInstant } from '../src/ephemeris.js';
import { createScheduler, GRACE_MS, MAX_WAIT_MS, RETRY_MS } from '../src/scheduler.js';

const MINUTE = 60000;
// Full moon of 26 October 2026, around 04:12 UTC.
const FULL_MOON = nextPhaseInstant(new Date('2026-10-20T00:00:00Z'), 180).getTime();

/**
 * @description A scheduler on a fake clock, timers and store.
 * @param {object} [options] - Options.
 * @param {number} options.at - Now (ms).
 * @param {object} [options.stored] - The fired events already in /data.
 * @param {boolean} [options.online] - Whether publishing works.
 * @returns {object} The scheduler and what it did.
 */
function setup({ at, stored = {}, online = true }) {
  const clock = { now: at };
  const published = [];
  const timers = [];
  const store = {
    data: stored,
    async load(fallback) {
      return this.data ?? fallback;
    },
    async save(value) {
      this.data = value;
    },
  };
  const scheduler = createScheduler({
    store,
    publish: async (event) => {
      if (clock.online === false) {
        return false;
      }
      published.push(event);
      return true;
    },
    now: () => new Date(clock.now),
    setTimer: (fn, delay) => {
      timers.push(delay);
      return { unref() {} };
    },
    clearTimer: () => {},
  });
  clock.online = online;
  return { scheduler, clock, published, timers, store };
}

test('fires an event reached, once, and remembers it across a restart', async () => {
  const first = setup({ at: FULL_MOON + 2 * MINUTE });
  await first.scheduler.load();
  await first.scheduler.start();
  assert.deepEqual(
    first.published.map((e) => e.event),
    ['full_moon'],
  );
  await first.scheduler.tick();
  assert.equal(first.published.length, 1, 'not twice');
  const second = setup({ at: FULL_MOON + 3 * MINUTE, stored: first.store.data });
  await second.scheduler.load();
  await second.scheduler.start();
  assert.equal(second.published.length, 0, 'not after a restart');
});

test('drops an event missed by more than the grace period', async () => {
  const { scheduler, published } = setup({ at: FULL_MOON + GRACE_MS + 2 * MINUTE });
  await scheduler.load();
  await scheduler.start();
  assert.equal(published.length, 0);
});

test('waits for the next event, at most 6 hours', async () => {
  const before = setup({ at: FULL_MOON - 30 * MINUTE });
  await before.scheduler.load();
  await before.scheduler.start();
  assert.equal(before.published.length, 0);
  const wait = before.timers.at(-1);
  assert.ok(wait > 29 * MINUTE && wait <= 31 * MINUTE, String(wait));
  const far = setup({ at: FULL_MOON + 2 * 24 * 60 * MINUTE });
  await far.scheduler.load();
  await far.scheduler.start();
  assert.equal(far.timers.at(-1), MAX_WAIT_MS);
});

test('retries every minute while Gladys cannot be reached, then publishes', async () => {
  const { scheduler, clock, published, timers } = setup({
    at: FULL_MOON + MINUTE,
    online: false,
  });
  await scheduler.load();
  await scheduler.start();
  assert.equal(published.length, 0);
  assert.equal(timers.at(-1), RETRY_MS);
  clock.online = true;
  clock.now += RETRY_MS;
  await scheduler.tick();
  assert.deepEqual(
    published.map((e) => e.event),
    ['full_moon'],
  );
});

test('two ticks at once publish an event only once', async () => {
  const { scheduler, published } = setup({ at: FULL_MOON + MINUTE });
  await scheduler.load();
  await Promise.all([scheduler.tick(), scheduler.tick()]);
  assert.equal(published.length, 1);
});

test('a corrupted file starts empty', async () => {
  const { scheduler, published } = setup({ at: FULL_MOON + MINUTE, stored: 'oops' });
  await scheduler.load();
  await scheduler.start();
  assert.equal(published.length, 1);
});
