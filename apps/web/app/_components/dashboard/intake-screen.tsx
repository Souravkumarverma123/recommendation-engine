"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, FileText, Loader2, AlertCircle, Paperclip, X } from "lucide-react";

import { cn } from "~/lib/utils";
import { extractPdfText } from "~/lib/pdf";
import { MAX_SPEC_CHARS, SUGGESTIONS } from "./labels";
import type { FileState } from "./types";

function isSupportedAttachment(file: File): "pdf" | "text" | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (file.type === "text/plain" || name.endsWith(".txt")) return "text";
  return null;
}

export function IntakeScreen({
  onSubmit,
  hasHistory,
}: {
  onSubmit: (displayText: string, specText: string, fileName?: string) => void;
  hasHistory: boolean;
}) {
  const [input, setInput] = useState("");
  const [fileState, setFileState] = useState<FileState>({ status: "idle" });
  const [isDragActive, setIsDragActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const fileRequestId = useRef(0);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [input]);

  const handleFile = useCallback(async (file: File) => {
    // Stamp this call so a slower, superseded extraction (an earlier file
    // pick, or one still running after the attachment was removed) can
    // detect it's stale and skip writing over newer state.
    const requestId = ++fileRequestId.current;
    const isStale = () => requestId !== fileRequestId.current;

    const kind = isSupportedAttachment(file);
    if (!kind) {
      setFileState({ status: "error", name: file.name, message: "Only PDF or .txt files are supported." });
      return;
    }

    setFileState({ status: "extracting", name: file.name });
    try {
      if (kind === "pdf") {
        const { text, pageCount, truncated } = await extractPdfText(file);
        if (isStale()) return;
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
        if (isStale()) return;
        const text = raw.trim().slice(0, MAX_SPEC_CHARS);
        setFileState({
          status: "ready",
          name: file.name,
          text,
          pageCount: 1,
          truncated: raw.trim().length > MAX_SPEC_CHARS,
        });
      }
    } catch {
      if (!isStale()) {
        setFileState({ status: "error", name: file.name, message: "Couldn't read this file." });
      }
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    fileRequestId.current += 1;
    setFileState({ status: "idle" });
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

    onSubmit(text || `Uploaded ${hasFile ? fileState.name : ""}`, specText, hasFile ? fileState.name : undefined);
    setInput("");
    handleRemoveFile();
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

  const canSubmit = (input.trim().length > 0 || fileState.status === "ready") && fileState.status !== "extracting";

  return (
    <div
      className="relative flex flex-1 flex-col items-center overflow-y-auto px-4 pt-[10vh] pb-12"
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-canvas/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 px-10 py-8">
            <FileText className="size-8 text-primary" />
            <p className="text-[14px] font-medium text-ink">Drop your tender PDF to upload</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-[780px]">
        <p className="font-mono text-[10.5px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          New requirement
        </p>
        <h1 className="mt-3.5 text-[34px] leading-[1.15] font-semibold tracking-tight text-ink">
          What are you procuring?
        </h1>
        <p className="mt-3 max-w-[580px] text-[15px] leading-[1.7] text-body">
          Describe it in plain language, or attach the tender document. You&rsquo;ll get the standards to
          cite, whether BIS certification is legally required, and a clause you can paste.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className={cn(
            "mt-8 flex flex-col rounded-[20px] border bg-canvas transition-colors",
            isDragActive ? "border-primary/60" : "border-hairline",
          )}
        >
          {fileState.status !== "idle" && (
            <div
              className={cn(
                "mx-4 mt-4 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px]",
                fileState.status === "error" ? "bg-destructive/5 text-destructive" : "bg-surface-card text-body",
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
                onClick={handleRemoveFile}
                className="text-muted-foreground transition-colors hover:text-ink"
                aria-label="Remove attachment"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2 px-[22px] pt-5 pb-4">
            <p className="font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Requirement
            </p>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 2,400 bags of 43-grade OPC cement for RCC bridge approach slabs — needs to be IS-marked and pass 28-day compressive strength."
              rows={1}
              className="min-h-[64px] resize-none bg-transparent text-[14px] leading-[1.65] text-ink outline-none placeholder:text-muted-foreground/70"
              style={{ maxHeight: 240 }}
            />
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-hairline-soft px-3.5 py-3 pl-5">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-[12.5px] text-body transition-colors hover:text-ink"
              >
                <Paperclip className="size-[15px]" />
                Attach tender PDF or .txt
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = "";
                }}
              />
              <div className="h-3.5 w-px bg-hairline" />
              <span className="font-mono text-[11.5px] text-muted-foreground">
                {input.length} / {MAX_SPEC_CHARS}
              </span>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center gap-2 rounded-full bg-primary px-[18px] py-2.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-primary-active disabled:opacity-30"
            >
              Find standards
              <ArrowRight className="size-[15px]" strokeWidth={2.25} />
            </button>
          </div>
        </form>

        <div className="mt-10 flex flex-col gap-3">
          <p className="font-mono text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Or start from an example
          </p>
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSubmit(suggestion, suggestion)}
                className="flex items-center justify-between rounded-xl border border-hairline px-4 py-3.5 text-left text-[13.5px] text-body transition-colors hover:border-primary/40 hover:text-ink"
              >
                {suggestion}
                <ArrowRight className="size-4 text-hairline-strong" />
              </button>
            ))}
          </div>
        </div>

        {!hasHistory && (
          <p className="mt-12 text-[11.5px] leading-[1.6] text-muted-foreground/80">
            Standards sourced from the Bureau of Indian Standards catalogue. Full standard text is not
            reproduced (BIS Act, 2016, s.11).
          </p>
        )}
      </div>
    </div>
  );
}
