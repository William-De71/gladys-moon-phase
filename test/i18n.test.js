import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';

import { LANGUAGES, TEXTS, PHASES, ZODIAC } from '../src/i18n.js';
import { getMoonState } from '../src/moon.js';
import { buildMoonWidget, houseErrorContent } from '../src/widget.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const manifest = JSON.parse(read('../gladys-assistant-integration.json'));

/**
 * @description Every multi-language object of the manifest, with its path.
 * @param {unknown} node - A manifest node.
 * @param {string} path - Its path.
 * @returns {Array<[string, object]>} The texts.
 */
function texts(node, path = '') {
  if (Array.isArray(node)) {
    return node.flatMap((child, i) => texts(child, `${path}[${i}]`));
  }
  if (node && typeof node === 'object') {
    if (typeof node.en === 'string') {
      return [[path, node]];
    }
    return Object.entries(node).flatMap(([key, child]) => texts(child, `${path}.${key}`));
  }
  return [];
}

test('every manifest text exists in English, French, German and Spanish', () => {
  const found = texts(manifest);
  assert.ok(found.length > 10);
  for (const [path, text] of found) {
    for (const language of LANGUAGES) {
      assert.ok(text[language]?.trim(), `${path}.${language} is missing`);
    }
  }
});

test('catalog description: 10 to 100 characters per language', () => {
  for (const language of LANGUAGES) {
    const { length } = manifest.description[language];
    assert.ok(length >= 10 && length <= 100, `description.${language}: ${length}`);
  }
});

test('widget labels: 3 to 30 characters per language', () => {
  for (const widget of manifest.widgets) {
    for (const language of LANGUAGES) {
      const { length } = widget.label[language];
      assert.ok(length >= 3 && length <= 30, `${widget.key}.label.${language}: ${length}`);
    }
  }
});

test('every runtime text exists in the four languages, with the same placeholders', () => {
  const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const table of [TEXTS, PHASES, ZODIAC]) {
    for (const [key, entry] of Object.entries(table)) {
      for (const language of LANGUAGES) {
        assert.ok(entry[language], `${key}.${language} is missing`);
        assert.deepEqual(
          placeholders(entry[language]),
          placeholders(entry.en),
          `${key}.${language}`,
        );
      }
    }
  }
});

test('the widget is valid in every language, details and messages included', () => {
  const house = { latitude: -33.8688, longitude: 151.2093 };
  const now = new Date('2026-10-13T08:00:00Z');
  const state = getMoonState(house, now, { timezone: 'Australia/Sydney' });
  for (const language of LANGUAGES) {
    for (const content of [
      buildMoonWidget(state, { language, displayDetails: true, now }),
      buildMoonWidget(state, { language, displayDetails: false, now }),
      houseErrorContent({ error: 'noHouse' }, language),
      houseErrorContent({ error: 'unknownHouse', name: 'Chalet', names: ['Maison'] }, language),
    ]) {
      assert.deepEqual(validateWidgetContent(content), [], language);
    }
  }
  const heading = (language) =>
    buildMoonWidget(state, { language, now }).components.find((c) => c.variant === 'heading').text;
  assert.ok(Object.values(PHASES).some((phase) => phase.es === heading('es')));
});

test('docs: English and French mandatory, the four languages with the same structure', () => {
  const headings = (text) => text.split('\n').filter((line) => /^#{1,3} /.test(line)).length;
  const tables = (text) => text.split('\n').filter((line) => /^\|\s*-/.test(line)).length;
  const docs = Object.fromEntries(
    LANGUAGES.map((language) => {
      const path = new URL(`../docs/${language}.md`, import.meta.url);
      assert.ok(existsSync(path), `docs/${language}.md is missing`);
      return [language, readFileSync(path, 'utf8')];
    }),
  );
  for (const language of LANGUAGES) {
    assert.ok(docs[language].length > 300, `docs/${language}.md is too short`);
    assert.equal(headings(docs[language]), headings(docs.en), `docs/${language}.md headings`);
    assert.equal(tables(docs[language]), tables(docs.en), `docs/${language}.md tables`);
  }
});

test('README: one per language, each linking to the three others and showing the cover', () => {
  const files = { en: 'README.md', fr: 'README.fr.md', de: 'README.de.md', es: 'README.es.md' };
  for (const file of Object.values(files)) {
    const path = new URL(`../${file}`, import.meta.url);
    assert.ok(existsSync(path), `${file} is missing`);
    const text = readFileSync(path, 'utf8');
    for (const other of Object.values(files).filter((name) => name !== file)) {
      assert.ok(text.includes(`](${other})`), `${file} does not link to ${other}`);
    }
    assert.ok(text.includes('](cover.jpg)'), `${file}: cover`);
  }
});

test('README and docs show the generated widget illustration of their language', () => {
  const files = { en: 'README.md', fr: 'README.fr.md', de: 'README.de.md', es: 'README.es.md' };
  for (const language of LANGUAGES) {
    const image = `docs/assets/widgets.${language}.png`;
    assert.ok(existsSync(new URL(`../${image}`, import.meta.url)), `${image} is missing`);
    assert.ok(read(`../${files[language]}`).includes(`](${image})`), files[language]);
    assert.ok(
      read(`../docs/${language}.md`).includes(
        `](https://raw.githubusercontent.com/William-De71/gladys-moon-phase/main/${image})`,
      ),
      `docs/${language}.md`,
    );
  }
});
