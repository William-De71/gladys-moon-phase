// -----------------------------------------------------------------------------
// The lunar events of the `lunar_event` scene trigger (pure logic).
//
// The principal phases (new moon, first quarter, full moon, last quarter),
// the perigee, the apogee and the lunar eclipses happen at one instant for the
// whole Earth: no house is needed to know when, only to say what time it is
// there (the timezone of Gladys). The instants come from ephemeris.js, to the
// minute; the eclipses are found by moon.js (a full moon close to a node) and
// dated at that full moon.
//
// Each event is identified by its type and its minute (`full_moon@2026-10-26T04:12`):
// that is what the scheduler remembers, so a restart never fires one twice.
// -----------------------------------------------------------------------------

import SunCalc from 'suncalc';
import { findNextLunarEclipse } from './moon.js';
import { moonPosition, nextDistanceExtremum, nextPhaseInstant } from './ephemeris.js';
import { TEXTS, pickLanguage, translate } from './i18n.js';
import { formatTime, localDay } from './time.js';

const TRIGGER_KEY = 'lunar_event';
const MS_PER_HALF_DAY = 12 * 60 * 60 * 1000;
const LUNAR_EVENTS = [
  'new_moon',
  'first_quarter',
  'full_moon',
  'last_quarter',
  'perigee',
  'apogee',
  'lunar_eclipse',
];
// Text of each event; the eclipse is named after its type.
const EVENT_TEXTS = {
  new_moon: TEXTS.newMoon,
  first_quarter: TEXTS.firstQuarter,
  full_moon: TEXTS.fullMoon,
  last_quarter: TEXTS.lastQuarter,
  perigee: TEXTS.perigee,
  apogee: TEXTS.apogee,
};

/**
 * @description The next instant of every lunar event, from a date.
 * @param {Date} from - The start of the search.
 * @returns {Array<{ event: string, date: Date, eclipseType?: string }>} The
 * events, the soonest first (an event a search did not find is left out).
 * @example
 * nextEvents(new Date('2026-10-13T00:00:00Z'))[0]; // { event: 'new_moon', date: … }
 */
function nextEvents(from) {
  // moon.js tells which full moon is an eclipse (its own full moon can be a
  // few hours away from the real one): the eclipse is dated at the real full
  // moon closest to it.
  const eclipse = findNextLunarEclipse(new Date(from.getTime() - MS_PER_HALF_DAY));
  const eclipseDate = eclipse
    ? nextPhaseInstant(new Date(eclipse.date - MS_PER_HALF_DAY), 180)
    : null;
  const events = [
    { event: 'new_moon', date: nextPhaseInstant(from, 0) },
    { event: 'first_quarter', date: nextPhaseInstant(from, 90) },
    { event: 'full_moon', date: nextPhaseInstant(from, 180) },
    { event: 'last_quarter', date: nextPhaseInstant(from, 270) },
    { event: 'perigee', date: nextDistanceExtremum(from, true) },
    { event: 'apogee', date: nextDistanceExtremum(from, false) },
    eclipseDate && eclipseDate > from
      ? { event: 'lunar_eclipse', date: eclipseDate, eclipseType: eclipse.type }
      : null,
  ];
  return events.filter((entry) => entry && entry.date).sort((a, b) => a.date - b.date);
}

/**
 * @description The identifier of an event: its type and its minute.
 * @param {{ event: string, date: Date }} entry - The event.
 * @returns {string} "full_moon@2026-10-26T04:12".
 */
function eventId({ event, date }) {
  return `${event}@${date.toISOString().slice(0, 16)}`;
}

/**
 * @description The name of an event, in a language.
 * @param {{ event: string, eclipseType?: string }} entry - The event.
 * @param {string} language - A supported language.
 * @returns {string} "Full moon", "Partial or total eclipse"…
 */
function eventName({ event, eclipseType }, language) {
  if (event === 'lunar_eclipse') {
    return translate(
      eclipseType === 'penumbral' ? TEXTS.penumbral : TEXTS.partialOrTotal,
      language,
    );
  }
  return translate(EVENT_TEXTS[event], language);
}

/**
 * @description The scene event of a lunar event.
 * @param {{ event: string, date: Date, eclipseType?: string }} entry - The event.
 * @param {object} options - Options.
 * @param {string} options.language - Language of the texts.
 * @param {string} options.timezone - Timezone of Gladys.
 * @returns {{ key: string, data: object }} The trigger key and its flat data.
 * @example
 * buildLunarEvent({ event: 'full_moon', date }, { language: 'fr', timezone: 'Europe/Paris' });
 */
function buildLunarEvent(entry, { language, timezone }) {
  const lang = pickLanguage(language);
  const percent = Math.round(SunCalc.getMoonIllumination(entry.date).fraction * 100);
  const distance = Math.round(moonPosition(entry.date).distance);
  const time = formatTime(entry.date, timezone);
  const name = eventName(entry, lang);
  return {
    key: TRIGGER_KEY,
    data: {
      event: entry.event,
      event_name: name,
      date: localDay(entry.date, timezone),
      time,
      illumination: percent,
      distance_km: distance,
      summary: translate(TEXTS.summaryEvent, lang, {
        event: name,
        time,
        percent,
        distance: new Intl.NumberFormat(lang).format(distance),
      }),
    },
  };
}

export { TRIGGER_KEY, LUNAR_EVENTS, nextEvents, eventId, eventName, buildLunarEvent };
