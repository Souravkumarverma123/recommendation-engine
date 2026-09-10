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
import { db, inArray, sql } from "@repo/database";
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
 * Matched on the normalised designation, not the reserved demo id band, so it
 * covers both a bare seed (demo-band rows) and a post-harvest top-up (the
 * reviewed detail fields now living on the real catalogue row — ticket #9).
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
    .where(inArray(standardsTable.numberNormalized, keys));

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
