/**
 * Embedding backfill for the seeded demo catalogue (ticket #7).
 *
 * `loadDemoStandards()` writes the catalogue rows; this fills in
 * `standards.embedding` so the semantic half of `standards.search` has
 * something to rank. Kept separate from the loader because it is the only step
 * that needs an embedding provider (OpenAI in production, the deterministic fake
 * in the seam tests) — a bare lexical-only seed skips it.
 *
 * Idempotent: re-running overwrites the vectors in place.
 */
import { and, db, inArray, isNotNull, sql } from "@repo/database";
import { standardsTable } from "@repo/database/schema";
import type { EmbeddingProvider } from "../../llm/embeddings";
import { parseDesignation } from "../../bis/designation";
import { DEMO_STANDARDS } from "./demo-standards.data";

/** The text a standard is embedded from — designation, title, team summary. */
export function embeddingText(row: {
  number: string;
  title: string;
  summary: string | null;
}): string {
  return [`${row.number} — ${row.title}`, row.summary].filter(Boolean).join("\n");
}

export interface EmbedResult {
  embedded: number;
}

/**
 * Embed every seeded demo standard and store the vector. Reads the rows back
 * from the DB (not the data file) so it always embeds exactly what was loaded.
 *
 * Matched on the normalised designation plus a non-null `summary` — the demo
 * loader writes a summary onto exactly one row per reviewed standard (a demo-band
 * row on a bare seed, the harvested catalogue row on a post-harvest top-up), and
 * nothing else in `standards` carries one. That keeps this from also embedding
 * unrelated editions or Hindi entries that share a yearless key (ticket #9).
 */
export async function embedDemoStandards(
  provider: EmbeddingProvider,
): Promise<EmbedResult> {
  const keys = DEMO_STANDARDS.map((s) => parseDesignation(s.number)?.key).filter(
    (key): key is string => Boolean(key),
  );
  const rows = await db
    .select({
      id: standardsTable.id,
      number: standardsTable.number,
      title: standardsTable.title,
      summary: standardsTable.summary,
    })
    .from(standardsTable)
    .where(and(inArray(standardsTable.numberNormalized, keys), isNotNull(standardsTable.summary)));

  if (rows.length === 0) return { embedded: 0 };

  const vectors = await provider.embed(rows.map(embeddingText));

  await db.transaction(async (tx) => {
    for (const [i, row] of rows.entries()) {
      const vector = vectors[i];
      if (!vector) continue;
      const literal = `[${vector.join(",")}]`;
      await tx.execute(
        sql`update standards set embedding = ${literal}::vector where id = ${row.id}`,
      );
    }
  });

  return { embedded: rows.length };
}
