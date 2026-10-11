# Gladys Moon phase

External [Gladys Assistant](https://gladysassistant.com) integration adding a **moon phase dashboard widget**:
phase, illumination and age, the moon disk, moonrise and moonset, and the upcoming lunar events (full and new moon,
perigee, apogee, lunar eclipse). Built on `@gladysassistant/integration-sdk` 0.14.

**Zero configuration, fully local**: everything is computed from the location of the house, with no account, no
key and no internet access.

User documentation: [English](docs/en.md) · [Français](docs/fr.md).

## Origin

This widget started as a core widget of Gladys (PR #2990, branch `feat/moon-phase-widget`). It became an external
integration so it does not weigh on the core: the computation is a port of `server/lib/house/house.getMoonState.js`
(same `suncalc` version, same series, same searches) and its tests are ported in `test/moon.test.js`. A parity run
over 864 instants of 2026 (Paris, Sydney, New York, live and at midnight) gave strictly identical results.

## The widget

A `provider` integration (manifest `type: "provider"`): no devices, one widget, `moon`.

| Core widget (PR #2990)                                         | This integration                                         |
| -------------------------------------------------------------- | -------------------------------------------------------- |
| Phase name                                                     | `text` heading                                           |
| « 75 % éclairée · 10,2 jours »                                 | `text` caption                                           |
| Moon disk: NASA photo, shadow #11131c at 70 %                  | `image`, the same photo shaded server side (PNG, 256 px) |
| Moonrise / moonset                                             | two `value` tiles                                        |
| « Today »: distance, trajectory, constellation, next node      | first four lines of the `status` list                    |
| « Upcoming »: full / new moon, perigee, apogee, eclipse + date | five next lines, « Dans 5 jours · ven. 28 août »         |
| Countdowns in calendar days of the house (fix e15d92ba2)       | same, in the timezone of Gladys                          |
| Settings: house, display details, compute at midnight          | same three widget settings                               |
| Texts in English, French, German                               | same texts (any other language falls back to English)    |

6 components out of the budget of 8. What the vocabulary cannot express (the disk next to the text instead of a
full-width 16:9 frame, two titled sections, the date in grey next to the countdown) was listed during the test of
the widget vocabulary (branch `feat/dev-widget-test`, `CORE-NEEDS.md`).

### Timezone

The supervisor starts every integration container with `TZ` set to the timezone of Gladys: moonrise, moonset, the
« compute at midnight » instant and the day countdowns follow it (`src/time.js`, on top of `Intl`, no date library).
The content TTL is 10 minutes, cut short to just after midnight so the countdowns move on time; values computed at
midnight are kept up to an hour.

### House

The « House » setting is a free text: the house name or selector, any case; empty means the first house with a
location. A list of the houses (`source: "houses"`) exists on the master branch of Gladys but in no release yet,
and Gladys 5.1 refuses a manifest using it. The houses are read through the host API (`location: true`,
`getHouses()`), at most once a minute.

### Image

The disk is served through `onWidgetGetImage`. The key carries everything the drawing depends on
(`moon-v1-wax-59`: drawing version, waxing or waning, illuminated percentage), so the bytes change only when the key
does, and the disk is rebuilt from the key alone after a restart. Drawn with `pngjs` (pure JavaScript, no native
binary per architecture), about 90 KB, cached in memory (202 keys at most).

As in the core widget, the shadow stays vertical, like on a lunar calendar (lit on the right while waxing).

## Development

```bash
npm install
npm test            # node --test
npm run lint
npm run format:check
```

`npm start` needs a running Gladys (the SDK reads `GLADYS_HOST_API_URL`, `GLADYS_INTEGRATION_TOKEN` and
`GLADYS_INTEGRATION_SELECTOR`, set by the supervisor).

## Requirements

Gladys **5.1.1** or later (dashboard widgets of external integrations).

## Credits

Moon photo: NASA's Scientific Visualization Studio, public domain — see [assets/CREDITS.md](assets/CREDITS.md).

## License

Apache-2.0.
