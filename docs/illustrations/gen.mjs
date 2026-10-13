// Builds the widget contents of the illustrations with the integration's own
// code: node gen.mjs <repo> <out.json> (run by render.sh)
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [repo, out] = process.argv.slice(2);
const load = (path) => import(pathToFileURL(`${repo}/${path}`).href);
const { getMoonState } = await load('src/moon.js');
const { buildMoonWidget } = await load('src/widget.js');
const { moonImageBase64 } = await load('src/moon-image.js');
const { LANGUAGES } = await load('src/i18n.js');
const manifest = JSON.parse(readFileSync(`${repo}/gladys-assistant-integration.json`, 'utf8'));

// An autumn evening in Paris: Wednesday 21 October 2026, 20:00, waxing gibbous.
const NOW = new Date('2026-10-21T18:00:00Z');
const TIMEZONE = 'Europe/Paris';
const HOUSE = { latitude: 48.8566, longitude: 2.3522 };

const state = getMoonState(HOUSE, NOW, { timezone: TIMEZONE });
const contents = {};
const images = {};
for (const language of LANGUAGES) {
  const content = buildMoonWidget(state, { language, displayDetails: true, now: NOW });
  for (const component of content.components.filter((c) => c.type === 'image')) {
    const [, way, percent] = /-(wax|wan)-(\d+)$/.exec(component.key);
    images[component.key] = moonImageBase64(Number(percent), way === 'wax');
  }
  contents[language] = { moon: content };
}
const cards = Object.fromEntries(
  manifest.widgets.map((widget) => [widget.key, { icon: widget.icon, label: widget.label }]),
);
writeFileSync(out, JSON.stringify({ now: NOW.getTime(), cards, contents, images }, null, 1));
console.log('ok', Object.keys(images).join(', '));
