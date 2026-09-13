import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

export function TopBar({
  activeLabel,
  hasHistory,
  onNewRequirement,
  onBackToResults,
}: {
  /** The current dossier's requirement text, truncated; unset in the intake view. */
  activeLabel?: string;
  hasHistory: boolean;
  onNewRequirement: () => void;
  onBackToResults: () => void;
}) {
  return (
    <header className="z-50 flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-canvas/80 px-4 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-body transition-colors hover:text-ink">
          <ArrowLeft className="size-4" />
          <span className="flex size-5 items-center justify-center rounded-sm bg-primary text-[10px] font-bold text-on-primary">
            IS
          </span>
        </Link>
        <span className="shrink-0 text-sm font-semibold text-ink">Manak</span>
        {activeLabel && (
          <>
            <div className="h-4.5 w-px shrink-0 bg-hairline" />
            <span className="truncate text-[13px] text-muted-foreground">{activeLabel}</span>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {activeLabel ? (
          <button
            type="button"
            onClick={onNewRequirement}
            className="flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-1.5 text-[12.5px] font-medium text-body transition-colors hover:border-hairline-strong hover:text-ink"
          >
            <Plus className="size-3.5" />
            New requirement
          </button>
        ) : (
          hasHistory && (
            <button
              type="button"
              onClick={onBackToResults}
              className="text-[12.5px] font-medium text-body transition-colors hover:text-ink"
            >
              ← Back to results
            </button>
          )
        )}
      </div>
    </header>
  );
}
