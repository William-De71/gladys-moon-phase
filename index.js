// -----------------------------------------------------------------------------
// Entry point of the Moon phase external integration.
//
// A dashboard widget showing the phase of the moon, its illumination and age,
// moonrise and moonset, and the upcoming lunar events (full and new moon,
// perigee, apogee, eclipse). It started as a core widget (Gladys PR #2990,
// branch feat/moon-phase-widget) and became an external integration: the
// same computation, rendered through the generic widget vocabulary.
//
// A `provider` integration (manifest `type: "provider"`): no devices, only
// the widget.
//   - onWidgetGet('moon')   computes the moon state for the house of the
//                           widget and builds the content (widget.js);
//   - onWidgetGetImage      draws the moon disk with its lit fraction
//                           (moon-image.js).
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
import { getMoonState } from './src/moon.js';
import { moonImageBase64 } from './src/moon-image.js';
import { createHouseRegistry, isLocated } from './src/houses.js';
import { resolveTimezone } from './src/time.js';
import { WIDGET_KEY, buildMoonWidget, houseErrorContent, parseImageKey } from './src/widget.js';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const gladys = new GladysIntegration();
const timezone = resolveTimezone();

const houses = createHouseRegistry({ fetchHouses: () => gladys.getHouses(), logger });

// --- Dashboard widget ----------------------------------------------------------
gladys.onWidgetGet(WIDGET_KEY, async ({ settings = {}, language }) => {
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

// --- Connection lifecycle ----------------------------------------------------
// Nothing to connect to: the integration is "connected" as soon as it is up.
gladys.on('connected', async () => {
  try {
    await gladys.setConnectionStatus(true);
  } catch (err) {
    logger.error('Unable to report the connection status', err);
  }
});

// --- Graceful shutdown -------------------------------------------------------
gladys.handleShutdown((signal) => {
  logger.info(`Received ${signal} -> graceful shutdown`);
});

// --- Startup -----------------------------------------------------------------
logger.info(`Starting the Moon phase integration ${version} (timezone ${timezone})...`);
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
