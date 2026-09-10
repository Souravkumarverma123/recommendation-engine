import { afterAll, beforeAll, vi } from "vitest";

/**
 * Pin `Date` — and only `Date` — to a fixed instant for a suite whose
 * assertions depend on "now": the QCO enforcement-date logic in
 * `resolveStatus`. Timers stay real, so the Postgres driver's connection
 * timeouts are untouched.
 *
 * `DEMO_NOW` sits after every seeded QCO's enforcement date, so the demo
 * scenarios read exactly as they do on the day of the demo — the assertions no
 * longer depend on the wall clock when CI happens to run.
 */
export const DEMO_NOW = new Date("2026-09-11T12:00:00Z");

export function freezeClock(at: Date = DEMO_NOW): void {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(at);
  });
  afterAll(() => {
    vi.useRealTimers();
  });
}
