/**
 * Title-level embeddings for the whole catalogue (ticket #9, acceptance
 * criterion 4).
 *
 * `harvestCatalogue` writes rows with `embedding = null`; this fills them in,
 * in batches, so the semantic half of `standards.search` covers every harvested
 * standard, not just the demo slice. Kept separate from the loader because it is
 * the only step that needs an embedding provider (OpenAI in production, the
 * deterministic fake in tests).
 *
 * Resumable: it repeatedly claims the next `batchSize` rows still missing a
 * vector, so a crash or a re-run just picks up where it left off.
 */
import { db, isNull, sql } from "@repo/database";
import { standardsTable } from "@repo/database/schema";
import type { EmbeddingProvider } from "@repo/services/llm/embeddings";
import { embeddingText } from "@repo/services/standards/seed/embed";

export interface EmbedCatalogueOptions {
  provider: EmbeddingProvider;
  /** Rows per embedding request. Default 128. */
  batchSize?: number;
  /** Called after each batch, with the running embedded total. */
  onProgress?: (embedded: number) => void;
}

export interface EmbedCatalogueResult {
  embedded: number;
}

/**
 * Embed every `standards` row still missing a vector, in batches. A bounded
 * `--limit` harvest fetches fewer rows but still embeds all of them here — the
 * only "extra" work is clearing a pre-existing backlog, which search needs
 * anyway. Resumable: a crash or re-run just picks up the rows still null.
 */
export async function embedCatalogue(
  options: EmbedCatalogueOptions,
): Promise<EmbedCatalogueResult> {
  const batchSize = options.batchSize ?? 128;
  let embedded = 0;

  for (;;) {
    const rows = await db
      .select({
        id: standardsTable.id,
        number: standardsTable.number,
        title: standardsTable.title,
        summary: standardsTable.summary,
      })
      .from(standardsTable)
      .where(isNull(standardsTable.embedding))
      .limit(batchSize);

    if (rows.length === 0) break;

    const vectors = await options.provider.embed(rows.map(embeddingText));

    let wrote = 0;
    await db.transaction(async (tx) => {
      for (const [i, row] of rows.entries()) {
        const vector = vectors[i];
        if (!vector) continue;
        // Re-check `embedding is null` and the exact title we embedded: a
        // concurrent harvester must not double-write, and a title changed
        // underneath us must not get a now-stale vector.
        const updated = await tx.execute(
          sql`update standards set embedding = ${`[${vector.join(",")}]`}::vector
              where id = ${row.id} and embedding is null and title = ${row.title}`,
        );
        wrote += updated.rowCount ?? 0;
      }
    });

    if (wrote === 0) {
      throw new Error(
        `embedded no rows from a batch of ${rows.length} — provider returned no ` +
          `usable vectors, or another process is embedding the same rows`,
      );
    }

    embedded += wrote;
    options.onProgress?.(embedded);
  }

  return { embedded };
}
