"use client";

import { useCallback, useEffect, useState } from "react";

import { trpc } from "~/trpc/client";
import { Dossier } from "./dashboard/dossier";
import { IntakeScreen } from "./dashboard/intake-screen";
import { LeftRail } from "./dashboard/left-rail";
import { loadPersistedState, savePersistedState } from "./dashboard/persistence";
import { TopBar } from "./dashboard/top-bar";
import type { Entry } from "./dashboard/types";

export function RecommendationSearch() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Restoring from localStorage happens in an effect (not a lazy useState
  // initializer) so the first client render matches the server-rendered
  // HTML — reading it eagerly would restore a dossier the server never
  // rendered and trip a hydration mismatch.
  const [restored, setRestored] = useState(false);
  const utils = trpc.useUtils();

  useEffect(() => {
    const persisted = loadPersistedState();
    setEntries(persisted.entries);
    setActiveId(persisted.activeId);
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    savePersistedState(entries, activeId);
  }, [entries, activeId, restored]);

  const submit = useCallback(
    (displayText: string, specText: string, fileName?: string) => {
      const trimmed = specText.trim();
      if (!trimmed) return;

      const id = crypto.randomUUID();
      setEntries((prev) => [...prev, { id, displayText, fileName, specText: trimmed, status: "loading" }]);
      setActiveId(id);

      utils.recommend.run
        .fetch({ specText: trimmed })
        .then((data) => {
          setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: "done", data } : e)));
        })
        .catch(() => {
          setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: "error" } : e)));
        });
    },
    [utils],
  );

  const active = entries.find((e) => e.id === activeId) ?? null;

  return (
    <div className="flex h-full flex-col bg-canvas">
      <TopBar
        activeLabel={active?.displayText}
        hasHistory={entries.length > 0}
        onNewRequirement={() => setActiveId(null)}
        onBackToResults={() => setActiveId(entries[entries.length - 1]?.id ?? null)}
      />

      {active ? (
        <div className="flex flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
          <LeftRail active={active} entries={entries} onSelect={setActiveId} />
          <div className="flex-1 md:overflow-y-auto">
            <Dossier entry={active} />
          </div>
        </div>
      ) : (
        <IntakeScreen onSubmit={submit} hasHistory={entries.length > 0} />
      )}
    </div>
  );
}
