export const PIPELINE_STAGES = [
  { pill: "Thinking", className: "bg-timeline-thinking text-ink" },
  { pill: "Grepping", className: "bg-timeline-grep text-ink" },
  { pill: "Reading", className: "bg-timeline-read text-ink" },
  { pill: "Editing", className: "bg-timeline-edit text-ink" },
  { pill: "Done", className: "bg-timeline-done text-white" },
] as const;

export function PipelinePill({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-[10px] py-1 text-[11px] font-semibold uppercase tracking-[0.88px] ${className}`}
    >
      {label}
    </span>
  );
}
