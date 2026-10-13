// -----------------------------------------------------------------------------
// The instants of the lunar events of the scene triggers: the principal
// phases, the perigee and the apogee.
//
// The widget keeps the computation of the core widget (moon.js, SunCalc), so
// its values stay identical to it. SunCalc defines the phase by the phase
// angle, not by the difference of ecliptic longitude that defines the
// principal phases: its full moon can be 5 hours away from the real one, and
// its distance puts the perigee up to 4 hours off. A scene fired at a given
// minute needs better, hence this module:
//   - the moon: the 32 main terms of the ELP-2000/82 series as given by
//     J. Meeus, Astronomical Algorithms, 2nd ed., chapter 47 (table 47.A),
//     longitude and distance;
//   - the sun: the low-precision formulas of chapter 25, aberration included;
//   - a phase is the instant the elongation (moon minus sun longitude)
//     reaches 0°, 90°, 180° or 270°.
// Checked against PyEphem over 200 phases (2026-2033): at most 3 minutes off;
// perigee and apogee at most 34 minutes (the distance curve is flat there),
// distance within 30 km.
// -----------------------------------------------------------------------------

import { findNextExtremum, findNextZeroCrossing } from './moon.js';

const RAD = Math.PI / 180;
const MS_PER_DAY = 86400000;

// Table 47.A: arguments [D, M, M', F], longitude (1e-6 degree), distance (m).
const TERMS = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
];

/**
 * @description Wrap an angle into [0, 360[.
 * @param {number} degrees - The angle.
 * @returns {number} The angle in [0, 360[.
 */
function normalize(degrees) {
  return ((degrees % 360) + 360) % 360;
}

/**
 * @description Julian centuries since J2000.0.
 * @param {Date} date - The instant.
 * @returns {number} The centuries.
 */
function centuries(date) {
  return (date.getTime() / MS_PER_DAY + 2440587.5 - 2451545.0) / 36525;
}

/**
 * @description Geocentric ecliptic longitude and distance of the moon.
 * @param {Date} date - The instant.
 * @returns {{ longitude: number, distance: number }} Degrees, kilometers.
 * @example
 * moonPosition(new Date('2026-10-26T04:12:00Z')).distance; // ~ 368 600
 */
function moonPosition(date) {
  const t = centuries(date);
  const meanLongitude = 218.3164477 + 481267.88123421 * t - 0.0015786 * t * t;
  const d = RAD * (297.8501921 + 445267.1114034 * t - 0.0018819 * t * t);
  const m = RAD * (357.5291092 + 35999.0502909 * t - 0.0001536 * t * t);
  const mp = RAD * (134.9633964 + 477198.8675055 * t + 0.0087414 * t * t);
  const f = RAD * (93.272095 + 483202.0175233 * t - 0.0036539 * t * t);
  // The terms with the mean anomaly of the sun shrink with the eccentricity
  // of the Earth's orbit.
  const e = 1 - 0.002516 * t;
  let longitude = 0;
  let distance = 0;
  for (const [cd, cm, cmp, cf, cl, cr] of TERMS) {
    const argument = cd * d + cm * m + cmp * mp + cf * f;
    const factor = e ** Math.abs(cm);
    longitude += cl * factor * Math.sin(argument);
    distance += cr * factor * Math.cos(argument);
  }
  return {
    longitude: normalize(meanLongitude + longitude / 1e6),
    distance: 385000.56 + distance / 1000,
  };
}

/**
 * @description Apparent ecliptic longitude of the sun (Meeus, chapter 25).
 * @param {Date} date - The instant.
 * @returns {number} Degrees in [0, 360[.
 */
function sunLongitude(date) {
  const t = centuries(date);
  const meanLongitude = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const m = RAD * (357.52911 + 35999.05029 * t - 0.0001537 * t * t);
  const center =
    (1.914602 - 0.004817 * t) * Math.sin(m) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * m) +
    0.000289 * Math.sin(3 * m);
  // -0.00569°: the aberration.
  return normalize(meanLongitude + center - 0.00569);
}

/**
 * @description The next instant the elongation of the moon reaches an angle.
 * @param {Date} from - The start of the search (excluded).
 * @param {number} angle - 0 (new moon), 90, 180 (full moon) or 270.
 * @returns {Date|null} The instant, to the minute.
 * @example
 * nextPhaseInstant(new Date('2026-10-13T00:00:00Z'), 180); // 2026-10-26T04:1xZ
 */
function nextPhaseInstant(from, angle) {
  const distanceToAngle = (date) => {
    const difference = moonPosition(date).longitude - sunLongitude(date) - angle;
    return difference - 360 * Math.round(difference / 360);
  };
  // A minute after `from`, so a phase just reached is not found again; the
  // wrapped difference jumps by 360° half a lunation away from the angle:
  // that jump is not a crossing.
  return findNextZeroCrossing(new Date(from.getTime() + 60000), distanceToAngle, 32, 6, 90);
}

/**
 * @description The next perigee or apogee.
 * @param {Date} from - The start of the search.
 * @param {boolean} perigee - True for the perigee, false for the apogee.
 * @returns {Date|null} The instant.
 */
function nextDistanceExtremum(from, perigee) {
  return findNextExtremum(from, (date) => moonPosition(date).distance, perigee, 30);
}

export { moonPosition, sunLongitude, nextPhaseInstant, nextDistanceExtremum };
