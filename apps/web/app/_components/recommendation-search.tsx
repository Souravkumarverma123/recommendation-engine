"use client";

import { useState } from "react";

import type { RouterOutputs } from "@repo/trpc/client";

import { trpc } from "~/trpc/client";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type RunOutput = RouterOutputs["recommend"]["run"];
type Recommendation = RunOutput["results"][number];
type AlliedStandard = Recommendation["allied"][number];
type GapWarning = RunOutput["gapWarnings"][number];

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const LIFECYCLE: Record<
  Recommendation["lifecycleStatus"],
  { label: string; variant: BadgeVariant }
> = {
  ACTIVE: { label: "Active", variant: "secondary" },
  WITHDRAWN: { label: "Withdrawn", variant: "destructive" },
  UNKNOWN: { label: "Status unknown", variant: "outline" },
};

const REGULATORY: Record<
  Recommendation["regulatoryStatus"],
  { label: string; variant: BadgeVariant }
> = {
  MANDATORY: { label: "Mandatory · QCO", variant: "destructive" },
  UPCOMING: { label: "Upcoming QCO", variant: "default" },
  VOLUNTARY: { label: "Voluntary", variant: "secondary" },
  NEEDS_REVIEW: { label: "Needs review", variant: "outline" },
};

const ROLE: Record<NonNullable<Recommendation["role"]>, string> = {
  PRIMARY: "Primary standard",
  NORMATIVE_REFERENCE: "Normative reference",
  TEST_METHOD: "Test method",
  SAFETY: "Safety",
  TERMINOLOGY: "Terminology",
  INSTALLATION: "Installation",
  RELATED: "Related",
};

const ALLIED_ROLE: Record<AlliedStandard["role"], string> = {
  NORMATIVE_REFERENCE: "Normative reference",
  TEST_METHOD: "Test method",
  SAFETY: "Safety",
  TERMINOLOGY: "Terminology",
  INSTALLATION: "Installation",
};

const GAP_WARNING: Record<GapWarning["kind"], string> = {
  BRAND_NAME: "Brand name",
  FOREIGN_STANDARD: "Foreign standard",
  NON_METRIC_UNIT: "Non-metric unit",
  SUPERSEDED_CITATION: "Superseded citation",
  MISSING_PARAMETER: "Missing parameter",
  OTHER: "Review",
};

function StatusBadge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return <Badge variant={variant}>{label}</Badge>;
}

function formatDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function QcoCitationLine({ result }: { result: Recommendation }) {
  const { qco, qcoNote } = result;
  if (!qco) return null;

  return (
    <p className="text-muted-foreground text-xs">
      {qco.title}
      {/* soNumbers is oldest→newest; the last is the order currently in force. */}
      {qco.soNumbers.length > 0 && <> · {qco.soNumbers[qco.soNumbers.length - 1]}</>}
      {qco.scheme && <> · Scheme {qco.scheme}</>}
      {qco.enforcementDate && <> · in force from {formatDate(qco.enforcementDate)}</>}
      {qco.sourceUrl && (
        <>
          {" · "}
          <a
            href={qco.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            source
          </a>
        </>
      )}
      {qco.specificRequirement && (
        <span className="block">{qco.specificRequirement}</span>
      )}
      {qcoNote && <span className="block italic">{qcoNote}</span>}
    </p>
  );
}

function GapWarnings({ warnings }: { warnings: GapWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <section className="border-destructive/40 bg-destructive/5 flex flex-col gap-2 rounded-lg border p-4">
      <h2 className="text-sm font-medium">Check your draft specification</h2>
      <ul className="flex flex-col gap-2">
        {warnings.map((warning, i) => (
          <li key={i} className="text-sm">
            <Badge variant="outline" className="mr-2 align-middle">
              {GAP_WARNING[warning.kind]}
            </Badge>
            {warning.message}
            {warning.evidence && (
              <span className="text-muted-foreground"> — “{warning.evidence}”</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AlliedStandards({ allied }: { allied: AlliedStandard[] }) {
  if (allied.length === 0) return null;

  return (
    <div className="border-muted mt-1 flex flex-col gap-1.5 border-l-2 pl-3">
      <h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        Allied standards
      </h3>
      <ul className="flex flex-col gap-1.5">
        {allied.map((ally) => (
          <li key={`${ally.relation}:${ally.number}`} className="text-xs">
            <span className="font-mono text-foreground">{ally.number}</span>
            <Badge variant="outline" className="mx-2 align-middle">
              {ALLIED_ROLE[ally.role]}
            </Badge>
            {ally.lifecycleStatus === "WITHDRAWN" && (
              <Badge variant="destructive" className="mr-2 align-middle">
                Withdrawn
              </Badge>
            )}
            <span className="text-muted-foreground">{ally.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DraftClause({ clause }: { clause: string }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border p-4">
      <h2 className="text-sm font-medium">Draft tender clause</h2>
      <p className="text-muted-foreground bg-muted/50 rounded-md p-3 text-sm">{clause}</p>
    </section>
  );
}

export function RecommendationSearch() {
  const [draft, setDraft] = useState("");
  const [specText, setSpecText] = useState("");

  const recommend = trpc.recommend.run.useQuery(
    { specText },
    { enabled: specText.length > 0, retry: false },
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Indian Standards Recommendation Engine
        </h1>
        <p className="text-muted-foreground text-sm">
          Describe what you are procuring. Each result shows its lifecycle status and an
          independently checked regulatory badge — whether BIS certification is legally
          mandatory under a Quality Control Order, or the standard is a voluntary benchmark —
          plus the allied standards it depends on tagged by role, the reasoning, the phrases
          from your input that triggered it, warnings about your draft, and ready-to-paste
          clause language.
        </p>
      </header>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSpecText(draft.trim());
        }}
      >
        <Input
          name="specText"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="e.g. 500 ergonomic office chairs for a government secretariat"
          aria-label="Procurement requirement"
          autoComplete="off"
        />
        <Button type="submit" disabled={draft.trim().length === 0}>
          Recommend
        </Button>
      </form>

      <section aria-live="polite" className="flex flex-col gap-3">
        {recommend.isFetching && (
          <p className="text-muted-foreground text-sm">Searching…</p>
        )}

        {recommend.isError && (
          <p className="text-destructive text-sm">Search failed. Please try again.</p>
        )}

        {recommend.isSuccess && recommend.data.results.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No matching standards for “{specText}”.
          </p>
        )}

        {recommend.isSuccess && recommend.data.results.length > 0 && (
          <>
            {recommend.data.requirementSummary && (
              <p className="text-sm">
                <span className="font-medium">Understood as:</span>{" "}
                {recommend.data.requirementSummary}
              </p>
            )}

            <GapWarnings warnings={recommend.data.gapWarnings} />

            {recommend.data.results.map((result) => (
              <article
                key={result.number}
                className="flex flex-col gap-2 rounded-lg border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-medium">{result.number}</span>
                  <div className="flex items-center gap-2">
                    {result.role && (
                      <Badge variant="outline">{ROLE[result.role]}</Badge>
                    )}
                    <StatusBadge {...REGULATORY[result.regulatoryStatus]} />
                    <StatusBadge {...LIFECYCLE[result.lifecycleStatus]} />
                  </div>
                </div>
                <p className="text-sm">{result.title}</p>
                {result.reason && (
                  <p className="text-muted-foreground text-sm">{result.reason}</p>
                )}
                {result.evidence.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    Evidence from your input:{" "}
                    {result.evidence.map((excerpt, i) => (
                      <span key={i}>
                        {i > 0 && ", "}
                        <span className="text-foreground">“{excerpt}”</span>
                      </span>
                    ))}
                  </p>
                )}
                <QcoCitationLine result={result} />
                <AlliedStandards allied={result.allied} />
              </article>
            ))}

            {recommend.data.draftClause && (
              <DraftClause clause={recommend.data.draftClause} />
            )}
          </>
        )}
      </section>
    </div>
  );
}
