# CLAUDE.md

Project rules for coding assistants (Claude Code reads this file) and for human
contributors.

## What this is

A Gladys Assistant **external integration** of type `provider` adding a moon
phase dashboard widget, scene triggers on the lunar events and a scene action:
a Node.js service
(Node 22+, ESM, no build step) that runs in its own sandboxed Docker container
and talks to Gladys through
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js),
with `suncalc` (kept on 1.9, the version of the core widget it was ported
from) and `pngjs` (the moon disk). Everything is computed locally: no network,
no key, no account.

## Commands

```bash
npm install
npm test                                  # node --test, the built-in runner
node --test test/widgets.test.js          # one file
npm run lint                              # ESLint
npm run format:check                      # Prettier, as the CI runs it
npm run format                            # Prettier, fix in place
npx github:GladysAssistant/integration-store . --skip-image-check   # store checks
node .github/scripts/release.mjs plan     # the version the next release would get
```

## Architecture

```
index.js                SDK wiring only: handlers registered before connect()
src/moon.js             the moon state (port of the core PR #2990, suncalc)
src/moon-image.js       the moon disk with its lit fraction (PNG, NASA photo)
src/houses.js           the house whose coordinates are used
src/time.js             the timezone of Gladys, local days and times
src/widget.js           the dashboard widget content and its image keys
src/i18n.js             runtime texts, en / fr / de / es
assets/moon.png         the NASA photo of the moon (credits in assets/CREDITS.md)
gladys-assistant-integration.json   manifest
docs/{en,fr,de,es}.md   user documentation, re-hosted by the store
.github/scripts/release.mjs         version, changelog, bump (tested in test/)
docs/illustrations/render.sh        regenerates the widget illustrations (docs/assets)
```

## Rules

- **Keys are forever**: the keys of `config_schema`, widgets and their
  settings, scene triggers (fields, variables) and scene actions (fields,
  outputs), and the image keys (`moon-v1-wax-59`) the core caches.
  `test/structure.test.js` compares them to `test/fixtures/discovery.baseline.json`:
  never update the baseline to make a test pass without a documented migration.
- **The container rootfs is read-only.** Write only under `/data`.
- **Four languages.** Every user-facing text (manifest, runtime messages in
  `src/i18n.js`, `docs/*.md`, README) exists in English, French, German and
  Spanish. `test/i18n.test.js` checks it.
- **Versions belong to the Release workflow**: never edit `version` in
  `package.json`, the lockfile or the manifest, nor the `docker_image` tag.
- **Changelog.** Never edit CHANGELOG.md by hand, it is generated at the
  release. Write the PR title as the line the user will read.
- **Commits and PR titles** follow Conventional Commits, in English: `feat` ->
  minor, `fix` / `perf` -> patch, `!` or `BREAKING CHANGE:` -> major (minor
  below 1.0.0); `docs`, `chore`, `ci`, `test`, `style`, `refactor`, `build`
  release nothing. Scope `security` lands under "Security", a description
  starting with "remove" / "drop" under "Removed".
- **Manifest.** Texts are objects `{ "en", "fr", "de", "es" }`; the catalog
  `description` holds 10 to 100 characters per language. A field older cores
  do not know needs a higher `gladys_version` minimum (see `src/constants.js`
  of the integration-store).
- **Moon computation.** Keep the results identical to the core widget: do not
  bump `suncalc` without a parity run (see the README).
- **Widget illustrations.** `docs/assets/widgets.<lang>.png` are generated
  from the widget code by `docs/illustrations/render.sh`: run it again after
  any change to a widget content, and keep them labelled as illustrations.
- **Style.** Prettier formats, ESLint catches mistakes. Comments explain why,
  in English. Tests never touch the network.
