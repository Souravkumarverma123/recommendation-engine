/**
 * Thin typed client for the BIS new-portal API (standardsadmin.bis.gov.in).
 *
 * All endpoints: POST, application/json, no auth, CORS "*". Undocumented and
 * unversioned — treat as scraping. Be polite (this is a government host):
 * requests are throttled and retried with backoff.
 *
 * Verified live 2026-09-10. See docs/research/sih26108-bis-ecosystem-data-archaeology.md §2.2.
 */
import { z } from "zod";
import {
  bisListResponseSchema,
  bisSearchResponseSchema,
  bisDetailResponseSchema,
  bisAmendmentResponseSchema,
  bisCrossRefResponseSchema,
  bisCommitteesResponseSchema,
  bisCommitteeSchema,
  type BisListItem,
  type BisSearchItem,
  type BisDetail,
  type BisAmendment,
  type BisCrossRef,
  type BisCommittee,
} from "./model";

export interface BisClientOptions {
  baseUrl?: string;
  /** minimum gap between requests, ms (default 600 ≈ ~1.6 req/s) */
  minIntervalMs?: number;
  /** per-request timeout, ms */
  timeoutMs?: number;
  maxRetries?: number;
}

const GUEST = { fromPage: "guestUserPage" } as const;

export class BisClient {
  private readonly baseUrl: string;
  private readonly minIntervalMs: number;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private lastRequestAt = 0;

  constructor(opts: BisClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? "https://standardsadmin.bis.gov.in").replace(/\/+$/, "");
    this.minIntervalMs = opts.minIntervalMs ?? 600;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.maxRetries = opts.maxRetries ?? 4;
  }

  /** One page of the full catalogue. `pageSize` is capped at 100 server-side. */
  async listStandards(params: { page: number; pageSize?: number; search?: string }): Promise<{
    items: BisListItem[];
    total: number | null;
    hasMore: boolean;
  }> {
    const body: Record<string, unknown> = {
      page: params.page,
      pageSize: Math.min(params.pageSize ?? 100, 100),
    };
    if (params.search) body.search = params.search;
    const res = await this.post("/proposal-service/getWebsiteIndianStandardsList", body, bisListResponseSchema);
    return {
      items: res.data,
      total: res.totalRecord ?? null,
      hasMore: res.hasMore ?? res.data.length > 0,
    };
  }

  /** Walk every page of the catalogue. */
  async *iterateAllStandards(opts: { pageSize?: number } = {}): AsyncGenerator<BisListItem> {
    const pageSize = Math.min(opts.pageSize ?? 100, 100);
    let page = 1;
    for (;;) {
      const { items, hasMore } = await this.listStandards({ page, pageSize });
      for (const item of items) yield item;
      if (!hasMore || items.length === 0) break;
      page += 1;
    }
  }

  /** Resolve an IS number to its record + encId + lifecycle status. */
  async searchKnowStandards(searchText: string): Promise<BisSearchItem[]> {
    const res = await this.post("/review-service/searchKnowStandards", { searchText }, bisSearchResponseSchema);
    return res.data;
  }

  /** Full metadata for one standard, keyed by its `standardEncId`. */
  async getStandardDetails(encId: string): Promise<BisDetail> {
    const res = await this.post(
      "/review-service/getWebsiteStandardDetails",
      { encId, ...GUEST },
      bisDetailResponseSchema,
    );
    return res.data;
  }

  /** Amendments for one standard. NOTE: body key is `standardId` but the value is the ENCRYPTED id. */
  async getAmendments(encId: string): Promise<BisAmendment[]> {
    const res = await this.post(
      "/review-service/getAmendmentDetails",
      { standardId: encId },
      bisAmendmentResponseSchema,
    );
    return res.data;
  }

  /** Forward + reverse citation graph for one standard. */
  async getCrossRefs(encId: string): Promise<{ forward: BisCrossRef[]; reverse: BisCrossRef[] }> {
    const res = await this.post(
      "/review-service/getCrossRefDetails",
      { encId, ...GUEST },
      bisCrossRefResponseSchema,
    );
    return {
      forward: res.data.crossRefData ?? [],
      reverse: res.data.crossFollowRefData ?? [],
    };
  }

  /** Master list of the ~415 sectional committees. `data` arrives as JSON strings. */
  async getCommittees(): Promise<BisCommittee[]> {
    const res = await this.post(
      "/technical-committee/getwebsiteAllSectionalCommittees",
      {},
      bisCommitteesResponseSchema,
    );
    return res.data
      .map((s) => {
        try {
          return bisCommitteeSchema.parse(JSON.parse(s));
        } catch {
          return null;
        }
      })
      .filter((c): c is BisCommittee => c !== null);
  }

  /* ----------------------------- internals ----------------------------- */

  private async post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
    await this.throttle();
    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const resp = await fetch(this.baseUrl + path, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (resp.status === 429 || resp.status >= 500) {
          throw new RetryableError(`HTTP ${resp.status} on ${path}`);
        }
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status} on ${path}: ${await resp.text().catch(() => "")}`);
        }
        return schema.parse(await resp.json());
      } catch (err) {
        lastErr = err;
        const retryable = err instanceof RetryableError || isNetworkError(err);
        if (!retryable || attempt === this.maxRetries) break;
        await sleep(500 * 2 ** attempt + Math.random() * 250);
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  private async throttle(): Promise<void> {
    const wait = this.lastRequestAt + this.minIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    this.lastRequestAt = Date.now();
  }
}

class RetryableError extends Error {}

function isNetworkError(err: unknown): boolean {
  return (
    err instanceof TypeError ||
    (err instanceof DOMException && err.name === "TimeoutError") ||
    (err instanceof Error && /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(err.message))
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
