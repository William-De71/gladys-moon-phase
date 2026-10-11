import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createHouseRegistry, isLocated } from '../src/houses.js';

const HOUSES = [
  { id: '1', name: 'Garage', selector: 'garage', latitude: null, longitude: null },
  { id: '2', name: 'Maison', selector: 'maison', latitude: 48.85, longitude: 2.35 },
  { id: '3', name: 'Chalet', selector: 'chalet-alpes', latitude: 45.9, longitude: 6.87 },
];

const silent = { warn() {} };

/**
 * @description A registry on a fake host API and a fake clock.
 * @param {Function} fetchHouses - The fake getHouses().
 * @returns {object} The registry, the clock and the call counter.
 * @example
 * const { houses } = setup(async () => HOUSES);
 */
function setup(fetchHouses) {
  const clock = { now: 0 };
  const calls = { count: 0 };
  const houses = createHouseRegistry({
    fetchHouses: async () => {
      calls.count += 1;
      return fetchHouses();
    },
    now: () => clock.now,
    logger: silent,
  });
  return { houses, clock, calls };
}

test('tells located houses apart', () => {
  assert.equal(isLocated(HOUSES[1]), true);
  assert.equal(isLocated(HOUSES[0]), false);
  assert.equal(isLocated(undefined), false);
});

test('picks the first located house when the setting is empty', async () => {
  const { houses } = setup(async () => HOUSES);
  assert.equal((await houses.find('')).house.name, 'Maison');
  assert.equal((await houses.find(undefined)).house.name, 'Maison');
  assert.equal((await houses.find('   ')).house.name, 'Maison');
});

test('finds a house by name, selector, or name in any case', async () => {
  const { houses } = setup(async () => HOUSES);
  assert.equal((await houses.find('Chalet')).house.id, '3');
  assert.equal((await houses.find('chalet-alpes')).house.id, '3');
  assert.equal((await houses.find(' CHALET ')).house.id, '3');
});

test('returns an unlocated house as such (the widget explains it)', async () => {
  const { houses } = setup(async () => HOUSES);
  const { house } = await houses.find('Garage');
  assert.equal(isLocated(house), false);
});

test('explains an unknown name with the names to use', async () => {
  const { houses } = setup(async () => HOUSES);
  assert.deepEqual(await houses.find('Villa'), {
    error: 'unknownHouse',
    name: 'Villa',
    names: ['Garage', 'Maison', 'Chalet'],
  });
});

test('reports no house when none is located', async () => {
  const { houses } = setup(async () => [HOUSES[0]]);
  assert.deepEqual(await houses.find(''), { error: 'noHouse' });
});

test('re-reads the houses at most once a minute', async () => {
  const { houses, clock, calls } = setup(async () => HOUSES);
  await houses.find('');
  await houses.find('Chalet');
  assert.equal(calls.count, 1);
  clock.now = 61 * 1000;
  await houses.find('');
  assert.equal(calls.count, 2);
});

test('shares one read between concurrent requests', async () => {
  const { houses, calls } = setup(async () => HOUSES);
  await Promise.all([houses.find(''), houses.find('Chalet'), houses.list()]);
  assert.equal(calls.count, 1);
});

test('keeps the previous list when a read fails', async () => {
  let fail = false;
  const { houses, clock } = setup(async () => {
    if (fail) {
      throw new Error('host API down');
    }
    return HOUSES;
  });
  await houses.list();
  fail = true;
  clock.now = 120 * 1000;
  assert.equal((await houses.find('Chalet')).house.id, '3');
});

test('fails when the very first read fails', async () => {
  const { houses } = setup(async () => {
    throw new Error('host API down');
  });
  await assert.rejects(houses.find(''), /host API down/);
});
