// -----------------------------------------------------------------------------
// Fires the `lunar_event` scene trigger when a lunar event happens.
//
// One timer, set to the next event (at most 6 hours ahead, then the events
// are computed again). When it rings, every event reached and not fired yet
// is published. The events fired are kept in /data for 40 days: a restart
// never fires one twice. The instants are searched to the minute, so the same
// event computed from two starting points can land a few seconds apart: an
// event of the same kind already fired within 6 hours is the same one. An event missed by more than 10 minutes (the
// container was stopped) is dropped: a "full moon" scene an hour late would
// surprise more than it helps. While Gladys cannot be reached, the
// publication is retried every minute within those 10 minutes.
// -----------------------------------------------------------------------------

import { eventId, nextEvents } from './events.js';

const GRACE_MS = 10 * 60 * 1000;
const MAX_WAIT_MS = 6 * 60 * 60 * 1000;
const RETRY_MS = 60 * 1000;
const MIN_WAIT_MS = 1000;
const KEEP_MS = 40 * 24 * 60 * 60 * 1000;
const SAME_EVENT_MS = 6 * 60 * 60 * 1000;

/**
 * @description Create the scheduler of the lunar events.
 * @param {object} options - Options.
 * @param {object} options.store - The JSON store of the fired events.
 * @param {Function} options.publish - `(event) => Promise<boolean>`: true once published.
 * @param {object} [options.logger] - The logger.
 * @param {Function} [options.now] - The clock.
 * @param {Function} [options.setTimer] - setTimeout.
 * @param {Function} [options.clearTimer] - clearTimeout.
 * @returns {{ load: Function, start: Function, stop: Function, tick: Function }} The scheduler.
 * @example
 * const scheduler = createScheduler({ store, publish });
 * await scheduler.load();
 * scheduler.start();
 */
function createScheduler({
  store,
  publish,
  logger = null,
  now = () => new Date(),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  // event id -> instant of the event (ms)
  let fired = new Map();
  let timer = null;
  let running = false;
  // One tick at a time: the timer and the reconnection may ring together,
  // and an event must not be published twice.
  let queue = Promise.resolve();

  const alreadyFired = (event) => {
    for (const [id, time] of fired) {
      if (id.startsWith(`${event.event}@`) && Math.abs(time - event.date) < SAME_EVENT_MS) {
        return true;
      }
    }
    return false;
  };

  const persist = async (at) => {
    for (const [id, time] of fired) {
      if (time < at - KEEP_MS) {
        fired.delete(id);
      }
    }
    await store.save(Object.fromEntries(fired));
  };

  const schedule = (delay) => {
    clearTimer(timer);
    if (!running) {
      return;
    }
    timer = setTimer(
      () => {
        tick().catch((err) => logger?.warn(`Lunar events: ${err.message}`));
      },
      Math.max(MIN_WAIT_MS, delay),
    );
    timer?.unref?.();
  };

  /**
   * @description Publish the events reached, then wait for the next one.
   * @returns {Promise<Array<object>>} The events published.
   */
  function tick() {
    const run = queue.then(publishReached);
    queue = run.catch(() => {});
    return run;
  }

  /**
   * @description One tick, see tick().
   * @returns {Promise<Array<object>>} The events published.
   */
  async function publishReached() {
    const at = now();
    const events = nextEvents(new Date(at.getTime() - GRACE_MS));
    const published = [];
    let pending = false;
    for (const event of events.filter((entry) => entry.date <= at)) {
      if (alreadyFired(event)) {
        continue;
      }
      if (await publish(event)) {
        fired.set(eventId(event), event.date.getTime());
        published.push(event);
      } else {
        pending = true;
      }
    }
    if (published.length > 0) {
      await persist(at.getTime());
    }
    const upcoming = events.find((entry) => entry.date > at);
    const untilNext = upcoming ? upcoming.date - at : MAX_WAIT_MS;
    schedule(pending ? RETRY_MS : Math.min(untilNext, MAX_WAIT_MS));
    return published;
  }

  return {
    async load() {
      const stored = await store.load({});
      fired = new Map(
        Object.entries(stored && typeof stored === 'object' ? stored : {}).filter(([, time]) =>
          Number.isFinite(time),
        ),
      );
    },
    start() {
      running = true;
      return tick();
    },
    stop() {
      running = false;
      clearTimer(timer);
    },
    tick,
  };
}

export { createScheduler, GRACE_MS, MAX_WAIT_MS, RETRY_MS };
