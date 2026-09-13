import type { Entry } from "./types";

/**
 * Client-only localStorage persistence so a reload, an accidental refresh,
 * or a dropped network connection doesn't throw away completed lookups or
 * an in-progress draft. There is no backend session — this is the only
 * thing standing between a refresh and losing an officer's work.
 */

const ENTRIES_KEY = "manak:dashboard:entries:v1";
const DRAFT_KEY = "manak:dashboard:draft:v1";

/** Cap how much we keep so localStorage doesn't grow unbounded over a long session. */
const MAX_PERSISTED_ENTRIES = 20;

type PersistedState = {
  entries: Entry[];
  activeId: string | null;
};

const EMPTY_STATE: PersistedState = { entries: [], activeId: null };

export function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(ENTRIES_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as PersistedState).entries)
    ) {
      return EMPTY_STATE;
    }
    return parsed as PersistedState;
  } catch {
    return EMPTY_STATE;
  }
}

export function savePersistedState(entries: Entry[], activeId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    // Only completed lookups are worth restoring — a loading or failed
    // entry's in-flight request can't be resumed after a reload, so
    // keeping it around would just strand the UI on a fake spinner.
    const done = entries.filter((e) => e.status === "done").slice(-MAX_PERSISTED_ENTRIES);
    const restoredActiveId = done.some((e) => e.id === activeId) ? activeId : (done.at(-1)?.id ?? null);
    window.localStorage.setItem(ENTRIES_KEY, JSON.stringify({ entries: done, activeId: restoredActiveId }));
  } catch {
    // Storage unavailable (private browsing, quota, disabled) — work
    // continues in memory, it just won't survive a reload this time.
  }
}

export function loadDraft(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveDraft(value: string): void {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.localStorage.setItem(DRAFT_KEY, value);
    } else {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  } catch {
    // ignore — same as above, this is a best-effort convenience
  }
}
