import { FileText } from "lucide-react";

import { cn } from "~/lib/utils";
import { GAP_SEVERITY, GAP_WARNING } from "./labels";
import type { Entry } from "./types";

export function LeftRail({
  active,
  entries,
  onSelect,
}: {
  active: Entry;
  entries: Entry[];
  onSelect: (id: string) => void;
}) {
  const gapWarnings = active.status === "done" ? (active.data?.gapWarnings ?? []) : [];
  const summary = active.status === "done" ? active.data?.requirementSummary : null;

  return (
    <aside className="flex shrink-0 flex-col gap-8 border-b border-hairline bg-canvas-soft px-6 py-7 md:w-[320px] md:overflow-y-auto md:border-r md:border-b-0">
      {/* Requirement */}
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Your requirement
        </p>
        <div className="rounded-xl border border-hairline bg-canvas p-4 text-[13px] leading-[1.6] text-body">
          {active.displayText}
        </div>
        {active.fileName && (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <FileText className="size-3.5" />
            <span className="text-body">{active.fileName}</span>
          </div>
        )}
      </div>

      {/* Understood as */}
      {summary && (
        <div className="flex flex-col gap-2.5">
          <p className="font-mono text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Understood as
          </p>
          <p className="border-l-2 border-hairline-strong pl-3 text-[13px] leading-[1.6] text-body">{summary}</p>
        </div>
      )}

      {/* Check your draft */}
      {gapWarnings.length > 0 && (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Check your draft
            </p>
            <span className="font-mono text-[11px] text-muted-foreground">{gapWarnings.length}</span>
          </div>
          <div className="flex flex-col gap-3.5">
            {gapWarnings.map((w, i) => (
              <div key={i}>
                {i > 0 && <div className="mb-3.5 h-px bg-hairline" />}
                <div className="flex gap-2.5">
                  <div
                    className={cn(
                      "mt-1.5 size-[7px] shrink-0 rounded-full",
                      GAP_SEVERITY[w.kind] === "high" ? "bg-destructive" : "bg-warning",
                    )}
                  />
                  <div className="flex flex-col gap-1">
                    <p
                      className={cn(
                        "font-mono text-[10px] font-semibold tracking-[0.06em] uppercase",
                        GAP_SEVERITY[w.kind] === "high" ? "text-destructive" : "text-warning",
                      )}
                    >
                      {GAP_WARNING[w.kind]}
                    </p>
                    <p className="text-[12.5px] leading-[1.55] text-body">{w.message}</p>
                    {w.evidence && (
                      <p className="font-mono text-[11.5px] text-muted-foreground">&ldquo;{w.evidence}&rdquo;</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session */}
      {entries.length > 1 && (
        <div className="mt-auto flex flex-col gap-2.5">
          <p className="font-mono text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            This session
          </p>
          <div className="flex flex-col gap-0.5">
            {entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelect(entry.id)}
                className={cn(
                  "truncate rounded-r-lg border-l-2 px-3 py-2 text-left text-[12.5px] transition-colors",
                  entry.id === active.id
                    ? "border-ink bg-canvas font-medium text-ink"
                    : "border-transparent text-muted-foreground hover:text-body",
                )}
              >
                {entry.displayText}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
