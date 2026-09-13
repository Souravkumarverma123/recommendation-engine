"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, Loader2 } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { ALLIED_ROLE, REGULATORY, ROLE, formatDate } from "./labels";
import type { Entry, Recommendation } from "./types";

/** Regulatory badge, re-rendered for legibility on the black verdict plate — the
 * shared `Badge`'s "default" variant is ink-on-ink and would vanish here. */
function PlateRegulatoryBadge({ status }: { status: Recommendation["regulatoryStatus"] }) {
  const label = REGULATORY[status].label;
  if (status === "MANDATORY") {
    return (
      <span className="rounded-full bg-destructive px-2.5 py-1 text-[11px] font-semibold text-white">{label}</span>
    );
  }
  if (status === "UPCOMING") {
    return <span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink">{label}</span>;
  }
  if (status === "VOLUNTARY") {
    return (
      <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white">{label}</span>
    );
  }
  return (
    <span className="rounded-full border border-white/30 px-2.5 py-1 text-[11px] font-semibold text-white">
      {label}
    </span>
  );
}

function certificationLabel(result: Recommendation): string {
  if (result.qco?.scheme) return `BIS licence · Scheme ${result.qco.scheme}`;
  switch (result.regulatoryStatus) {
    case "MANDATORY":
      return "BIS licence · Standard Mark";
    case "UPCOMING":
      return "Required from enforcement date";
    case "NEEDS_REVIEW":
      return "Needs manual check";
    case "VOLUNTARY":
      return "No certification required";
  }
}

function editionLabel(result: Recommendation): { text: string; ok: boolean } {
  if (result.lifecycleStatus === "WITHDRAWN") return { text: "Withdrawn", ok: false };
  if (result.lifecycleStatus === "UNKNOWN") return { text: "Not verified", ok: false };
  return { text: "Current — confirmed", ok: true };
}

function VerdictPlate({ result }: { result: Recommendation }) {
  const edition = editionLabel(result);
  return (
    <div className="rounded-2xl bg-ink p-7 text-canvas">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-[10.5px] font-semibold tracking-[0.1em] text-white/45 uppercase">
          {result.role === "PRIMARY" ? "Primary citation" : "Citation"}
        </p>
        <PlateRegulatoryBadge status={result.regulatoryStatus} />
      </div>

      <p className="mt-4 font-mono text-[32px] font-semibold tracking-tight text-white">{result.number}</p>
      <p className="mt-1.5 text-[15px] text-white/65">{result.title}</p>

      <div className="my-6 h-px bg-white/10" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-[10px] font-semibold tracking-[0.08em] text-white/40 uppercase">Edition</p>
          <div className="flex items-center gap-1.5 text-[13px] text-white">
            {edition.ok ? (
              <Check className="size-3.5 shrink-0 text-success" strokeWidth={2.5} />
            ) : (
              <span className="size-1.5 shrink-0 rounded-full bg-destructive" />
            )}
            {edition.text}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-[10px] font-semibold tracking-[0.08em] text-white/40 uppercase">
            Certification
          </p>
          <p className="text-[13px] text-white">{certificationLabel(result)}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-[10px] font-semibold tracking-[0.08em] text-white/40 uppercase">In force</p>
          <p className="text-[13px] text-white">
            {result.qco?.enforcementDate ? formatDate(result.qco.enforcementDate) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

function SupersessionCard({ result }: { result: Recommendation }) {
  if (result.supersedes.length === 0 && !result.concurrentWith) return null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-hairline p-5">
      {result.supersedes.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-hairline bg-canvas px-3 py-2">
            <span className="font-mono text-[13px] text-muted-foreground line-through decoration-destructive/60">
              {result.supersedes.join(", ")}
            </span>
            <Badge variant="destructive" className="text-[10px]">
              Withdrawn
            </Badge>
          </div>
          <div className="flex items-center sm:flex-1">
            <div className="hidden h-px flex-1 bg-hairline-strong sm:block" />
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              className="rotate-90 text-hairline-strong sm:rotate-0"
            >
              <path
                d="m9 18 6-6-6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex items-center gap-2 rounded-[10px] bg-ink px-3 py-2">
            <span className="font-mono text-[13px] font-semibold text-canvas">{result.number}</span>
            <span className="text-[11px] text-white/70">current edition</span>
          </div>
        </div>
      )}

      {result.concurrentWith && (
        <p className="text-[12.5px] leading-[1.55] text-body">
          {result.concurrentWith.number} remains concurrently valid until{" "}
          {formatDate(result.concurrentWith.validUntil)}.
        </p>
      )}

      {result.supersedes.length > 0 && (
        <p className="text-[12.5px] leading-[1.55] text-body">
          Cite {result.number} — the standard you referenced has been withdrawn.
        </p>
      )}
    </div>
  );
}

function WhyThisStandard({ result }: { result: Recommendation }) {
  if (!result.reason) return null;
  return (
    <div className="flex flex-col gap-3.5">
      <p className="font-mono text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        Why this standard
      </p>
      <p className="text-[13.5px] leading-[1.65] text-body">{result.reason}</p>
      {result.evidence.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[12px] text-muted-foreground">Matched on your wording</p>
          <div className="flex flex-col gap-2">
            {result.evidence.map((e, i) => (
              <p key={i} className="border-l-2 border-hairline-strong pl-3.5 font-mono text-[12.5px] text-ink">
                &ldquo;{e}&rdquo;
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RegulatoryBasis({ result }: { result: Recommendation }) {
  if (!result.qco && !result.qcoNote) return null;
  const rows: { label: string; value: React.ReactNode }[] = [];
  if (result.qco) {
    rows.push({ label: "Order", value: result.qco.title });
    if (result.qco.soNumbers.length > 0) {
      rows.push({
        label: "Gazette",
        value: <span className="font-mono text-[12.5px]">{result.qco.soNumbers[result.qco.soNumbers.length - 1]}</span>,
      });
    }
    if (result.qco.scheme) rows.push({ label: "Scheme", value: `Scheme ${result.qco.scheme}` });
    if (result.qco.ministry) rows.push({ label: "Ministry", value: result.qco.ministry });
    if (result.qco.sourceUrl) {
      rows.push({
        label: "Source",
        value: (
          <a href={result.qco.sourceUrl} target="_blank" rel="noreferrer">
            gazette notification
          </a>
        ),
      });
    }
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-hairline p-5">
      <p className="font-mono text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        Regulatory basis
      </p>
      {rows.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline gap-5">
              <p className="w-[100px] shrink-0 font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground uppercase">
                {row.label}
              </p>
              <div className="text-[13px] text-ink">{row.value}</div>
            </div>
          ))}
        </div>
      )}
      {result.qco?.specificRequirement && (
        <p className="border-t border-hairline-soft pt-3 text-[12.5px] leading-[1.55] text-muted-foreground">
          {result.qco.specificRequirement}
        </p>
      )}
      {result.qcoNote && (
        <p className="border-t border-hairline-soft pt-3 text-[12.5px] leading-[1.55] text-muted-foreground italic">
          {result.qcoNote}
        </p>
      )}
    </div>
  );
}

function Dependencies({ result }: { result: Recommendation }) {
  if (result.allied.length === 0) return null;
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Standards this one depends on
        </p>
        <span className="font-mono text-[11px] text-muted-foreground">{result.allied.length}</span>
      </div>
      <div className="flex flex-col">
        {result.allied.map((a, i) => (
          <div
            key={`${a.relation}:${a.number}`}
            className={cn("flex items-baseline gap-4 border-t border-hairline-soft py-3.5", {
              "border-b": i === result.allied.length - 1,
            })}
          >
            <span className="w-[142px] shrink-0 font-mono text-[12.5px] text-ink">{a.number}</span>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {ALLIED_ROLE[a.role]}
            </Badge>
            {a.lifecycleStatus === "WITHDRAWN" && (
              <Badge variant="destructive" className="shrink-0 text-[10px]">
                Withdrawn
              </Badge>
            )}
            <span className="text-[13px] leading-[1.5] text-body">{a.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DraftClause({ result, draftClause }: { result: Recommendation; draftClause: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(draftClause);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 1800);
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-hairline p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[15px] font-semibold text-ink">Draft tender clause</p>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors",
            copyState === "failed"
              ? "border-destructive/30 text-destructive"
              : "border-hairline text-body hover:border-hairline-strong hover:text-ink",
          )}
        >
          {copyState === "copied" ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          {copyState === "copied" ? "Copied" : copyState === "failed" ? "Select the text below" : "Copy"}
        </button>
      </div>
      <div className="rounded-xl bg-canvas-soft p-4 font-mono text-[12.5px] leading-[1.75] text-body">
        {draftClause}
      </div>
      <p className="text-[12px] leading-[1.55] text-muted-foreground">
        Written for {result.number}
        {result.regulatoryStatus === "MANDATORY" && " — names the certification requirement above"}.
      </p>
    </div>
  );
}

function AlsoConsideredRow({ result }: { result: Recommendation }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-hairline">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left"
      >
        <span
          className={cn(
            "w-[130px] shrink-0 truncate font-mono text-[12.5px] text-ink",
            result.lifecycleStatus === "WITHDRAWN" && "text-muted-foreground line-through decoration-destructive/60",
          )}
        >
          {result.number}
        </span>
        <Badge variant={REGULATORY[result.regulatoryStatus].variant} className="shrink-0 text-[10px]">
          {REGULATORY[result.regulatoryStatus].label}
        </Badge>
        <span className="flex-1 truncate text-[13px] text-body">{result.title}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-hairline-soft px-4 py-4">
          {result.role && (
            <Badge variant="outline" className="w-fit text-[10px]">
              {ROLE[result.role]}
            </Badge>
          )}
          {result.reason && <p className="text-[13px] leading-[1.6] text-body">{result.reason}</p>}
          <WhyThisStandard result={{ ...result, reason: null }} />
          <RegulatoryBasis result={result} />
          <Dependencies result={result} />
        </div>
      )}
    </div>
  );
}

export function Dossier({ entry }: { entry: Entry }) {
  if (entry.status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking regulatory status and resolving editions…
        </div>
      </div>
    );
  }

  if (entry.status === "error") {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <p className="text-[13px] text-destructive">Search failed. Please try again.</p>
      </div>
    );
  }

  const data = entry.data;
  if (!data) return null;

  const primaryIndex = data.results.findIndex((r) => r.role === "PRIMARY");
  const primary = primaryIndex >= 0 ? data.results[primaryIndex] : data.results[0];
  const rest = data.results.filter((_, i) => i !== (primaryIndex >= 0 ? primaryIndex : 0));

  if (!primary) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <p className="text-[13px] text-muted-foreground">No matching standards found.</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center px-5 py-7 pb-16 md:px-12 md:py-9">
      <div className="flex w-full max-w-[780px] flex-col gap-7">
        <VerdictPlate result={primary} />

        {data.conciseAnswer && <p className="text-[15px] leading-[1.65] text-ink">{data.conciseAnswer}</p>}

        <SupersessionCard result={primary} />
        <WhyThisStandard result={primary} />
        <RegulatoryBasis result={primary} />
        <Dependencies result={primary} />

        {data.draftClause && <DraftClause result={primary} draftClause={data.draftClause} />}

        {rest.length > 0 && (
          <div className="flex flex-col gap-3.5">
            <p className="font-mono text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Also considered
            </p>
            <div className="flex flex-col gap-2.5">
              {rest.map((r) => (
                <AlsoConsideredRow key={r.number} result={r} />
              ))}
            </div>
          </div>
        )}

        {!data.reasoned && (
          <p className="text-[12px] leading-[1.55] text-muted-foreground">
            Reasoning is unavailable right now, so this is retrieval-only — regulatory status is still
            independently verified, but the ranking, evidence, and draft clause above are not shown.
          </p>
        )}
      </div>
    </div>
  );
}
