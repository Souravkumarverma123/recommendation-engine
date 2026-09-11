"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowUp,
  Paperclip,
  FileText,
  X,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";

import type { RouterOutputs } from "@repo/trpc/client";

import { trpc } from "~/trpc/client";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { extractPdfText } from "~/lib/pdf";

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

const SUGGESTIONS = [
  "500 ergonomic office chairs",
  "Structural steel for a bridge",
  "PPE helmets for construction",
];

const MAX_SPEC_CHARS = 8000;

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
        <>Supersedes {result.supersedes.join(", ")} — cite this edition instead.</>
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
      {qco.soNumbers.length > 0 && <> · {qco.soNumbers[qco.soNumbers.length - 1]}</>}
      {qco.scheme && <> · Scheme {qco.scheme}</>}
      {qco.enforcementDate && <> · in force from {formatDate(qco.enforcementDate)}</>}
      {qco.sourceUrl && (
        <>
          {" · "}
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
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <h3 className="mb-2 text-sm font-semibold text-ink">Check your draft specification</h3>
      <ul className="flex flex-col gap-1.5">
        {warnings.map((w, i) => (
          <li key={i} className="text-[13px] leading-[1.5] text-body">
            <Badge variant="outline" className="mr-1.5 align-middle text-[10px]">
              {GAP_WARNING[w.kind]}
            </Badge>
            {w.message}
            {w.evidence && <span className="text-muted-foreground"> “{w.evidence}”</span>}
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
    <article className="rounded-lg border border-hairline bg-surface-card p-4 transition-colors hover:border-hairline-strong">
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
              <span className="text-ink">“{e}”</span>
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

type UserMessage = {
  role: "user";
  /** What renders in the bubble — never the full extracted PDF body. */
  displayText: string;
  fileName?: string;
  /** What's actually sent to `recommend.run` — may include extracted PDF text. */
  specText: string;
};
type AiMessage = { role: "ai"; data: RunOutput };
type Message = UserMessage | AiMessage;

/* ── File attachment state ──────────────────────────────── */

type FileState =
  | { status: "idle" }
  | { status: "extracting"; name: string }
  | { status: "ready"; name: string; text: string; pageCount: number; truncated: boolean }
  | { status: "error"; name: string; message: string };

function isSupportedAttachment(file: File): "pdf" | "text" | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (file.type === "text/plain" || name.endsWith(".txt")) return "text";
  return null;
}

/* ── Composer (shared between the empty-state hero and the ── */
/* ── bottom-pinned bar once the conversation has started)   ── */

function Composer({
  input,
  onInputChange,
  onKeyDown,
  textareaRef,
  fileInputRef,
  fileState,
  onFileButtonClick,
  onFileChange,
  onRemoveFile,
  onSubmit,
  isLoading,
  isDragActive,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  fileState: FileState;
  onFileButtonClick: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  isDragActive: boolean;
}) {
  const canSubmit =
    (input.trim().length > 0 || fileState.status === "ready") &&
    fileState.status !== "extracting" &&
    !isLoading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex w-full flex-col gap-2"
    >
      {/* Attachment chip */}
      {fileState.status !== "idle" && (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px]",
            fileState.status === "error"
              ? "bg-destructive/5 text-destructive"
              : "bg-surface-card text-body",
          )}
        >
          {fileState.status === "extracting" ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : fileState.status === "error" ? (
            <AlertCircle className="size-4 shrink-0" />
          ) : (
            <FileText className="size-4 shrink-0 text-primary" />
          )}
          <span className="flex-1 truncate">
            <span className="text-ink">{fileState.name}</span>
            {fileState.status === "extracting" && " · reading…"}
            {fileState.status === "ready" && (
              <span className="text-muted-foreground">
                {" "}
                · {fileState.pageCount} page{fileState.pageCount === 1 ? "" : "s"} extracted
                {fileState.truncated && " (truncated to fit)"}
              </span>
            )}
            {fileState.status === "error" && <span> — {fileState.message}</span>}
          </span>
          <button
            type="button"
            onClick={onRemoveFile}
            className="text-muted-foreground transition-colors hover:text-ink"
            aria-label="Remove attachment"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div
        className={cn(
          "flex items-end gap-2 rounded-xl border bg-surface-card p-2 transition-colors focus-within:border-primary/50",
          isDragActive ? "border-primary/60 bg-primary/5" : "border-hairline",
        )}
      >
        {/* File upload button */}
        <button
          type="button"
          onClick={onFileButtonClick}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-canvas-soft hover:text-ink"
          aria-label="Attach tender PDF"
        >
          <Paperclip className="size-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,application/pdf,text/plain"
          onChange={onFileChange}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe what you're procuring…"
          rows={1}
          className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2 text-[14px] leading-[1.5] text-ink outline-none placeholder:text-muted-foreground"
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition-all hover:bg-primary-active disabled:opacity-30"
          aria-label="Send"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowUp className="size-5" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </form>
  );
}

/* ── Main component ─────────────────────────────────────── */

export function RecommendationSearch() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileState, setFileState] = useState<FileState>({ status: "idle" });
  const [isDragActive, setIsDragActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : undefined;
  const shouldQuery = lastMsg?.role === "user";

  const recommend = trpc.recommend.run.useQuery(
    { specText: shouldQuery ? lastMsg.specText : "" },
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

  // Auto-resize textarea. Skip measuring when empty (avoids a mount-time
  // layout race that can read an inflated `scrollHeight` before fonts settle).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!input) {
      el.style.height = "40px";
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  // Push AI response into messages when query completes
  useEffect(() => {
    if (recommend.isSuccess && lastMsg?.role === "user") {
      setMessages((prev) => [...prev, { role: "ai", data: recommend.data }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommend.isSuccess, recommend.data]);

  const handleFile = useCallback(async (file: File) => {
    const kind = isSupportedAttachment(file);
    if (!kind) {
      setFileState({
        status: "error",
        name: file.name,
        message: "Only PDF or .txt files are supported.",
      });
      return;
    }

    setFileState({ status: "extracting", name: file.name });
    try {
      if (kind === "pdf") {
        const { text, pageCount, truncated } = await extractPdfText(file);
        if (!text) {
          setFileState({
            status: "error",
            name: file.name,
            message: "No extractable text found — this PDF may be a scanned image.",
          });
          return;
        }
        setFileState({ status: "ready", name: file.name, text, pageCount, truncated });
      } else {
        const raw = await file.text();
        const text = raw.trim().slice(0, MAX_SPEC_CHARS);
        setFileState({ status: "ready", name: file.name, text, pageCount: 1, truncated: raw.trim().length > MAX_SPEC_CHARS });
      }
    } catch {
      setFileState({ status: "error", name: file.name, message: "Couldn't read this file." });
    }
  }, []);

  function handleSubmit() {
    const text = input.trim();
    const hasFile = fileState.status === "ready";
    if (!text && !hasFile) return;

    const specText = hasFile
      ? [text, `Tender document (${fileState.name}):\n${fileState.text}`]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, MAX_SPEC_CHARS)
      : text;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        displayText: text || `Uploaded ${hasFile ? fileState.name : ""}`,
        fileName: hasFile ? fileState.name : undefined,
        specText,
      },
    ]);
    setInput("");
    setFileState({ status: "idle" });
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      dragCounter.current += 1;
      setIsDragActive(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) void handleFile(dropped);
  }

  const isLoading = recommend.isFetching;
  const isEmpty = messages.length === 0;

  const composer = (
    <Composer
      input={input}
      onInputChange={setInput}
      onKeyDown={handleKeyDown}
      textareaRef={textareaRef}
      fileInputRef={fileInputRef}
      fileState={fileState}
      onFileButtonClick={() => fileInputRef.current?.click()}
      onFileChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void handleFile(f);
        e.target.value = "";
      }}
      onRemoveFile={() => setFileState({ status: "idle" })}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      isDragActive={isDragActive}
    />
  );

  return (
    <div
      className="relative flex h-full flex-col"
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-and-drop overlay */}
      {isDragActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-canvas/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 px-10 py-8">
            <FileText className="size-8 text-primary" />
            <p className="text-[14px] font-medium text-ink">Drop your tender PDF to upload</p>
          </div>
        </div>
      )}

      {isEmpty ? (
        /* ── Empty / welcome state (ChatGPT-style centered composer) ── */
        <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-4 py-8">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="size-6 text-primary" />
          </div>
          <h1 className="mt-5 text-center text-[26px] font-semibold tracking-tight text-ink">
            What are you procuring?
          </h1>
          <p className="mt-2 max-w-md text-center text-[14px] leading-[1.6] text-body">
            Upload a tender PDF or describe the requirement in plain language.
            Get ranked Indian Standards with verified editions, regulatory
            badges, and audit-ready evidence.
          </p>

          <div className="mt-7 w-full max-w-3xl">{composer}</div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((suggestion) => (
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
        <>
          {/* ── Conversation messages ────────────────────── */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
              {messages.map((msg, i) =>
                msg.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] rounded-xl bg-primary px-4 py-3 text-[14px] text-on-primary">
                      {msg.displayText}
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
                      <div className="rounded-xl border border-brand-accent/20 bg-brand-accent/5 p-4">
                        <p className="flex items-start gap-2.5 text-[14px] leading-[1.6] text-ink">
                          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-accent">
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
                  Searching standards…
                </div>
              )}

              {/* Error state */}
              {recommend.isError && (
                <p className="text-[13px] text-destructive">Search failed. Please try again.</p>
              )}
            </div>
          </div>

          {/* ── Input area (bottom-pinned) ──────────────────── */}
          <div className="shrink-0 border-t border-hairline bg-canvas p-4">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
              {composer}
              <p className="text-center text-[11px] text-muted-foreground">
                Standards sourced from BIS. Full standard text is not reproduced (BIS Act, 2016, s.11).
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
