// -----------------------------------------------------------------------------
// The `get_moon_phase` scene action: the moon of a house, now, as scalar
// outputs a scene can test or put in a message.
//
// The phase, the illumination, the age and moonrise / moonset are the values
// of the widget (moon.js). The next full and new moon are the real instants
// (ephemeris.js), the ones the `lunar_event` trigger fires at.
// -----------------------------------------------------------------------------

import { nextPhaseInstant } from './ephemeris.js';
import { PHASES, TEXTS, pickLanguage, translate } from './i18n.js';
import { calendarDaysBetween, formatShortDate, formatTime, localDay } from './time.js';

const SCENE_ACTION_KEY = 'get_moon_phase';

/**
 * @description "2026-10-26 05:13", in the timezone of Gladys.
 * @param {Date|null} date - The instant.
 * @param {string} timezone - The timezone.
 * @returns {string} The date and time, '' when unknown.
 */
function dateTime(date, timezone) {
  return date ? `${localDay(date, timezone)} ${formatTime(date, timezone)}` : '';
}

/**
 * @description The outputs of `get_moon_phase`.
 * @param {object} state - The moon state of the house (getMoonState).
 * @param {object} options - Options.
 * @param {string} options.language - Language of the texts.
 * @param {string} options.timezone - Timezone of Gladys.
 * @param {Date} options.now - Now.
 * @returns {object} The outputs, scalars only.
 * @example
 * buildMoonOutputs(getMoonState(house, now, { timezone }), { language: 'fr', timezone, now });
 */
function buildMoonOutputs(state, { language, timezone, now }) {
  const lang = pickLanguage(language);
  const fullMoon = nextPhaseInstant(now, 180);
  const newMoon = nextPhaseInstant(now, 0);
  const phaseName = translate(PHASES[state.phase_name], lang);
  const shortDate = (date) =>
    date ? `${formatShortDate(date, lang, timezone)} ${formatTime(date, timezone)}` : '?';
  return {
    phase_name: phaseName,
    phase: state.phase,
    illumination: state.illumination,
    age_days: state.age_days,
    waxing: state.waxing,
    moonrise: state.moonrise ? formatTime(state.moonrise, timezone) : '',
    moonset: state.moonset ? formatTime(state.moonset, timezone) : '',
    next_full_moon: dateTime(fullMoon, timezone),
    days_until_full_moon: fullMoon ? calendarDaysBetween(fullMoon, now, timezone) : -1,
    next_new_moon: dateTime(newMoon, timezone),
    days_until_new_moon: newMoon ? calendarDaysBetween(newMoon, now, timezone) : -1,
    summary: translate(TEXTS.summaryPhase, lang, {
      phase: phaseName,
      percent: state.illumination,
      full: shortDate(fullMoon),
      new: shortDate(newMoon),
    }),
  };
}

export { SCENE_ACTION_KEY, buildMoonOutputs };
