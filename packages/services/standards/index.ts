/**
 * Standards search service — the retrieval half of the recommendation pipeline.
 *
 * Ticket #6: lexical (Postgres full-text) search over the seeded demo catalogue.
 * Ticket #7 adds pgvector cosine search and fuses the two ranked lists with
 * Reciprocal Rank Fusion, behind this same `search()` method and contract.
 */
import { db, sql } from "@repo/database";
import {
  standardsSearchInputSchema,
  toLifecycleStatus,
  type StandardSearchHit,
  type StandardsSearchInput,
  type StandardsSearchOutput,
} from "./model";

interface LexicalRow extends Record<string, unknown> {
  number: string;
  title: string;
  is_status: number | null;
  score: number;
}

export class StandardsService {
  /**
   * Ranked catalogue matches for a plain-language query or a designation.
   * Input is re-validated here so the method is safe to call outside tRPC.
   */
  async search(input: StandardsSearchInput): Promise<StandardsSearchOutput> {
    const { query, limit } = standardsSearchInputSchema.parse(input);
    const results = await this.lexicalSearch(query, limit);
    return { results };
  }

  /**
   * Postgres full-text search over the `standards.search_vector` generated
   * column (designation weighted 'A', title 'B', team summary 'C'). Ranked with
   * `ts_rank_cd`; ties broken by the newer edition. Returns `[]` when the query
   * reduces to no searchable terms (e.g. only stop words).
   */
  async lexicalSearch(query: string, limit: number): Promise<StandardSearchHit[]> {
    const tsquery = sql`websearch_to_tsquery('english', ${query})`;
    const result = await db.execute<LexicalRow>(sql`
      select
        "number",
        title,
        is_status,
        ts_rank_cd(search_vector, ${tsquery}) as score
      from standards
      where search_vector @@ ${tsquery}
      order by score desc, edition_year desc nulls last, "number" asc
      limit ${limit}
    `);

    return result.rows.map((row) => ({
      number: row.number,
      title: row.title,
      isStatus: row.is_status,
      lifecycleStatus: toLifecycleStatus(row.is_status),
      score: Number(row.score),
    }));
  }
}

export const standardsService = new StandardsService();
