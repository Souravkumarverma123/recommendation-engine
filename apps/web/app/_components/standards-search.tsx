"use client";

import { useState } from "react";

import { trpc } from "~/trpc/client";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

const LIFECYCLE_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  WITHDRAWN: "Withdrawn",
  UNKNOWN: "Status unknown",
};

function LifecycleBadge({ status }: { status: string }) {
  const variant =
    status === "ACTIVE" ? "secondary" : status === "WITHDRAWN" ? "destructive" : "outline";
  return <Badge variant={variant}>{LIFECYCLE_LABEL[status] ?? status}</Badge>;
}

export function StandardsSearch() {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");

  const search = trpc.standards.search.useQuery(
    { query },
    { enabled: query.length > 0, retry: false },
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Indian Standards Recommendation Engine
        </h1>
        <p className="text-muted-foreground text-sm">
          Describe what you are procuring to find the applicable Indian Standards.
        </p>
      </header>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(draft.trim());
        }}
      >
        <Input
          name="query"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="e.g. reinforced concrete for a bridge deck"
          aria-label="Procurement description"
          autoComplete="off"
        />
        <Button type="submit" disabled={draft.trim().length === 0}>
          Search
        </Button>
      </form>

      <section aria-live="polite" className="flex flex-col gap-3">
        {search.isFetching && <p className="text-muted-foreground text-sm">Searching…</p>}

        {search.isError && (
          <p className="text-destructive text-sm">Search failed. Please try again.</p>
        )}

        {search.isSuccess && search.data.results.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No matching standards for “{query}”.
          </p>
        )}

        {search.isSuccess &&
          search.data.results.map((hit) => (
            <article
              key={hit.number}
              className="flex flex-col gap-1 rounded-lg border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-medium">{hit.number}</span>
                <LifecycleBadge status={hit.lifecycleStatus} />
              </div>
              <p className="text-sm">{hit.title}</p>
            </article>
          ))}
      </section>
    </div>
  );
}
