"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Paperclip, FileText, X, Loader2, Sparkles } from "lucide-react";

import type { RouterOutputs } from "@repo/trpc/client";

import { trpc } from "~/trpc/client";
import { Badge } from "~/components/ui/badge";

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
  MANDATORY: { label: "Mandatory \u00b7 QCO", variant: "destructive" },
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

/* ── Result sub-components ──────────────────────────────── */

function VersionNote({ result }: { result: Recommendation }) {
  if (result.supersedes.length === 0 && !result.concurrentWith) return null;
  return (
    <p className="text-muted-foreground text-xs">
      {result.supersedes.length > 0 && (
        <>Supersedes {result.supersedes.join(", ")} \u2014 cite this edition instead.</>
      )}
      {result.concurrentWith && (
        <span className="block">
          {result.concurrentWith.number} remains concurrently valid until{" "}
          {formatDate(result.concurrentWith.validUntil)}.
        </span>
      )}
    </p>
  );
}

function QcoCitationLine({ result }: { result: Recommendation }) {
  const { qco, qcoNote } = result;
  if (!qco) return null;
  return (
    <p className="text-muted-foreground text-xs">
      {qco.title}
      {qco.soNumbers.length > 0 && <> \u00b7 {qco.soNumbers[qco.soNumbers.length - 1]}</>}
      {qco.scheme && <> \u00b7 Scheme {qco.scheme}</>}
      {qco.enforcementDate && <> \u00b7 in force from {formatDate(qco.enforcementDate)}</>}
      {qco.sourceUrl && (
        <>
          {" \u00b7 "}
          <a href={qco.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-primary">
            source
          </a>
        </>
      )}
      {qco.specificRequirement && <span className="block">{qco.specificRequirement}</span>}
      {qcoNote && <span className="block italic">{qcoNote}</span>}
    </p>
  );
}

function GapWarnings({ warnings }: { warnings: GapWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="rounded-lg border border-error/30 bg-error/5 p-4">
      <h3 className="mb-2 text-sm font-semibold text-ink">Check your draft specification</h3>
      <ul className="flex flex-col gap-1.5">
        {warnings.map((w, i) => (
          <li key={i} className="text-[13px] leading-[1.5] text-body">
            <Badge variant="outline" className="mr-1.5 align-middle text-[10px]">
              {GAP_WARNING[w.kind]}
            </Badge>
            {w.message}
            {w.evidence && <span className="text-muted-foreground"> \u201c{w.evidence}\u201d</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlliedStandards({ allied }: { allied: AlliedStandard[] }) {
  if (allied.length === 0) return null;
  return (
    <div className="mt-2 border-l-2 border-hairline pl-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Allied standards
      </h4>
      <ul className="mt-1.5 flex flex-col gap-1">
        {allied.map((a) => (
          <li key={`${a.relation}:${a.number}`} className="text-[13px]">
            <span className="font-mono text-ink">{a.number}</span>
            <Badge variant="outline" className="mx-1.5 align-middle text-[10px]">
              {ALLIED_ROLE[a.role]}
            </Badge>
            {a.lifecycleStatus === "WITHDRAWN" && (
              <Badge variant="destructive" className="mr-1.5 align-middle text-[10px]">
                Withdrawn
              </Badge>
            )}
            <span className="text-muted-foreground">{a.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultCard({ result }: { result: Recommendation }) {
  return (
    <article className="rounded-lg border border-hairline bg-surface-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold text-ink">{result.number}</span>
        {result.role && <Badge variant="outline" className="text-[10px]">{ROLE[result.role]}</Badge>}
        <Badge variant={REGULATORY[result.regulatoryStatus].variant} className="text-[10px]">
          {REGULATORY[result.regulatoryStatus].label}
        </Badge>
        <Badge variant={LIFECYCLE[result.lifecycleStatus].variant} className="text-[10px]">
          {LIFECYCLE[result.lifecycleStatus].label}
        </Badge>
      </div>
      <p className="mt-1.5 text-[13px] text-ink">{result.title}</p>
      <VersionNote result={result} />
      {result.reason && <p className="mt-1.5 text-[13px] text-body">{result.reason}</p>}
      {result.evidence.length > 0 && (
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          Evidence:{" "}
          {result.evidence.map((e, i) => (
            <span key={i}>
              {i > 0 && ", "}
              <span className="text-ink">\u201c{e}\u201d</span>
            </span>
          ))}
        </p>
      )}
      <QcoCitationLine result={result} />
      <AlliedStandards allied={result.allied} />
    </article>
  );
}

/* ── Chat message types ─────────────────────────────────── */

type UserMessage = { role: "user"; text: string; fileName?: string };
type AiMessage = { role: "ai"; data: RunOutput };
type Message = UserMessage | AiMessage;

/* ── Main component ─────────────────────────────────────── */

export function RecommendationSearch() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : undefined;
  const shouldQuery = lastMsg?.role === "user";

  const recommend = trpc.recommend.run.useQuery(
    { specText: shouldQuery ? lastMsg.text : "" },
    {
      enabled: shouldQuery,
      retry: false,
    },
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, recommend.isFetching]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Push AI response into messages when query completes
  useEffect(() => {
    if (recommend.isSuccess && lastMsg?.role === "user") {
      setMessages((prev) => [...prev, { role: "ai", data: recommend.data }]);
    }
  }, [recommend.isSuccess, recommend.data, lastMsg]);

  function handleSubmit() {
    const text = input.trim();
    if (!text && !file) return;
    setMessages((prev) => [...prev, { role: "user", text: text || `Uploaded: ${file?.name}`, fileName: file?.name }]);
    setInput("");
    setFile(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isLoading = recommend.isFetching;
  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* ── Empty / welcome state ────────────────────── */
          <div className="flex h-full flex-col items-center justify-center px-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="size-6 text-primary" />
            </div>
            <h1 className="mt-5 text-[22px] font-semibold text-ink">
              Indian Standards Engine
            </h1>
            <p className="mt-2 max-w-md text-center text-[14px] leading-[1.6] text-body">
              Describe your procurement requirement and get ranked Indian Standards
              with verified editions, regulatory badges, allied standards, and
              audit-ready evidence.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                "500 ergonomic office chairs",
                "Structural steel for a bridge",
                "PPE helmets for construction",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="rounded-lg border border-hairline bg-surface-card px-3 py-1.5 text-[13px] text-body transition-colors hover:border-primary/40 hover:text-ink"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Conversation messages ────────────────────── */
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] rounded-xl bg-primary px-4 py-3 text-[14px] text-on-primary">
                    {msg.text}
                    {msg.fileName && (
                      <span className="mt-1 flex items-center gap-1.5 text-[12px] text-on-primary/70">
                        <FileText className="size-3" />
                        {msg.fileName}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex flex-col gap-3">
                  {msg.data.requirementSummary && (
                    <p className="text-[13px] text-body">
                      <span className="font-medium text-ink">Understood as:</span>{" "}
                      {msg.data.requirementSummary}
                    </p>
                  )}

                  <GapWarnings warnings={msg.data.gapWarnings} />

                  {msg.data.results.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {msg.data.results.map((r) => (
                        <ResultCard key={r.number} result={r} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">
                      No matching standards found.
                    </p>
                  )}

                  {msg.data.conciseAnswer && (
                    <div className="rounded-xl border border-[#dbeafe] bg-[#eff6ff] p-4">
                      <p className="flex items-start gap-2.5 text-[14px] leading-[1.6] text-gray-800">
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#2563eb]">
                          <Sparkles className="size-3.5 text-white" />
                        </span>
                        <span>{msg.data.conciseAnswer}</span>
                      </p>
                    </div>
                  )}

                  {msg.data.draftClause && (
                    <div className="rounded-lg border border-hairline bg-surface-card p-4">
                      <h3 className="mb-2 text-[13px] font-semibold text-ink">
                        Draft tender clause
                      </h3>
                      <p className="rounded-md bg-canvas-soft p-3 font-mono text-[12px] leading-[1.6] text-body">
                        {msg.data.draftClause}
                      </p>
                    </div>
                  )}
                </div>
              ),
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Searching standards\u2026
              </div>
            )}

            {/* Error state */}
            {recommend.isError && (
              <p className="text-[13px] text-error">Search failed. Please try again.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Input area (bottom-pinned) ──────────────────── */}
      <div className="shrink-0 border-t border-hairline bg-canvas p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="mx-auto flex w-full max-w-3xl flex-col gap-2"
        >
          {/* File chip */}
          {file && (
            <div className="flex items-center gap-2 rounded-lg bg-surface-card px-3 py-2 text-[13px] text-body">
              <FileText className="size-4 text-primary" />
              <span className="flex-1 truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-muted-foreground hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 rounded-xl border border-hairline bg-surface-card p-2 transition-colors focus-within:border-primary/50">
            {/* File upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-canvas-soft hover:text-ink"
              aria-label="Attach file"
            >
              <Paperclip className="size-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
                e.target.value = "";
              }}
            />

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your procurement requirement\u2026"
              rows={1}
              className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2 text-[14px] leading-[1.5] text-ink outline-none placeholder:text-muted-foreground"
            />

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !file)}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition-all hover:bg-primary-active disabled:opacity-30"
              aria-label="Send"
            >
              <ArrowUp className="size-5" strokeWidth={2.5} />
            </button>
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            Standards sourced from BIS. Full standard text is not reproduced (BIS Act, 2016, s.11).
          </p>
        </form>
      </div>
    </div>
  );
}
