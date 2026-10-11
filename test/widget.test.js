import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';

import { getMoonState } from '../src/moon.js';
import { PHASES, ZODIAC, LANGUAGES, TEXTS, pickLanguage, translate } from '../src/i18n.js';
import {
  imageKey,
  parseImageKey,
  messageContent,
  houseErrorContent,
  contentTtl,
  buildMoonWidget,
  TTL_SECONDS,
  MIDNIGHT_TTL_SECONDS,
} from '../src/widget.js';

const PARIS = 'Europe/Paris';
const parisHouse = { latitude: 48.8566, longitude: 2.3522 };
// 14:00 in Paris, far from midnight
const afternoon = new Date('2026-08-23T12:00:00.000Z');

const build = (now = afternoon, options = {}) =>
  buildMoonWidget(
    getMoonState(parisHouse, now, { timezone: PARIS, atMidnight: options.atMidnight }),
    { language: 'fr', now, ...options },
  );

// The bounds the core applies (normalizeWidgetContent.js): a value over them
// would be truncated with an ellipsis on the dashboard.
const BOUNDS = { heading: 40, caption: 80, body: 300, tileValue: 12, tileLabel: 24, status: 40 };

/**
 * @description Assert every text of a content fits the core bounds.
 * @param {object} content - The widget content.
 * @example
 * assertWithinBounds(build());
 */
function assertWithinBounds(content) {
  content.components.forEach((component) => {
    if (component.type === 'text') {
      assert.ok(component.text.length <= BOUNDS[component.variant], component.text);
    }
    if (component.type === 'value') {
      assert.ok(String(component.value).length <= BOUNDS.tileValue, component.value);
      assert.ok(component.label.length <= BOUNDS.tileLabel, component.label);
    }
    if (component.type === 'status') {
      component.items.forEach((item) => {
        assert.ok(item.label.length <= BOUNDS.status, item.label);
        assert.ok(String(item.value).length <= BOUNDS.status, item.value);
      });
    }
  });
}

describe('moon widget content', () => {
  test('is valid for the core and lays out like the core widget', () => {
    const content = build();
    assert.deepEqual(validateWidgetContent(content), []);
    assert.deepEqual(
      content.components.map((component) => component.type),
      ['text', 'text', 'image', 'value', 'value', 'status'],
    );
  });

  test('shows the phase, the illumination and the age', () => {
    // At midnight in Paris on 2026-08-23 lunar calendars publish 75 %
    const content = build(afternoon, { atMidnight: true });
    const [heading, caption] = content.components;
    assert.equal(heading.text, 'Gibbeuse Croissante');
    assert.match(caption.text, /^75 % éclairée · 10,\d jours$/);
  });

  test('draws the disk of the current illumination', () => {
    const content = build(afternoon, { atMidnight: true });
    const image = content.components.find((component) => component.type === 'image');
    assert.equal(image.key, 'moon-v1-wax-75');
    assert.equal(image.fit, 'contain');
    assert.equal(image.alt, 'La Lune, éclairée à 75 %');
  });

  test('shows moonrise and moonset in the timezone of Gladys', () => {
    const state = getMoonState(parisHouse, afternoon, { timezone: PARIS });
    const content = buildMoonWidget(state, { language: 'fr', now: afternoon });
    const [rise, set] = content.components.filter((component) => component.type === 'value');
    assert.equal(rise.label, 'Lever de la lune');
    assert.equal(set.label, 'Coucher de la lune');
    assert.match(rise.value, /^\d\d:\d\d$/);
    // Same instant, another timezone: another wall-clock time
    const tokyo = buildMoonWidget({ ...state, timezone: 'Asia/Tokyo' }, { now: afternoon });
    assert.notEqual(tokyo.components[3].value, rise.value);
  });

  test('lists today, then the upcoming events with countdown and date', () => {
    const content = build(afternoon, { atMidnight: true });
    const { items } = content.components.find((component) => component.type === 'status');
    assert.deepEqual(
      items.map((item) => item.label),
      [
        'Distance Terre-Lune',
        'Trajectoire',
        'Constellation',
        'Nœud nord',
        'Pleine lune',
        'Nouvelle lune',
        'Périgée',
        'Apogée',
        items[8].label,
      ],
    );
    assert.match(items[0].value, /^404\s\d{3} km$/);
    assert.equal(items[2].value, 'Sagittaire');
    // Full moon on Friday 2026-08-28: 5 calendar days from Sunday 23
    assert.match(items[4].value, /^Dans 5 jours · ven\.? 28 août$/);
    assert.ok(['Éclipse pénombrale', 'Éclipse partielle ou totale'].includes(items[8].label));
    assert.deepEqual(
      items.map((item) => item.color),
      [...Array(4).fill('neutral'), ...Array(4).fill('primary'), 'warning'],
    );
  });

  test('counts calendar days: an event tomorrow morning is in 1 day late in the evening', () => {
    // 23:30 in Paris the evening before the full moon of 2026-08-28 04:19 UTC
    const now = new Date('2026-08-27T21:30:00.000Z');
    const { items } = build(now).components.find((component) => component.type === 'status');
    assert.match(items[4].value, /^Dans 1 jour · /);
  });

  test('says today for an event of the current day', () => {
    const now = new Date('2026-08-28T01:00:00.000Z');
    const { items } = build(now).components.find((component) => component.type === 'status');
    assert.match(items[4].value, /^Aujourd'hui · /);
  });

  test('hides the details on demand', () => {
    const content = build(afternoon, { displayDetails: false });
    assert.equal(
      content.components.some((component) => component.type === 'status'),
      false,
    );
    assert.deepEqual(validateWidgetContent(content), []);
  });

  test('shows unknown for an event that was not found', () => {
    const state = { ...getMoonState(parisHouse, afternoon, { timezone: PARIS }) };
    state.next_eclipse = null;
    state.next_eclipse_type = null;
    state.next_node = null;
    const { items } = buildMoonWidget(state, { language: 'en', now: afternoon }).components.find(
      (component) => component.type === 'status',
    );
    assert.equal(items[8].label, 'Next lunar eclipse');
    assert.equal(items[8].value, 'Unknown');
    assert.equal(items[3].value, 'Unknown');
  });

  test('shows --:-- when the moon does not rise or set that day', () => {
    const state = {
      ...getMoonState(parisHouse, afternoon, { timezone: PARIS }),
      moonrise: null,
    };
    const content = buildMoonWidget(state, { language: 'en', now: afternoon });
    assert.equal(content.components[3].value, '--:--');
  });

  for (const language of [...LANGUAGES, 'es', undefined]) {
    test(`stays within the core bounds over a lunation (${language})`, () => {
      for (let day = 0; day < 30; day += 3) {
        const now = new Date(afternoon.getTime() + day * 24 * 60 * 60 * 1000);
        const content = buildMoonWidget(getMoonState(parisHouse, now, { timezone: PARIS }), {
          language,
          now,
        });
        assert.deepEqual(validateWidgetContent(content), []);
        assertWithinBounds(content);
      }
    });
  }
});

describe('content TTL', () => {
  test('is 10 minutes during the day', () => {
    assert.equal(contentTtl(afternoon, PARIS, false), TTL_SECONDS);
  });

  test('stops a few seconds after midnight when midnight comes first', () => {
    // 23:55 in Paris: 300 s to midnight, plus the margin
    assert.equal(contentTtl(new Date('2026-08-23T21:55:00Z'), PARIS, false), 305);
  });

  test('is longer for values computed at midnight', () => {
    assert.equal(contentTtl(afternoon, PARIS, true), MIDNIGHT_TTL_SECONDS);
    assert.equal(contentTtl(new Date('2026-08-23T21:30:00Z'), PARIS, true), 1805);
  });

  test('stays within the core range', () => {
    const ttl = contentTtl(new Date('2026-08-23T21:59:59.500Z'), PARIS, false);
    assert.ok(ttl >= 10 && ttl <= 3600);
  });
});

describe('image keys', () => {
  test('carry the illumination and the direction', () => {
    assert.equal(imageKey(59, true), 'moon-v1-wax-59');
    assert.equal(imageKey(12.4, false), 'moon-v1-wan-12');
    assert.equal(imageKey(140, true), 'moon-v1-wax-100');
    assert.deepEqual(parseImageKey('moon-v1-wan-12'), { illumination: 12, waxing: false });
  });

  test('match the key format of the core', () => {
    assert.match(imageKey(100, false), /^[a-z0-9][a-z0-9-]{0,63}$/);
  });

  test('refuse keys this integration never produced', () => {
    ['moon-v1-wax-101', 'moon-wax-59', 'moon-v1-full-50', '../etc', null, 42].forEach((key) =>
      assert.equal(parseImageKey(key), null, String(key)),
    );
  });
});

describe('messages', () => {
  test('explain a missing house, in the user language', () => {
    const content = houseErrorContent({ error: 'noHouse' }, 'de');
    assert.deepEqual(validateWidgetContent(content), []);
    assert.equal(content.components[0].text, 'Mond');
    assert.match(content.components[1].text, /Standort/);
  });

  test('explain missing coordinates', () => {
    const content = houseErrorContent({ error: 'noCoordinates' }, 'fr');
    assert.match(content.components[1].text, /n'a pas de coordonnées/);
  });

  test('list the houses to use for an unknown name', () => {
    const content = houseErrorContent(
      { error: 'unknownHouse', name: 'Villa', names: ['Maison', 'Chalet'] },
      'en',
    );
    assert.equal(
      content.components[1].text,
      'No house named "Villa". Houses of Gladys: "Maison", "Chalet".',
    );
  });

  test('are valid contents', () => {
    assert.deepEqual(validateWidgetContent(messageContent('x', 'en')), []);
  });
});

describe('i18n', () => {
  test('has every text, phase and sign in every language', () => {
    [TEXTS, PHASES, ZODIAC].forEach((table) =>
      Object.entries(table).forEach(([key, entry]) =>
        LANGUAGES.forEach((language) => assert.equal(typeof entry[language], 'string', key)),
      ),
    );
  });

  test('falls back to English', () => {
    assert.equal(pickLanguage('fr-FR'), 'fr');
    assert.equal(pickLanguage('es'), 'en');
    assert.equal(pickLanguage(undefined), 'en');
    assert.equal(translate(TEXTS.inDays, 'de', { count: 3 }), 'In 3 Tagen');
  });
});
