// -----------------------------------------------------------------------------
// Texts of the widget, in the three languages of the core PR #2990 (en, fr,
// de), taken from its i18n files. Any other language falls back to English.
//
// The core sends the language of the requesting user with every widget.get
// and caches the content per language: the texts are resolved here, not sent
// as multi-language objects.
// -----------------------------------------------------------------------------

const LANGUAGES = ['en', 'fr', 'de'];

const TEXTS = {
  moon: { en: 'Moon', fr: 'Lune', de: 'Mond' },
  illumination: {
    en: '{percent} % illuminated',
    fr: '{percent} % éclairée',
    de: '{percent} % beleuchtet',
  },
  age: { en: '{days} days', fr: '{days} jours', de: '{days} Tage' },
  diskAlt: {
    en: 'The moon, {percent} % illuminated',
    fr: 'La Lune, éclairée à {percent} %',
    de: 'Der Mond, zu {percent} % beleuchtet',
  },
  moonrise: { en: 'Moonrise', fr: 'Lever de la lune', de: 'Mondaufgang' },
  moonset: { en: 'Moonset', fr: 'Coucher de la lune', de: 'Monduntergang' },
  distance: { en: 'Earth-Moon distance', fr: 'Distance Terre-Lune', de: 'Entfernung Erde-Mond' },
  kilometers: { en: 'km', fr: 'km', de: 'km' },
  trajectory: { en: 'Trajectory', fr: 'Trajectoire', de: 'Bahn' },
  ascending: { en: 'Ascending', fr: 'Ascendante', de: 'Aufsteigend' },
  descending: { en: 'Descending', fr: 'Descendante', de: 'Absteigend' },
  zodiac: { en: 'Constellation', fr: 'Constellation', de: 'Sternbild' },
  nextNodeNorth: { en: 'North node', fr: 'Nœud nord', de: 'Aufsteigender Knoten' },
  nextNodeSouth: { en: 'South node', fr: 'Nœud sud', de: 'Absteigender Knoten' },
  fullMoon: { en: 'Full moon', fr: 'Pleine lune', de: 'Vollmond' },
  newMoon: { en: 'New moon', fr: 'Nouvelle lune', de: 'Neumond' },
  perigee: { en: 'Perigee', fr: 'Périgée', de: 'Perigäum' },
  apogee: { en: 'Apogee', fr: 'Apogée', de: 'Apogäum' },
  nextEclipse: {
    en: 'Next lunar eclipse',
    fr: 'Prochaine éclipse de lune',
    de: 'Nächste Mondfinsternis',
  },
  penumbral: { en: 'Penumbral eclipse', fr: 'Éclipse pénombrale', de: 'Halbschattenfinsternis' },
  partialOrTotal: {
    en: 'Partial or total eclipse',
    fr: 'Éclipse partielle ou totale',
    de: 'Partielle oder totale Finsternis',
  },
  today: { en: 'Today', fr: "Aujourd'hui", de: 'Heute' },
  inOneDay: { en: 'In 1 day', fr: 'Dans 1 jour', de: 'In 1 Tag' },
  inDays: { en: 'In {count} days', fr: 'Dans {count} jours', de: 'In {count} Tagen' },
  unknown: { en: 'Unknown', fr: 'Inconnu', de: 'Unbekannt' },
  noHouse: {
    en: 'No house of Gladys has a location: set it in the house settings.',
    fr: "Aucune maison de Gladys n'est localisée : renseignez sa position dans ses réglages.",
    de: 'Kein Zuhause in Gladys hat einen Standort: lege ihn in den Einstellungen des Zuhauses fest.',
  },
  noCoordinates: {
    en: 'This house has no coordinates. Please configure the house location first.',
    fr: "Cette maison n'a pas de coordonnées. Veuillez d'abord configurer sa localisation.",
    de: 'Dieses Zuhause hat keine Koordinaten. Bitte konfiguriere zuerst seinen Standort.',
  },
  unknownHouse: {
    en: 'No house named "{name}". Houses of Gladys: {names}.',
    fr: 'Aucune maison nommée « {name} ». Maisons de Gladys : {names}.',
    de: 'Kein Zuhause namens „{name}“. Zuhause in Gladys: {names}.',
  },
};

const PHASES = {
  newMoon: { en: 'New Moon', fr: 'Nouvelle Lune', de: 'Neumond' },
  waxingCrescent: { en: 'Waxing Crescent', fr: 'Premier Croissant', de: 'Zunehmende Sichel' },
  firstQuarter: { en: 'First Quarter', fr: 'Premier Quartier', de: 'Erstes Viertel' },
  waxingGibbous: {
    en: 'Waxing Gibbous',
    fr: 'Gibbeuse Croissante',
    de: 'Zunehmender Dreiviertelmond',
  },
  fullMoon: { en: 'Full Moon', fr: 'Pleine Lune', de: 'Vollmond' },
  waningGibbous: {
    en: 'Waning Gibbous',
    fr: 'Gibbeuse Décroissante',
    de: 'Abnehmender Dreiviertelmond',
  },
  lastQuarter: { en: 'Last Quarter', fr: 'Dernier Quartier', de: 'Letztes Viertel' },
  waningCrescent: { en: 'Waning Crescent', fr: 'Dernier Croissant', de: 'Abnehmende Sichel' },
};

const ZODIAC = {
  aries: { en: 'Aries', fr: 'Bélier', de: 'Widder' },
  taurus: { en: 'Taurus', fr: 'Taureau', de: 'Stier' },
  gemini: { en: 'Gemini', fr: 'Gémeaux', de: 'Zwillinge' },
  cancer: { en: 'Cancer', fr: 'Cancer', de: 'Krebs' },
  leo: { en: 'Leo', fr: 'Lion', de: 'Löwe' },
  virgo: { en: 'Virgo', fr: 'Vierge', de: 'Jungfrau' },
  libra: { en: 'Libra', fr: 'Balance', de: 'Waage' },
  scorpio: { en: 'Scorpio', fr: 'Scorpion', de: 'Skorpion' },
  sagittarius: { en: 'Sagittarius', fr: 'Sagittaire', de: 'Schütze' },
  capricorn: { en: 'Capricorn', fr: 'Capricorne', de: 'Steinbock' },
  aquarius: { en: 'Aquarius', fr: 'Verseau', de: 'Wassermann' },
  pisces: { en: 'Pisces', fr: 'Poissons', de: 'Fische' },
};

/**
 * @description The supported language closest to the one requested.
 * @param {string} [language] - ISO 639-1 language, possibly with a region.
 * @returns {string} 'en', 'fr' or 'de'.
 * @example
 * pickLanguage('fr-FR'); // 'fr'
 */
function pickLanguage(language) {
  const base = typeof language === 'string' ? language.slice(0, 2).toLowerCase() : '';
  return LANGUAGES.includes(base) ? base : 'en';
}

/**
 * @description Resolve a multi-language entry and fill its placeholders.
 * @param {object} entry - `{ en, fr, de }`.
 * @param {string} language - A supported language.
 * @param {object} [fields] - Placeholder values.
 * @returns {string} The text.
 * @example
 * translate(TEXTS.inDays, 'fr', { count: 5 }); // 'Dans 5 jours'
 */
function translate(entry, language, fields = {}) {
  const template = entry[language] ?? entry.en;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    fields[key] === undefined ? match : String(fields[key]),
  );
}

export { LANGUAGES, TEXTS, PHASES, ZODIAC, pickLanguage, translate };
