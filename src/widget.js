// -----------------------------------------------------------------------------
// The moon dashboard widget, in the content vocabulary of the external
// integrations (capabilities/dashboard-widgets.md).
//
// It transposes the core widget of PR #2990 as closely as the vocabulary
// allows (see the comparison in the README):
//
//   heading   the phase name                      "Gibbeuse Croissante"
//   caption   illumination and age                "75 % éclairée · 10,2 jours"
//   image     the moon disk, lit fraction drawn   (moon-image.js)
//   value ×2  moonrise, moonset                   "18:45"
//   status    today: distance, trajectory, constellation, next node;
//             upcoming: full moon, new moon, perigee, apogee, eclipse
//             with the countdown and the date     "Dans 5 jours · ven. 16 oct."
//
// 6 components out of the budget of 8 (1 focal, 2 tiles, 2 texts, 1 status).
// -----------------------------------------------------------------------------

import { TEXTS, PHASES, ZODIAC, pickLanguage, translate } from './i18n.js';
import { calendarDaysBetween, formatShortDate, formatTime, secondsUntilMidnight } from './time.js';

const WIDGET_KEY = 'moon';

// The countdowns move once a day and the illumination by about 0.1 % in ten
// minutes: 10 minutes is plenty (the core widget polled every minute only
// because it had no TTL to honour). Values computed at midnight only change
// at the next midnight.
const TTL_SECONDS = 600;
const MIDNIGHT_TTL_SECONDS = 3600;
const MIN_TTL_SECONDS = 10;
// The content is re-pulled a few seconds after midnight, never just before.
const MIDNIGHT_MARGIN_SECONDS = 5;
const MESSAGE_TTL_SECONDS = 60;

// Image keys: moon-v1-wax-59 / moon-v1-wan-12. The key carries everything the
// drawing depends on, so the bytes change only when the key does (the core
// caches an image by key for an hour). `v1` is the drawing version: bump it
// when the drawing changes.
const IMAGE_KEY_PREFIX = 'moon-v1';
const IMAGE_KEY_REGEX = /^moon-v1-(wax|wan)-(\d{1,3})$/;

/**
 * @description The image key of the moon disk.
 * @param {number} illumination - Illuminated percentage, 0-100.
 * @param {boolean} waxing - True while the moon is waxing.
 * @returns {string} The key.
 * @example
 * imageKey(59, true); // 'moon-v1-wax-59'
 */
function imageKey(illumination, waxing) {
  const percent = Math.min(100, Math.max(0, Math.round(illumination)));
  return `${IMAGE_KEY_PREFIX}-${waxing ? 'wax' : 'wan'}-${percent}`;
}

/**
 * @description Read an image key back.
 * @param {string} key - The image key.
 * @returns {{ illumination: number, waxing: boolean }|null} The drawing
 * parameters, null for a key this integration never produced.
 * @example
 * parseImageKey('moon-v1-wan-12'); // { illumination: 12, waxing: false }
 */
function parseImageKey(key) {
  const match = typeof key === 'string' ? IMAGE_KEY_REGEX.exec(key) : null;
  if (match === null || Number(match[2]) > 100) {
    return null;
  }
  return { illumination: Number(match[2]), waxing: match[1] === 'wax' };
}

/**
 * @description A content made of a title and a message (no house, no
 * coordinates…).
 * @param {string} message - The message.
 * @param {string} language - The user language.
 * @returns {object} The widget content.
 * @example
 * messageContent('No house', 'en');
 */
function messageContent(message, language) {
  return {
    version: 1,
    ttl_seconds: MESSAGE_TTL_SECONDS,
    components: [
      { type: 'text', variant: 'heading', text: translate(TEXTS.moon, pickLanguage(language)) },
      { type: 'text', variant: 'body', text: message },
    ],
  };
}

/**
 * @description The message content explaining why a widget has no house.
 * @param {{ error: string, name?: string, names?: Array<string> }} reason - From houses.find().
 * @param {string} language - The user language.
 * @returns {object} The widget content.
 * @example
 * houseErrorContent({ error: 'noHouse' }, 'fr');
 */
function houseErrorContent(reason, language) {
  const lang = pickLanguage(language);
  if (reason.error === 'unknownHouse') {
    const names =
      reason.names.length > 0 ? reason.names.map((name) => `"${name}"`).join(', ') : '—';
    return messageContent(translate(TEXTS.unknownHouse, lang, { name: reason.name, names }), lang);
  }
  return messageContent(translate(TEXTS[reason.error] ?? TEXTS.noHouse, lang), lang);
}

/**
 * @description The TTL of the content: 10 minutes, or the next midnight when
 * it comes first (the countdowns change at midnight); values computed at
 * midnight are good until the next one.
 * @param {Date} now - The current instant.
 * @param {string} timezone - IANA timezone.
 * @param {boolean} atMidnight - True when the values are computed at midnight.
 * @returns {number} The TTL in seconds.
 * @example
 * contentTtl(new Date(), 'Europe/Paris', false);
 */
function contentTtl(now, timezone, atMidnight) {
  const untilMidnight = secondsUntilMidnight(now, timezone) + MIDNIGHT_MARGIN_SECONDS;
  const ttl = Math.min(atMidnight ? MIDNIGHT_TTL_SECONDS : TTL_SECONDS, untilMidnight);
  return Math.max(MIN_TTL_SECONDS, ttl);
}

/**
 * @description Build the moon widget content.
 * @param {object} state - From getMoonState().
 * @param {object} options - Options.
 * @param {string} [options.language] - The user language.
 * @param {boolean} [options.displayDetails] - Show the status list.
 * @param {boolean} [options.atMidnight] - The values were computed at midnight.
 * @param {Date} [options.now] - The current instant (countdowns count from it).
 * @returns {object} The widget content.
 * @example
 * buildMoonWidget(getMoonState(house, now, { timezone }), { language: 'fr', now });
 */
function buildMoonWidget(
  state,
  { language, displayDetails = true, atMidnight = false, now = new Date() } = {},
) {
  const lang = pickLanguage(language);
  const t = (entry, fields) => translate(entry, lang, fields);
  const { timezone } = state;

  // Calendar days from today, like the core widget: from the current day
  // even when the values are computed at midnight (same day anyway).
  const countdown = (date) => {
    if (!(date instanceof Date)) {
      return t(TEXTS.unknown);
    }
    const days = calendarDaysBetween(date, now, timezone);
    if (days <= 0) {
      return t(TEXTS.today);
    }
    return days === 1 ? t(TEXTS.inOneDay) : t(TEXTS.inDays, { count: days });
  };
  // The countdown and the absolute date of the core widget, in one status
  // value (the vocabulary has no secondary value on a status line).
  const eventValue = (date) =>
    date instanceof Date
      ? `${countdown(date)} · ${formatShortDate(date, lang, timezone)}`
      : t(TEXTS.unknown);

  // The second decimal of the age is noise at this precision
  const age = state.age_days.toLocaleString(lang, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const components = [
    { type: 'text', variant: 'heading', text: t(PHASES[state.phase_name]) },
    {
      type: 'text',
      variant: 'caption',
      text: `${t(TEXTS.illumination, { percent: state.illumination })} · ${t(TEXTS.age, { days: age })}`,
    },
    {
      type: 'image',
      key: imageKey(state.illumination, state.waxing),
      alt: t(TEXTS.diskAlt, { percent: state.illumination }),
      fit: 'contain',
    },
    { type: 'value', label: t(TEXTS.moonrise), value: formatTime(state.moonrise, timezone) },
    { type: 'value', label: t(TEXTS.moonset), value: formatTime(state.moonset, timezone) },
  ];

  if (displayDetails) {
    // One status list for both sections of the core widget ("Today",
    // "Upcoming"): the vocabulary has a single list per card, without
    // section titles. The colors keep the two groups apart.
    components.push({
      type: 'status',
      items: [
        {
          label: t(TEXTS.distance),
          value: `${state.distance.toLocaleString(lang)} ${t(TEXTS.kilometers)}`,
          color: 'neutral',
        },
        {
          label: t(TEXTS.trajectory),
          value: t(state.ascending ? TEXTS.ascending : TEXTS.descending),
          color: 'neutral',
        },
        { label: t(TEXTS.zodiac), value: t(ZODIAC[state.zodiac_sign]), color: 'neutral' },
        {
          // Which node comes next is carried by the label, so the value stays
          // a plain countdown like the other events.
          label: t(state.next_node_ascending ? TEXTS.nextNodeNorth : TEXTS.nextNodeSouth),
          value: countdown(state.next_node),
          color: 'neutral',
        },
        { label: t(TEXTS.fullMoon), value: eventValue(state.next_full_moon), color: 'primary' },
        { label: t(TEXTS.newMoon), value: eventValue(state.next_new_moon), color: 'primary' },
        { label: t(TEXTS.perigee), value: eventValue(state.next_perigee), color: 'primary' },
        { label: t(TEXTS.apogee), value: eventValue(state.next_apogee), color: 'primary' },
        {
          label: t(state.next_eclipse_type ? TEXTS[state.next_eclipse_type] : TEXTS.nextEclipse),
          value: eventValue(state.next_eclipse),
          color: 'warning',
        },
      ],
    });
  }

  return { version: 1, ttl_seconds: contentTtl(now, timezone, atMidnight), components };
}

export {
  WIDGET_KEY,
  TTL_SECONDS,
  MIDNIGHT_TTL_SECONDS,
  imageKey,
  parseImageKey,
  messageContent,
  houseErrorContent,
  contentTtl,
  buildMoonWidget,
};
