/**
 * Wire types for the Doubao Search API (豆包搜索, `POST
 * https://open.feedcoopapi.com/search_api/...`). Types only — no runtime code.
 *
 * The service ships two editions with different wire formats:
 * - `custom` (`/search_api/web_search`): PascalCase body/fields, honors
 *   `Count` server-side, returns `Result.WebResults[]`.
 * - `global` (`/search_api/global_search`): camelCase body/fields, returns
 *   `Result.Documents[]` with a structured `Parts[]` body.
 *
 * Field names verified against the official Volcengine Doubao Search docs and
 * a working community wrapper (huashu-doubao-search).
 *
 * @module dsh-web-search-doubao/types
 */

/** Doubao Search service edition; each edition has its own endpoint and wire format. */
export type DoubaoEdition = 'global' | 'custom'

/** Request body for the `custom` edition (`POST /search_api/web_search`). */
export interface DoubaoCustomRequest {
  /** The search query. */
  Query: string
  /** Vertical searched; web search is the relevant one here. */
  SearchType: 'web'
  /** Result count; honored server-side (the seam still enforces the bound on return). */
  Count?: number
  /** Optional source-authority filter (`AuthInfoLevel` 1–4, 1 = most authoritative). */
  Filter?: { AuthInfoLevel?: number }
}

/** One entry of the `custom` edition response `Result.WebResults[]`. */
export interface DoubaoCustomResult {
  Title?: string
  Url?: string
  /** Body excerpt; the wrapper prefers it over {@link Summary}/{@link Snippet}. */
  Content?: string
  /** Body excerpt fallback. */
  Summary?: string
  /** Short excerpt fallback. */
  Snippet?: string
  /** Display name of the source site. */
  SiteName?: string
  /** Publication timestamp (ISO 8601 with timezone when the source provides one). */
  PublishTime?: string
  /** Human-readable authority label for the source (not mapped by the seam). */
  AuthInfoDes?: string
}

/** The `custom` edition response envelope. */
export interface DoubaoCustomResponse {
  Result?: {
    WebResults?: DoubaoCustomResult[]
  }
}

/** Request body for the `global` edition (`POST /search_api/global_search`). */
export interface DoubaoGlobalRequest {
  /** The search query. */
  query: string
  /** Result-count hint; the server may still cap the response. */
  doc_count?: number
  /** Maximum characters per document body snippet. */
  max_snippet_length?: number
  /** Maximum CDN image links per document; never set by this provider (the seam has no image field). */
  max_image_count_per_doc?: number
}

/** One part of a `global` edition document body. */
export interface DoubaoGlobalPart {
  /** `text` or `image`. */
  Type?: string
  /** Text content when {@link Type} is `text`. */
  Text?: string
  /** Image reference when {@link Type} is `image` (not mapped by the seam). */
  Image?: { ImageUrl?: string }
}

/** One entry of the `global` edition response `Result.Documents[]`. */
export interface DoubaoGlobalDocument {
  Title?: string
  Url?: string
  /** Source host metadata (display only; not mapped by the seam). */
  HostInfo?: { Hostname?: string }
  DocumentInfo?: {
    /** Publication timestamp (ISO 8601 with timezone when the source provides one). */
    PublishTime?: string
    /** Token count of the document body (not mapped by the seam). */
    ContentTokenCount?: number
  }
  /** Structured document body; text parts concatenate into the `snippet`. */
  Parts?: DoubaoGlobalPart[]
}

/** The `global` edition response envelope. */
export interface DoubaoGlobalResponse {
  Result?: {
    Documents?: DoubaoGlobalDocument[]
  }
}

/** Volcengine-style error envelope (best-effort; fields vary by failure). */
export interface DoubaoError {
  ResponseMetadata?: {
    Error?: {
      Code?: string
      Message?: string
    }
  }
  Message?: string
}
