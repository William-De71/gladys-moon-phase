// -----------------------------------------------------------------------------
// Configuration of the Moon phase integration.
//
// Field of the config_schema:
//   - `language`   language of the scene texts (event names, summaries):
//                  `auto` follows the language of the last widget request.
//                  Gladys gives the language to the widgets only.
//
// Internal key, outside the config_schema (never shown in the UI):
//   - `last_language`   language of the last widget request, for the scene
//                       texts after a restart.
// -----------------------------------------------------------------------------

import { LANGUAGES } from './i18n.js';

const AUTO_LANGUAGE = 'auto';
const INTERNAL_KEYS = { language: 'last_language' };

/**
 * @description Normalize the raw config object from the host API.
 * @param {object} [rawConfig] - The raw config values.
 * @returns {{ language: string }} 'auto' or a language code.
 * @example
 * normalizeConfig({ language: 'es' }); // { language: 'es' }
 */
function normalizeConfig(rawConfig = {}) {
  const config = rawConfig ?? {};
  return { language: LANGUAGES.includes(config.language) ? config.language : AUTO_LANGUAGE };
}

/**
 * @description Read the stored language of the last widget request.
 * @param {object} [rawConfig] - The raw config values.
 * @param {string} fallback - The language to keep when nothing valid is stored.
 * @returns {string} The language.
 * @example
 * readLanguage({ last_language: 'fr' }, 'en'); // 'fr'
 */
function readLanguage(rawConfig, fallback) {
  const language = (rawConfig ?? {})[INTERNAL_KEYS.language];
  return LANGUAGES.includes(language) ? language : fallback;
}

export { AUTO_LANGUAGE, INTERNAL_KEYS, normalizeConfig, readLanguage };
