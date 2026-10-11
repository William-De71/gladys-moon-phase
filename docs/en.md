# Moon phase

This integration adds a **"Moon phase"** dashboard widget to Gladys: today's phase, the illumination and age of the
moon, its lit disk, moonrise and moonset, and the upcoming lunar events.

## Ready to use

**Nothing to configure**: everything is computed locally from the location of your house, with no account, no key
and no internet access.

The house must have a **location**: set it in **Settings → Houses**.

## Add the widget

Edit a dashboard, pick **Moon phase** among the integration widgets, then set:

| Setting                            | What it does                                                                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **House**                          | Name of the house whose location is used. Leave empty for the first house with a location (the single-house case).                                                   |
| **Display details**                | Shows the list under the moon (distance, trajectory, constellation, upcoming events). Uncheck to keep only the phase, the disk, moonrise and moonset.                |
| **Compute the values at midnight** | Computes the illumination, distance, age and countdowns at midnight, like lunar calendars, so both can be compared line by line. Moonrise and moonset do not change. |

## What the widget shows

- **The phase** (New Moon, Waxing Crescent, First Quarter, Waxing Gibbous, Full Moon…), the **illuminated
  percentage** and the **age** of the moon (days since the last new moon).
- **The moon disk** (a NASA photo) with its lit part.
- **Moonrise and moonset** of the day, in the timezone of Gladys. `--:--` when the moon does not rise or set that
  day (about one day a month).
- **Today**: Earth-Moon distance, trajectory (ascending or descending), constellation (sidereal zodiac, like lunar
  calendars) and the next node.
- **Upcoming**: full moon, new moon, perigee, apogee and next lunar eclipse, with the number of days and the date.

The widget refreshes every 10 minutes and right after midnight.

## FAQ

**The widget says no house has a location.** Set the location of a house in Settings → Houses.

**The widget says "No house named …".** The name typed in the House setting matches no house: the message lists the
names to use.

**The times are off.** Check the timezone of Gladys (Settings → System); the integration uses it. Restart the
integration after changing it.

**My language is not English, French or German.** The widget is then shown in English.
