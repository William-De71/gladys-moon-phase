// -----------------------------------------------------------------------------
// The moon disk, drawn as a PNG and served through onWidgetGetImage.
//
// The core widget of PR #2990 clips a NASA photo of the moon in SVG, in the
// browser. An integration cannot ship SVG, so the same photo is shaded here
// and sent as PNG bytes: same picture, same terminator geometry, same shadow
// (#11131c at 70 %, so the relief of the unlit part still shows through, the
// way earthshine lights it, and a black disk never reads as a hole in the
// card). Only the place where the clipping happens changes.
//
// Like the core widget, the shadow is kept vertical, as on a lunar calendar:
// lit on the right while waxing, on the left while waning.
//
// pngjs (pure JavaScript) rather than sharp: no native binary to match on
// each architecture of the image, and the disk is 256 px.
//
// assets/moon.png is the very file of PR #2990 (NASA SVS, public domain — see
// assets/CREDITS.md).
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const PHOTO_URL = new URL('../assets/moon.png', import.meta.url);
const SHADOW_COLOR = [0x11, 0x13, 0x1c];
const SHADOW_OPACITY = 0.7;
// 101 illumination values × 2 directions at most: everything fits in memory.
const MAX_CACHE_ENTRIES = 202;

let photo = null;
const cache = new Map();

/**
 * @description Decode the moon photo once, as RGBA.
 * @returns {{ width: number, height: number, data: Buffer }} The photo.
 * @example
 * const { width } = loadPhoto();
 */
function loadPhoto() {
  if (photo === null) {
    photo = PNG.sync.read(readFileSync(PHOTO_URL));
  }
  return photo;
}

/**
 * @description Draw the moon disk with its lit fraction.
 * @param {number} illumination - Illuminated percentage, 0-100.
 * @param {boolean} waxing - True while the moon is waxing (lit on the right).
 * @returns {Buffer} The PNG bytes.
 * @example
 * const png = renderMoonPng(59, true);
 */
function renderMoonPng(illumination, waxing) {
  const { width, height, data } = loadPhoto();
  const image = new PNG({ width, height });
  data.copy(image.data);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2;
  // The terminator is the projection of the half-lit sphere: an ellipse whose
  // signed half width runs from +radius (new moon) to -radius (full moon).
  const k = 1 - (2 * Math.min(100, Math.max(0, illumination))) / 100;

  for (let y = 0; y < height; y += 1) {
    // pixel centers, so the disk is symmetric
    const dy = y + 0.5 - centerY;
    const halfWidth = Math.sqrt(Math.max(0, radius * radius - dy * dy));
    const terminator = k * halfWidth;
    for (let x = 0; x < width; x += 1) {
      const dx = x + 0.5 - centerX;
      const lit = waxing ? dx >= terminator : dx <= -terminator;
      if (!lit) {
        const offset = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel += 1) {
          image.data[offset + channel] = Math.round(
            image.data[offset + channel] * (1 - SHADOW_OPACITY) +
              SHADOW_COLOR[channel] * SHADOW_OPACITY,
          );
        }
      }
    }
  }

  return PNG.sync.write(image, { colorType: 6, deflateLevel: 9 });
}

/**
 * @description The disk as raw base64, what onWidgetGetImage resolves.
 * Cached: the bytes only depend on the two parameters.
 * @param {number} illumination - Illuminated percentage, 0-100.
 * @param {boolean} waxing - True while the moon is waxing.
 * @returns {string} Raw base64 of the PNG.
 * @example
 * const base64 = moonImageBase64(59, true);
 */
function moonImageBase64(illumination, waxing) {
  const key = `${waxing ? 'wax' : 'wan'}-${illumination}`;
  let base64 = cache.get(key);
  if (base64 === undefined) {
    base64 = renderMoonPng(illumination, waxing).toString('base64');
    if (cache.size >= MAX_CACHE_ENTRIES) {
      cache.delete(cache.keys().next().value);
    }
    cache.set(key, base64);
  }
  return base64;
}

export { renderMoonPng, moonImageBase64 };
