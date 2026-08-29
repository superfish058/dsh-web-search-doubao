/**
 * A `WebSearchProvider` backed by the Doubao Search API (豆包搜索, `POST
 * open.feedcoopapi.com/search_api/...`). Options are read through a thunk so a
 * committed settings change takes effect on the next search, without
 * re-registration or a restart (same pattern as `ZaiSearchProvider`).
 *
 * @module dsh-web-search-doubao/provider
 */

import { WebError } from '@deepseek-ai/dsh-web'
import type {
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '@deepseek-ai/dsh-web'
import type { CredentialRef } from '@deepseek-ai/dsh-credentials'
import type {
  DoubaoCustomResponse,
  DoubaoCustomResult,
  DoubaoEdition,
  DoubaoError,
  DoubaoGlobalDocument,
  DoubaoGlobalResponse,
} from './types.ts'

/** Stable id this provider registers under. */
export const DOUBAO_PROVIDER_ID = 'doubao'

/** Default Doubao Search endpoint base; the edition selects the operation path. */
export const DOUBAO_DEFAULT_BASE_URL = 'https://open.feedcoopapi.com'

/** Default service edition. `custom` honors `Count` server-side; `global` is the alternative. */
export const DOUBAO_DEFAULT_EDITION: DoubaoEdition = 'custom'

/** Attribution header sent on every request. Bump with the package version. */
export const USER_AGENT = 'dsh-web-search-doubao/0.2.1'

/**
 * Per-operation option overrides merged over the resolved snapshot — the values
 * stored under credential references (the settings-GUI card's writes).
 */
export type DoubaoOptionOverrides = Partial<
  Pick<DoubaoSearchProviderOptions, 'apiKey' | 'baseURL' | 'edition' | 'maxSnippetLength' | 'authLevel'>
>

/** Resolved provider options (the plugin's `apply` supplies credential and constant defaults). */
export interface DoubaoSearchProviderOptions {
  /** Literal Doubao Search API key; wins over {@link resolveApiKey} but loses to a {@link resolve} override. */
  apiKey?: string
  /** Resolve the current Doubao Search API key for one search operation. */
  resolveApiKey?: () => Promise<string | undefined>
  /** Credential reference named by missing-credential diagnostics. */
  apiKeyEnv?: CredentialRef
  /** Endpoint base; the edition appends `/search_api/web_search` or `/search_api/global_search`. */
  baseURL: string
  /** Service edition: `custom` (PascalCase, honors Count) or `global` (camelCase, Parts bodies). */
  edition: DoubaoEdition
  /** `global` edition only: maximum characters per document body snippet. */
  maxSnippetLength?: number
  /** `custom` edition only: source-authority floor sent as `Filter.AuthInfoLevel` (1–4). */
  authLevel?: number
  /**
   * Resolve credential-reference values for this operation (the settings-GUI
   * card's stored writes). Merged over the snapshot before the request, so a
   * stored value wins over the literal/env fields above.
   */
  resolve?: () => Promise<DoubaoOptionOverrides>
}

/**
 * Map one `custom` edition web result to a normalized source, or `undefined`
 * when it has no non-blank `Url` or body text — nothing portable to map.
 *
 * @param result - one entry of the response `Result.WebResults[]`.
 * @returns the normalized source, or `undefined` when the entry should be dropped.
 */
export function mapCustomResult(result: DoubaoCustomResult): WebSearchSource | undefined {
  const url = result.Url
  if (url == null || url.length === 0) return undefined
  const snippet = [result.Content, result.Summary, result.Snippet]
    .find((text) => text != null && text.trim().length > 0)
    ?.trim()
  if (snippet === undefined) return undefined
  return {
    url,
    ...result.Title != null && result.Title.length > 0 ? { title: result.Title } : {},
    snippet,
    ...result.PublishTime != null && result.PublishTime.length > 0
      ? { publishedAt: result.PublishTime }
      : {},
  }
}

/**
 * Map one `global` edition document to a normalized source, or `undefined`
 * when it has no non-blank `Url` or text parts.
 *
 * @param document - one entry of the response `Result.Documents[]`.
 * @returns the normalized source, or `undefined` when the entry should be dropped.
 */
export function mapGlobalDocument(document: DoubaoGlobalDocument): WebSearchSource | undefined {
  const url = document.Url
  if (url == null || url.length === 0) return undefined
  const snippet = (document.Parts ?? [])
    .filter((part) => part.Type === 'text' && part.Text != null && part.Text.trim().length > 0)
    .map((part) => part.Text!.trim())
    .join('\n')
    .trim()
  if (snippet.length === 0) return undefined
  const publishedAt = document.DocumentInfo?.PublishTime
  return {
    url,
    ...document.Title != null && document.Title.length > 0 ? { title: document.Title } : {},
    snippet,
    ...publishedAt != null && publishedAt.length > 0 ? { publishedAt } : {},
  }
}

/**
 * Map a Doubao Search response envelope to a normalized search result.
 *
 * @param edition - which service edition the payload came from.
 * @param response - the parsed response body.
 * @returns the normalized result; unmappable entries are dropped.
 */
export function mapDoubaoResponse(
  edition: DoubaoEdition,
  response: DoubaoGlobalResponse | DoubaoCustomResponse,
): WebSearchResult {
  const sources = (edition === 'global'
    ? (response as DoubaoGlobalResponse).Result?.Documents ?? []
    : (response as DoubaoCustomResponse).Result?.WebResults ?? []
  )
    .map(edition === 'global'
      ? (entry) => mapGlobalDocument(entry as DoubaoGlobalDocument)
      : (entry) => mapCustomResult(entry as DoubaoCustomResult))
    .filter((source): source is WebSearchSource => source !== undefined)
  // Doubao Search returns per-result content, not a single generated answer, so
  // `content` is omitted. The web service owns the final `maxResults` truncation,
  // so this provider reports `truncated: false`.
  return { sources, truncated: false }
}

/** The Doubao Search-backed provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
export class DoubaoSearchProvider implements WebSearchProvider {
  readonly id = DOUBAO_PROVIDER_ID

  /**
   * @param resolveOptions - options for the next operation, snapshotted once
   * per search so one operation never mixes two settings sections. A thunk
   * (not a value) because the section can change between searches and
   * re-registering on every change would be overkill.
   */
  constructor(private readonly resolveOptions: () => DoubaoSearchProviderOptions) {}

  available(): boolean {
    const options = this.resolveOptions()
    return ((options.apiKey?.length ?? 0) > 0 || options.resolveApiKey !== undefined)
      && isValidBaseUrl(options.baseURL)
  }

  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    // Snapshot once for the whole operation: the key and the endpoint it is
    // sent to must come from the same settings section.
    const snapshot = this.resolveOptions()
    // Credential-reference values (the settings-GUI card's writes) merge over
    // the snapshot so a stored value wins over literal/env config.
    const overrides = snapshot.resolve === undefined ? {} : await abortable(snapshot.resolve(), signal)
    const options: DoubaoSearchProviderOptions = { ...snapshot, ...overrides }
    const apiKey = await this.apiKey(options, signal)
    throwIfSearchAborted(signal)
    const count = request.maxResults
    let response: Response
    try {
      response = await fetch(`${options.baseURL}${operationPath(options.edition)}`, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
          'accept': 'application/json',
          'user-agent': USER_AGENT,
        },
        body: JSON.stringify(requestBody(request, options, count)),
        ...signal !== undefined ? { signal } : {},
      })
    } catch (error: unknown) {
      if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error)
      throw new WebError(`Doubao search request failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }

    if (!response.ok) {
      const status = response.status
      let message = `Doubao Search API error (HTTP ${status})`
      try {
        const parsed = await response.json() as DoubaoError
        const detail = parsed.ResponseMetadata?.Error?.Message ?? parsed.ResponseMetadata?.Error?.Code ?? parsed.Message
        if (detail !== undefined && detail.length > 0) message = detail
      } catch (error: unknown) {
        // An abort mid-body must surface as WEB_ABORTED, not a generic error.
        if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error)
        // Otherwise fall back to the HTTP-status message; a non-JSON error
        // body (common for gateway 5xx/429s) costs nothing but detail.
      }
      throw new WebError(message, 'WEB_PROVIDER_ERROR')
    }

    try {
      const payload = await response.json() as DoubaoGlobalResponse | DoubaoCustomResponse
      return mapDoubaoResponse(options.edition, payload)
    } catch (error: unknown) {
      if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error)
      if (error instanceof WebError) throw error
      throw new WebError(`Doubao Search returned an unprocessable response body: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }
  }

  /**
   * Resolve one operation's credential without retaining it on the provider.
   * @param options - the caller's snapshot (key and endpoint from one section).
   * @param signal - abort signal for the surrounding search.
   * @returns the resolved key.
   */
  private async apiKey(options: DoubaoSearchProviderOptions, signal?: AbortSignal): Promise<string> {
    throwIfSearchAborted(signal)
    if (options.apiKey !== undefined && options.apiKey.length > 0) return options.apiKey
    let resolved: string | undefined
    try {
      resolved = await abortable(options.resolveApiKey?.() ?? Promise.resolve(undefined), signal)
    } catch (error: unknown) {
      if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error)
      throw new WebError(
        `Doubao search credential resolution failed: ${String(error)}`,
        'WEB_PROVIDER_ERROR',
        { cause: error },
      )
    }
    if (resolved !== undefined && resolved.length > 0) return resolved
    const ref = options.apiKeyEnv ?? 'DOUBAO_SEARCH_API_KEY'
    throw new WebError(
      `Doubao search has no API key for "${ref}"; paste it in the Web Search (Doubao) settings`
      + ' card, store it through the credentials service under that reference, export it in the'
      + ' launching environment, or set a literal "apiKey" in the web-search-doubao config',
      'WEB_PROVIDER_CREDENTIAL_MISSING',
    )
  }
}

/** The operation path appended to the endpoint base for one edition. */
function operationPath(edition: DoubaoEdition): string {
  return edition === 'global' ? '/search_api/global_search' : '/search_api/web_search'
}

/** The edition-specific request body (`custom` is PascalCase, `global` camelCase). */
function requestBody(
  request: WebSearchRequest,
  options: DoubaoSearchProviderOptions,
  count: number | undefined,
): Record<string, unknown> {
  if (options.edition === 'global') {
    return {
      query: request.query,
      ...count !== undefined ? { doc_count: count } : {},
      ...options.maxSnippetLength !== undefined ? { max_snippet_length: options.maxSnippetLength } : {},
    }
  }
  return {
    Query: request.query,
    SearchType: 'web',
    ...count !== undefined ? { Count: count } : {},
    ...options.authLevel !== undefined ? { Filter: { AuthInfoLevel: options.authLevel } } : {},
  }
}

/** Race an async preflight against caller cancellation, without leaving an unhandled rejection behind. */
function abortable<T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal === undefined) return operation
  if (signal.aborted) throw searchAborted(signal)
  return new Promise<T>((resolve, reject) => {
    const onSettle = () => reject(searchAborted(signal))
    signal.addEventListener('abort', onSettle, { once: true })
    operation.then(
      (value) => { signal.removeEventListener('abort', onSettle); resolve(value) },
      (error) => { signal.removeEventListener('abort', onSettle); reject(error) },
    )
  })
}

/** Throw `WEB_ABORTED` if the signal is already aborted; otherwise return. */
function throwIfSearchAborted(signal?: AbortSignal): void {
  if (signal?.aborted === true) throw searchAborted(signal)
}

/** Build the `WEB_ABORTED` error for a signal/cause pair. */
function searchAborted(signal?: AbortSignal, cause?: unknown): WebError {
  return new WebError('Doubao search aborted', 'WEB_ABORTED', { cause: cause ?? signal })
}

/** True when `baseURL` parses as an absolute URL (a cheap local config check). */
function isValidBaseUrl(baseURL: string): boolean {
  return URL.canParse(baseURL)
}

/** True for a fetch/`AbortSignal` abort, surfaced as `WEB_ABORTED`. */
function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
