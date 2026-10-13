// -----------------------------------------------------------------------------
// Entry point of the Moon phase external integration.
//
// A dashboard widget showing the phase of the moon, its illumination and age,
// moonrise and moonset, and the upcoming lunar events (full and new moon,
// perigee, apogee, eclipse). It started as a core widget (Gladys PR #2990,
// branch feat/moon-phase-widget) and became an external integration: the
// same computation, rendered through the generic widget vocabulary.
//
// A `provider` integration (manifest `type: "provider"`): no devices.
//   - onWidgetGet('moon')   computes the moon state for the house of the
//                           widget and builds the content (widget.js);
//   - onWidgetGetImage      draws the moon disk with its lit fraction
//                           (moon-image.js);
//   - `lunar_event`         scene trigger fired at the principal phases, the
//                           perigee, the apogee and the lunar eclipses
//                           (events.js, scheduler.js, ephemeris.js);
//   - `get_moon_phase`      scene action: the moon of a house, now
//                           (scene-actions.js).
//
// Everything is computed locally (suncalc + the series of the core PR): no
// network, no key, no account. The coordinates come from the houses of
// Gladys (`location: true`, getHouses()); the timezone is the one of Gladys,
// given to the container as TZ by the supervisor (see time.js).
//
// Environment variables provided by the Gladys supervisor:
//   GLADYS_HOST_API_URL / GLADYS_INTEGRATION_TOKEN / GLADYS_INTEGRATION_SELECTOR / TZ
// The SDK reads them automatically: `new GladysIntegration()` is enough.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { AUTO_LANGUAGE, INTERNAL_KEYS, normalizeConfig, readLanguage } from './src/config.js';
import { buildLunarEvent } from './src/events.js';
import { pickLanguage, TEXTS, translate } from './src/i18n.js';
import { createScheduler } from './src/scheduler.js';
import { SCENE_ACTION_KEY, buildMoonOutputs } from './src/scene-actions.js';
import { createStore } from './src/store.js';
import { getMoonState } from './src/moon.js';
import { moonImageBase64 } from './src/moon-image.js';
import { createHouseRegistry, isLocated } from './src/houses.js';
import { resolveTimezone } from './src/time.js';
import { WIDGET_KEY, buildMoonWidget, houseErrorContent, parseImageKey } from './src/widget.js';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const gladys = new GladysIntegration();
const timezone = resolveTimezone();

const houses = createHouseRegistry({ fetchHouses: () => gladys.getHouses(), logger });

let config = normalizeConfig();
// Language of the last widget request: the language of the scene texts when
// the `language` setting is `auto` (Gladys gives the language to the widgets
// only).
let lastLanguage = 'en';

/**
 * @description Language of the scene texts: the `language` setting, or the
 * language of the last widget request when it is `auto`.
 * @returns {string} The language.
 */
function textLanguage() {
  return config.language === AUTO_LANGUAGE ? lastLanguage : config.language;
}

/**
 * @description Remember the language of a widget request, and store it when
 * it changed (it survives a restart).
 * @param {string} [language] - The language of the request.
 */
function rememberLanguage(language) {
  const next = pickLanguage(language);
  if (typeof language !== 'string' || next === lastLanguage) {
    return;
  }
  lastLanguage = next;
  gladys
    .setConfig({ [INTERNAL_KEYS.language]: next })
    .catch((err) => logger.warn(`Unable to store the language: ${err.message}`));
}

/**
 * @description Read the configuration (the language setting and the stored
 * language).
 * @returns {Promise<void>}
 */
async function loadConfig() {
  try {
    const raw = await gladys.getConfig();
    config = normalizeConfig(raw);
    lastLanguage = readLanguage(raw, lastLanguage);
  } catch (err) {
    logger.error('Unable to read the configuration', err);
  }
}

// --- Lunar events (scene trigger) -----------------------------------------------
const scheduler = createScheduler({
  store: createStore('fired.json', { logger }),
  publish: async (event) => {
    // Disconnected, the event would be lost while marked as fired.
    if (!gladys.connected) {
      return false;
    }
    const { key, data } = buildLunarEvent(event, { language: textLanguage(), timezone });
    try {
      await gladys.publishSceneEvent(key, data);
      logger.info(`Lunar event: ${data.event} (${data.date} ${data.time})`);
      return true;
    } catch (err) {
      logger.warn(`Unable to publish the lunar event ${data.event}: ${err.message}`);
      return false;
    }
  },
  logger,
});

// --- Dashboard widget ----------------------------------------------------------
gladys.onWidgetGet(WIDGET_KEY, async ({ settings = {}, language }) => {
  rememberLanguage(language);
  const found = await houses.find(settings.house);
  if (found.error) {
    return houseErrorContent(found, language);
  }
  if (!isLocated(found.house)) {
    return houseErrorContent({ error: 'noCoordinates' }, language);
  }
  const now = new Date();
  const atMidnight = settings.compute_at_midnight === true;
  const state = getMoonState(found.house, now, { timezone, atMidnight });
  return buildMoonWidget(state, {
    language,
    displayDetails: settings.display_details !== false,
    atMidnight,
    now,
  });
});

// The image key carries the drawing parameters (moon-v1-wax-59): the disk is
// rebuilt from the key alone, after a restart too.
gladys.onWidgetGetImage((imageKey) => {
  const disk = parseImageKey(imageKey);
  if (disk === null) {
    throw new Error(`Unknown image key: ${imageKey}`);
  }
  return moonImageBase64(disk.illumination, disk.waxing);
});

// --- Scene action ------------------------------------------------------------
gladys.onSceneAction(SCENE_ACTION_KEY, async (fields = {}) => {
  const language = textLanguage();
  const found = await houses.find(fields.house);
  if (found.error) {
    const names = (found.names ?? []).map((name) => `"${name}"`).join(', ') || '—';
    throw new Error(translate(TEXTS[found.error], language, { name: found.name, names }));
  }
  if (!isLocated(found.house)) {
    throw new Error(translate(TEXTS.noCoordinates, language));
  }
  const now = new Date();
  return buildMoonOutputs(getMoonState(found.house, now, { timezone }), {
    language,
    timezone,
    now,
  });
});

gladys.onConfigUpdated(async () => {
  await loadConfig();
});

// --- Connection lifecycle ----------------------------------------------------
// Nothing to connect to: the integration is "connected" as soon as it is up.
gladys.on('connected', async () => {
  await loadConfig();
  // Events reached while Gladys was unreachable go out now (within 10 min).
  scheduler.tick().catch((err) => logger.warn(`Lunar events: ${err.message}`));
  try {
    await gladys.setConnectionStatus(true);
  } catch (err) {
    logger.error('Unable to report the connection status', err);
  }
});

// --- Graceful shutdown -------------------------------------------------------
gladys.handleShutdown((signal) => {
  logger.info(`Received ${signal} -> graceful shutdown`);
  scheduler.stop();
});

// --- Startup -----------------------------------------------------------------
logger.info(`Starting the Moon phase integration ${version} (timezone ${timezone})...`);
await scheduler.load();
scheduler.start().catch((err) => logger.warn(`Lunar events: ${err.message}`));
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
