import { describe, expect, it } from "vitest";

import { resolveVersion, VersionIndex, type VersionRow } from "./version";

/**
 * Pure unit — version/supersession resolution (ticket #12, docs/PRD.md user
 * stories 7-10). A table of catalogue snapshots → the edition that actually
 * applies today, mirroring `allied.test.ts`'s style for the sibling
 * "walk the graph purely in memory" module.
 */

function row(over: Partial<VersionRow>): VersionRow {
  return {
    number: "IS 0:0000",
    title: "untitled",
    isStatus: 2,
    supersededByRaw: null,
    validUpto: null,
    editionYear: null,
    ...over,
  };
}

describe("resolveVersion", () => {
  it("returns the standard itself when it is active", () => {
    const index = new VersionIndex([
      row({ number: "IS 456:2000", title: "Plain and Reinforced Concrete", isStatus: 2 }),
    ]);

    const resolution = resolveVersion("IS 456:2000", index);

    expect(resolution?.current).toEqual({
      number: "IS 456:2000",
      title: "Plain and Reinforced Concrete",
      isStatus: 2,
      lifecycleStatus: "ACTIVE",
    });
    expect(resolution?.supersedes).toEqual([]);
    expect(resolution?.concurrentWith).toBeNull();
  });

  it("resolves a withdrawn standard to its successor, even under a different number", () => {
    const index = new VersionIndex([
      row({
        number: "IS 8112:2013",
        title: "OPC, 43 Grade — Specification",
        isStatus: 5,
        supersededByRaw: "IS 269 : 2015",
        editionYear: 2013,
      }),
      row({
        number: "IS 269:2015",
        title: "Ordinary Portland Cement — Specification",
        isStatus: 2,
        editionYear: 2015,
      }),
    ]);

    const resolution = resolveVersion("IS 8112:2013", index);

    expect(resolution?.current.number).toBe("IS 269:2015");
    expect(resolution?.current.lifecycleStatus).toBe("ACTIVE");
    expect(resolution?.supersedes).toEqual(["IS 8112:2013"]);
  });

  it("follows a multi-hop chain and a part re-homing to the final current edition", () => {
    const index = new VersionIndex([
      row({
        number: "IS 1000:1990",
        title: "old name",
        isStatus: 5,
        supersededByRaw: "IS 2000 (Part 3) : 2005",
        editionYear: 1990,
      }),
      row({
        number: "IS 2000 (Part 3):2005",
        title: "renamed, part-homed",
        isStatus: 5,
        supersededByRaw: "IS 3000:2020",
        editionYear: 2005,
      }),
      row({ number: "IS 3000:2020", title: "current", isStatus: 2, editionYear: 2020 }),
    ]);

    const resolution = resolveVersion("IS 1000:1990", index);

    expect(resolution?.current.number).toBe("IS 3000:2020");
    expect(resolution?.supersedes).toEqual(["IS 1000:1990", "IS 2000 (Part 3):2005"]);
  });

  it("stops at a dangling reference it cannot resolve, rather than dropping the standard", () => {
    const index = new VersionIndex([
      row({
        number: "IS 999:1980",
        title: "orphaned",
        isStatus: 5,
        supersededByRaw: "IS 12345:1999",
        editionYear: 1980,
      }),
    ]);

    const resolution = resolveVersion("IS 999:1980", index);

    expect(resolution?.current.number).toBe("IS 999:1980");
    expect(resolution?.current.lifecycleStatus).toBe("WITHDRAWN");
    expect(resolution?.supersedes).toEqual([]);
  });

  it("breaks a supersession cycle instead of looping forever", () => {
    const index = new VersionIndex([
      row({
        number: "IS 1:2000",
        title: "a",
        isStatus: 5,
        supersededByRaw: "IS 2:2000",
        editionYear: 2000,
      }),
      row({
        number: "IS 2:2000",
        title: "b",
        isStatus: 5,
        supersededByRaw: "IS 1:2000",
        editionYear: 2000,
      }),
    ]);

    const resolution = resolveVersion("IS 1:2000", index);

    expect(resolution?.supersedes.length).toBeLessThanOrEqual(2);
  });

  it("surfaces a concurrent-running companion when the withdrawn edition's validity has not lapsed", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);
    const index = new VersionIndex([
      row({
        number: "IS 5:2010",
        title: "old but still valid",
        isStatus: 5,
        supersededByRaw: "IS 6:2022",
        validUpto: future,
        editionYear: 2010,
      }),
      row({ number: "IS 6:2022", title: "new", isStatus: 2, editionYear: 2022 }),
    ]);

    const resolution = resolveVersion("IS 5:2010", index);

    expect(resolution?.current.number).toBe("IS 6:2022");
    expect(resolution?.concurrentWith).toEqual({
      number: "IS 5:2010",
      title: "old but still valid",
      validUntil: future,
    });
  });

  it("does not report concurrent-running once the earlier edition's validity has lapsed", () => {
    const index = new VersionIndex([
      row({
        number: "IS 5:2010",
        title: "old, lapsed",
        isStatus: 5,
        supersededByRaw: "IS 6:2022",
        validUpto: "2015-01-01",
        editionYear: 2010,
      }),
      row({ number: "IS 6:2022", title: "new", isStatus: 2, editionYear: 2022 }),
    ]);

    const resolution = resolveVersion("IS 5:2010", index);

    expect(resolution?.concurrentWith).toBeNull();
  });

  it("surfaces concurrent-running against the originally-cited edition even across a multi-hop chain", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);
    const index = new VersionIndex([
      row({
        number: "IS 1:1990",
        title: "cited edition, still valid",
        isStatus: 5,
        supersededByRaw: "IS 2:2000",
        validUpto: future,
        editionYear: 1990,
      }),
      row({
        number: "IS 2:2000",
        title: "intermediate hop, validity unknown",
        isStatus: 5,
        supersededByRaw: "IS 3:2010",
        editionYear: 2000,
      }),
      row({ number: "IS 3:2010", title: "current", isStatus: 2, editionYear: 2010 }),
    ]);

    const resolution = resolveVersion("IS 1:1990", index);

    expect(resolution?.current.number).toBe("IS 3:2010");
    expect(resolution?.concurrentWith).toEqual({
      number: "IS 1:1990",
      title: "cited edition, still valid",
      validUntil: future,
    });
  });

  it("returns null for a designation not in the index at all", () => {
    const index = new VersionIndex([]);
    expect(resolveVersion("IS 9999:2099", index)).toBeNull();
  });

  it("prefers the exact edition a raw supersession string names, falling back to the newest on file", () => {
    const index = new VersionIndex([
      row({ number: "IS 456:2000", title: "old edition", isStatus: 5, editionYear: 2000 }),
      row({ number: "IS 456:2018", title: "newest edition", isStatus: 2, editionYear: 2018 }),
    ]);

    expect(index.find("IS 456:2000")?.title).toBe("old edition");
    expect(index.find("IS 456")?.title).toBe("newest edition");
  });

  it("treats a raw reference naming a year no edition has as dangling, not a match against the newest edition", () => {
    const index = new VersionIndex([
      row({ number: "IS 456:2000", title: "old edition", isStatus: 5, editionYear: 2000 }),
      row({ number: "IS 456:2018", title: "newest edition", isStatus: 2, editionYear: 2018 }),
    ]);

    // "IS 456:1999" names a year that was never catalogued for IS 456 — a
    // transcription mistake, not an ambiguous "no year given" reference.
    expect(index.find("IS 456:1999")).toBeUndefined();
  });

  it("stops the chain at a dangling year-specific reference instead of silently substituting the newest edition", () => {
    const index = new VersionIndex([
      row({
        number: "IS 999:1980",
        title: "orphaned, mistyped successor year",
        isStatus: 5,
        supersededByRaw: "IS 456:1999",
        editionYear: 1980,
      }),
      row({ number: "IS 456:2000", title: "old edition", isStatus: 5, editionYear: 2000 }),
      row({ number: "IS 456:2018", title: "newest edition", isStatus: 2, editionYear: 2018 }),
    ]);

    const resolution = resolveVersion("IS 999:1980", index);

    expect(resolution?.current.number).toBe("IS 999:1980");
    expect(resolution?.current.lifecycleStatus).toBe("WITHDRAWN");
    expect(resolution?.supersedes).toEqual([]);
  });
});
