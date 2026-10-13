// -----------------------------------------------------------------------------
// Texts of the widget: English, French and German come from the i18n files of
// the core PR #2990, Spanish was added here. Any other language falls back to
// English.
//
// The core sends the language of the requesting user with every widget.get
// and caches the content per language: the texts are resolved here, not sent
// as multi-language objects.
// -----------------------------------------------------------------------------

const LANGUAGES = ['en', 'fr', 'de', 'es'];

const TEXTS = {
  moon: { en: 'Moon', fr: 'Lune', de: 'Mond', es: 'Luna' },
  illumination: {
    en: '{percent} % illuminated',
    fr: '{percent} % éclairée',
    de: '{percent} % beleuchtet',
    es: '{percent} % iluminada',
  },
  age: { en: '{days} days', fr: '{days} jours', de: '{days} Tage', es: '{days} días' },
  diskAlt: {
    en: 'The moon, {percent} % illuminated',
    fr: 'La Lune, éclairée à {percent} %',
    de: 'Der Mond, zu {percent} % beleuchtet',
    es: 'La Luna, iluminada al {percent} %',
  },
  moonrise: { en: 'Moonrise', fr: 'Lever de la lune', de: 'Mondaufgang', es: 'Salida de la luna' },
  moonset: {
    en: 'Moonset',
    fr: 'Coucher de la lune',
    de: 'Monduntergang',
    es: 'Puesta de la luna',
  },
  distance: {
    en: 'Earth-Moon distance',
    fr: 'Distance Terre-Lune',
    de: 'Entfernung Erde-Mond',
    es: 'Distancia Tierra-Luna',
  },
  kilometers: { en: 'km', fr: 'km', de: 'km', es: 'km' },
  trajectory: { en: 'Trajectory', fr: 'Trajectoire', de: 'Bahn', es: 'Trayectoria' },
  ascending: { en: 'Ascending', fr: 'Ascendante', de: 'Aufsteigend', es: 'Ascendente' },
  descending: { en: 'Descending', fr: 'Descendante', de: 'Absteigend', es: 'Descendente' },
  zodiac: { en: 'Constellation', fr: 'Constellation', de: 'Sternbild', es: 'Constelación' },
  nextNodeNorth: {
    en: 'North node',
    fr: 'Nœud nord',
    de: 'Aufsteigender Knoten',
    es: 'Nodo norte',
  },
  nextNodeSouth: { en: 'South node', fr: 'Nœud sud', de: 'Absteigender Knoten', es: 'Nodo sur' },
  fullMoon: { en: 'Full moon', fr: 'Pleine lune', de: 'Vollmond', es: 'Luna llena' },
  newMoon: { en: 'New moon', fr: 'Nouvelle lune', de: 'Neumond', es: 'Luna nueva' },
  perigee: { en: 'Perigee', fr: 'Périgée', de: 'Perigäum', es: 'Perigeo' },
  apogee: { en: 'Apogee', fr: 'Apogée', de: 'Apogäum', es: 'Apogeo' },
  nextEclipse: {
    en: 'Next lunar eclipse',
    fr: 'Prochaine éclipse de lune',
    de: 'Nächste Mondfinsternis',
    es: 'Próximo eclipse lunar',
  },
  penumbral: {
    en: 'Penumbral eclipse',
    fr: 'Éclipse pénombrale',
    de: 'Halbschattenfinsternis',
    es: 'Eclipse penumbral',
  },
  partialOrTotal: {
    en: 'Partial or total eclipse',
    fr: 'Éclipse partielle ou totale',
    de: 'Partielle oder totale Finsternis',
    es: 'Eclipse parcial o total',
  },
  today: { en: 'Today', fr: "Aujourd'hui", de: 'Heute', es: 'Hoy' },
  inOneDay: { en: 'In 1 day', fr: 'Dans 1 jour', de: 'In 1 Tag', es: 'En 1 día' },
  inDays: {
    en: 'In {count} days',
    fr: 'Dans {count} jours',
    de: 'In {count} Tagen',
    es: 'En {count} días',
  },
  unknown: { en: 'Unknown', fr: 'Inconnu', de: 'Unbekannt', es: 'Desconocido' },
  noHouse: {
    en: 'No house of Gladys has a location: set it in the house settings.',
    fr: "Aucune maison de Gladys n'est localisée : renseignez sa position dans ses réglages.",
    de: 'Kein Zuhause in Gladys hat einen Standort: lege ihn in den Einstellungen des Zuhauses fest.',
    es: 'Ninguna casa de Gladys tiene ubicación: indícala en los ajustes de la casa.',
  },
  noCoordinates: {
    en: 'This house has no coordinates. Please configure the house location first.',
    fr: "Cette maison n'a pas de coordonnées. Veuillez d'abord configurer sa localisation.",
    de: 'Dieses Zuhause hat keine Koordinaten. Bitte konfiguriere zuerst seinen Standort.',
    es: 'Esta casa no tiene coordenadas. Configura primero la ubicación de la casa.',
  },
  unknownHouse: {
    en: 'No house named "{name}". Houses of Gladys: {names}.',
    fr: 'Aucune maison nommée « {name} ». Maisons de Gladys : {names}.',
    de: 'Kein Zuhause namens „{name}“. Zuhause in Gladys: {names}.',
    es: 'Ninguna casa se llama «{name}». Casas de Gladys: {names}.',
  },
};

const PHASES = {
  newMoon: { en: 'New Moon', fr: 'Nouvelle Lune', de: 'Neumond', es: 'Luna Nueva' },
  waxingCrescent: {
    en: 'Waxing Crescent',
    fr: 'Premier Croissant',
    de: 'Zunehmende Sichel',
    es: 'Luna Creciente',
  },
  firstQuarter: {
    en: 'First Quarter',
    fr: 'Premier Quartier',
    de: 'Erstes Viertel',
    es: 'Cuarto Creciente',
  },
  waxingGibbous: {
    en: 'Waxing Gibbous',
    fr: 'Gibbeuse Croissante',
    de: 'Zunehmender Dreiviertelmond',
    es: 'Gibosa Creciente',
  },
  fullMoon: { en: 'Full Moon', fr: 'Pleine Lune', de: 'Vollmond', es: 'Luna Llena' },
  waningGibbous: {
    en: 'Waning Gibbous',
    fr: 'Gibbeuse Décroissante',
    de: 'Abnehmender Dreiviertelmond',
    es: 'Gibosa Menguante',
  },
  lastQuarter: {
    en: 'Last Quarter',
    fr: 'Dernier Quartier',
    de: 'Letztes Viertel',
    es: 'Cuarto Menguante',
  },
  waningCrescent: {
    en: 'Waning Crescent',
    fr: 'Dernier Croissant',
    de: 'Abnehmende Sichel',
    es: 'Luna Menguante',
  },
};

const ZODIAC = {
  aries: { en: 'Aries', fr: 'Bélier', de: 'Widder', es: 'Aries' },
  taurus: { en: 'Taurus', fr: 'Taureau', de: 'Stier', es: 'Tauro' },
  gemini: { en: 'Gemini', fr: 'Gémeaux', de: 'Zwillinge', es: 'Géminis' },
  cancer: { en: 'Cancer', fr: 'Cancer', de: 'Krebs', es: 'Cáncer' },
  leo: { en: 'Leo', fr: 'Lion', de: 'Löwe', es: 'Leo' },
  virgo: { en: 'Virgo', fr: 'Vierge', de: 'Jungfrau', es: 'Virgo' },
  libra: { en: 'Libra', fr: 'Balance', de: 'Waage', es: 'Libra' },
  scorpio: { en: 'Scorpio', fr: 'Scorpion', de: 'Skorpion', es: 'Escorpio' },
  sagittarius: { en: 'Sagittarius', fr: 'Sagittaire', de: 'Schütze', es: 'Sagitario' },
  capricorn: { en: 'Capricorn', fr: 'Capricorne', de: 'Steinbock', es: 'Capricornio' },
  aquarius: { en: 'Aquarius', fr: 'Verseau', de: 'Wassermann', es: 'Acuario' },
  pisces: { en: 'Pisces', fr: 'Poissons', de: 'Fische', es: 'Piscis' },
};

/**
 * @description The supported language closest to the one requested.
 * @param {string} [language] - ISO 639-1 language, possibly with a region.
 * @returns {string} 'en', 'fr', 'de' or 'es'.
 * @example
 * pickLanguage('fr-FR'); // 'fr'
 */
function pickLanguage(language) {
  const base = typeof language === 'string' ? language.slice(0, 2).toLowerCase() : '';
  return LANGUAGES.includes(base) ? base : 'en';
}

/**
 * @description Resolve a multi-language entry and fill its placeholders.
 * @param {object} entry - `{ en, fr, de, es }`.
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
