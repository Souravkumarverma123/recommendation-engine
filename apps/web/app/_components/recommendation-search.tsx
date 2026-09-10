"use client";

import { useState } from "react";

import type { RouterOutputs } from "@repo/trpc/client";

import { trpc } from "~/trpc/client";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type Recommendation = RouterOutputs["recommend"]["run"]["results"][number];

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
          mandatory under a Quality Control Order, or the standard is a voluntary benchmark.
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

        {recommend.isSuccess &&
          recommend.data.results.map((result) => (
            <article
              key={result.number}
              className="flex flex-col gap-2 rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm font-medium">{result.number}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge {...REGULATORY[result.regulatoryStatus]} />
                  <StatusBadge {...LIFECYCLE[result.lifecycleStatus]} />
                </div>
              </div>
              <p className="text-sm">{result.title}</p>
              <QcoCitationLine result={result} />
            </article>
          ))}
      </section>
    </div>
  );
}
