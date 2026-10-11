import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { validateWidgetImage } from '@gladysassistant/integration-sdk';

import { renderMoonPng, moonImageBase64 } from '../src/moon-image.js';

/**
 * @description Mean brightness of a vertical band of the disk.
 * @param {object} image - Decoded PNG.
 * @param {number} fromX - First column (fraction of the width).
 * @param {number} toX - Last column (fraction of the width).
 * @returns {number} Mean of R+G+B over the opaque pixels of the band.
 * @example
 * brightness(PNG.sync.read(png), 0.6, 0.8);
 */
function brightness(image, fromX, toX) {
  let sum = 0;
  let count = 0;
  const top = Math.floor(image.height * 0.4);
  const bottom = Math.floor(image.height * 0.6);
  for (let y = top; y < bottom; y += 1) {
    for (let x = Math.floor(image.width * fromX); x < Math.floor(image.width * toX); x += 1) {
      const offset = (y * image.width + x) * 4;
      if (image.data[offset + 3] > 200) {
        sum += image.data[offset] + image.data[offset + 1] + image.data[offset + 2];
        count += 1;
      }
    }
  }
  return sum / count;
}

test('serves images the core accepts', () => {
  [0, 25, 50, 75, 100].forEach((illumination) =>
    [true, false].forEach((waxing) =>
      assert.deepEqual(validateWidgetImage(moonImageBase64(illumination, waxing)), []),
    ),
  );
});

test('lights the right side while waxing and the left side while waning', () => {
  const waxing = PNG.sync.read(renderMoonPng(25, true));
  const waning = PNG.sync.read(renderMoonPng(25, false));
  assert.ok(brightness(waxing, 0.75, 0.95) > brightness(waxing, 0.05, 0.25) * 1.5);
  assert.ok(brightness(waning, 0.05, 0.25) > brightness(waning, 0.75, 0.95) * 1.5);
});

test('shades the whole disk at the new moon and none of it at the full moon', () => {
  const photo = PNG.sync.read(renderMoonPng(100, true));
  const dark = PNG.sync.read(renderMoonPng(0, true));
  const ratio = brightness(dark, 0.2, 0.8) / brightness(photo, 0.2, 0.8);
  // The shadow keeps 30 % of the photo plus the shadow color
  assert.ok(ratio > 0.2 && ratio < 0.5, String(ratio));
});

test('keeps the transparent corners transparent', () => {
  const image = PNG.sync.read(renderMoonPng(50, true));
  assert.equal(image.data[3], 0);
});

test('serves the same bytes for the same key', () => {
  assert.equal(moonImageBase64(42, true), moonImageBase64(42, true));
  assert.notEqual(moonImageBase64(42, true), moonImageBase64(42, false));
});
