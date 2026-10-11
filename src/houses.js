// -----------------------------------------------------------------------------
// Houses of the Gladys instance, for the coordinates of the moon widget.
//
// widget.get only carries the settings of the widget: the coordinates are
// read through the host API (`location: true` in the manifest, SDK
// getHouses()). There is no update event for the houses, so the list is
// re-read at most once a minute, on demand.
//
// The "House" setting is a free text: `source: "houses"` (a list of the
// houses) is on the master branch of Gladys but in no release yet, and a
// manifest using it is refused by Gladys 5.1. Empty means the first located
// house — the common single-house case.
// -----------------------------------------------------------------------------

const DEFAULT_MAX_AGE_MS = 60 * 1000;

/**
 * @description True when a house has usable coordinates.
 * @param {object} house - A house of Gladys.
 * @returns {boolean} True when located.
 * @example
 * isLocated({ latitude: 48.85, longitude: 2.35 }); // true
 */
function isLocated(house) {
  return Number.isFinite(house?.latitude) && Number.isFinite(house?.longitude);
}

/**
 * @description Create the house registry.
 * @param {object} options - Options.
 * @param {Function} options.fetchHouses - `() => Promise<Array<object>>`, the SDK getHouses().
 * @param {number} [options.maxAgeMs] - How long a read list is reused.
 * @param {Function} [options.now] - Clock, for the tests.
 * @param {object} [options.logger] - Logger with warn.
 * @returns {{ list: Function, find: Function }} The registry.
 * @example
 * const houses = createHouseRegistry({ fetchHouses: () => gladys.getHouses() });
 */
function createHouseRegistry({
  fetchHouses,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
  now = Date.now,
  logger = console,
}) {
  let houses = [];
  let readAt = null;
  let pending = null;

  /**
   * @description The houses of Gladys, re-read when the list is too old. A
   * failed read keeps the previous list: a transient error must not blank
   * every moon widget; with no list at all, the error goes up.
   * @returns {Promise<Array<object>>} `[{ id, name, selector, latitude, longitude }]`.
   * @example
   * await houses.list();
   */
  async function list() {
    if (readAt !== null && now() - readAt < maxAgeMs) {
      return houses;
    }
    if (pending === null) {
      pending = (async () => {
        try {
          const fetched = await fetchHouses();
          houses = Array.isArray(fetched) ? fetched : [];
          readAt = now();
        } catch (err) {
          if (readAt === null) {
            throw err;
          }
          logger.warn(`Unable to read the houses of Gladys, previous list kept: ${err.message}`);
        } finally {
          pending = null;
        }
        return houses;
      })();
    }
    return pending;
  }

  /**
   * @description Find the house a widget targets.
   *   - empty: the first located house;
   *   - otherwise its name or selector, exactly, then its name ignoring case.
   * @param {string|null|undefined} wanted - The "House" setting.
   * @returns {Promise<{ house: object }|{ error: string, name?: string, names?: Array<string> }>}
   * The house (located or not), or why there is none: `noHouse` (no located
   * house at all) or `unknownHouse` (no house of that name).
   * @example
   * const { house } = await houses.find('Maison');
   */
  async function find(wanted) {
    const all = await list();
    const target = typeof wanted === 'string' ? wanted.trim() : '';
    if (target === '') {
      const house = all.find(isLocated);
      return house ? { house } : { error: 'noHouse' };
    }
    const lower = target.toLowerCase();
    const house =
      all.find((candidate) => candidate.name === target || candidate.selector === target) ??
      all.find((candidate) => String(candidate.name).toLowerCase() === lower);
    if (house) {
      return { house };
    }
    return { error: 'unknownHouse', name: target, names: all.map((candidate) => candidate.name) };
  }

  return { list, find };
}

export { createHouseRegistry, isLocated };
