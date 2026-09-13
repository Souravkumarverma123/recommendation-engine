import type { RouterOutputs } from "@repo/trpc/client";

export type RunOutput = RouterOutputs["recommend"]["run"];
export type Recommendation = RunOutput["results"][number];
export type AlliedStandard = Recommendation["allied"][number];
export type GapWarning = RunOutput["gapWarnings"][number];

export type Entry = {
  id: string;
  /** What renders in the UI — never the full extracted PDF body. */
  displayText: string;
  fileName?: string;
  /** What's actually sent to `recommend.run` — may include extracted PDF text. */
  specText: string;
  status: "loading" | "done" | "error";
  data?: RunOutput;
};

export type FileState =
  | { status: "idle" }
  | { status: "extracting"; name: string }
  | { status: "ready"; name: string; text: string; pageCount: number; truncated: boolean }
  | { status: "error"; name: string; message: string };
