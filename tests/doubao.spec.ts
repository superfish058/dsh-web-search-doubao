import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import { Context } from '@deepseek-ai/cordis'
import WebRuntime from '@deepseek-ai/dsh-web'
import { DoubaoSearchProvider, DOUBAO_PROVIDER_ID } from '../src/index.ts'
import * as doubaoPlugin from '../src/index.ts'
import { mapCustomResult, mapDoubaoResponse, mapGlobalDocument, USER_AGENT } from '../src/provider.ts'
import type { DoubaoSearchProviderOptions } from '../src/provider.ts'

const options: DoubaoSearchProviderOptions = { apiKey: 'doubao-key', baseURL: 'https://doubao-search.test', edition: 'custom' }

/** Wrap static options in the thunk the provider constructor expects. */
function thunk(opts: DoubaoSearchProviderOptions): () => DoubaoSearchProviderOptions {
  return () => opts
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Doubao result mapping', () => {
  it('ships a user-agent matching the package name and version', async () => {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as { name: string, version: string }
    expect(USER_AGENT).toBe(`${pkg.name}/${pkg.version}`)
  })

  it('maps a full custom result', () => {
    expect(mapCustomResult({
      Url: 'https://a.test',
      Title: 'A',
      Content: 'salient sentence',
      SiteName: 'A Site',
      PublishTime: '2026-03-19T09:00:22+08:00',
      AuthInfoDes: '权威来源',
    })).toEqual({
      url: 'https://a.test',
      title: 'A',
      snippet: 'salient sentence',
      publishedAt: '2026-03-19T09:00:22+08:00',
    })
  })

  it('prefers Content over Summary over Snippet for the custom snippet', () => {
    expect(mapCustomResult({ Url: 'https://a.test', Content: 'c', Summary: 's', Snippet: 'n' })?.snippet).toBe('c')
    expect(mapCustomResult({ Url: 'https://a.test', Summary: 's', Snippet: 'n' })?.snippet).toBe('s')
    expect(mapCustomResult({ Url: 'https://a.test', Snippet: 'n' })?.snippet).toBe('n')
  })

  it('drops a custom result with no body text', () => {
    expect(mapCustomResult({ Url: 'https://a.test' })).toBeUndefined()
    expect(mapCustomResult({ Url: 'https://a.test', Content: '' })).toBeUndefined()
    expect(mapCustomResult({ Url: 'https://a.test', Summary: '   ' })).toBeUndefined()
  })

  it('drops a custom result with no url', () => {
    expect(mapCustomResult({ Content: 'hi' })).toBeUndefined()
    expect(mapCustomResult({ Url: '', Content: 'hi' })).toBeUndefined()
  })

  it('omits empty title/publishTime rather than emitting them', () => {
    expect(mapCustomResult({ Url: 'https://a.test', Title: '', Content: 'hi', PublishTime: '' }))
      .toEqual({ url: 'https://a.test', snippet: 'hi' })
  })

  it('maps a full global document', () => {
    expect(mapGlobalDocument({
      Url: 'https://b.test',
      Title: 'B',
      HostInfo: { Hostname: 'b.test' },
      DocumentInfo: { PublishTime: '2026-03-19T09:00:22+08:00', ContentTokenCount: 42 },
      Parts: [
        { Type: 'text', Text: 'first part' },
        { Type: 'text', Text: 'second part' },
      ],
    })).toEqual({
      url: 'https://b.test',
      title: 'B',
      snippet: 'first part\nsecond part',
      publishedAt: '2026-03-19T09:00:22+08:00',
    })
  })

  it('ignores global image parts when building the snippet', () => {
    expect(mapGlobalDocument({
      Url: 'https://b.test',
      Parts: [
        { Type: 'text', Text: 'words' },
        { Type: 'image', Image: { ImageUrl: 'https://img.test' } },
      ],
    })?.snippet).toBe('words')
  })

  it('drops a global document with no text parts', () => {
    expect(mapGlobalDocument({ Url: 'https://b.test' })).toBeUndefined()
    expect(mapGlobalDocument({ Url: 'https://b.test', Parts: [] })).toBeUndefined()
    expect(mapGlobalDocument({ Url: 'https://b.test', Parts: [{ Type: 'image', Image: { ImageUrl: 'https://img.test' } }] })).toBeUndefined()
    expect(mapGlobalDocument({ Url: 'https://b.test', Parts: [{ Type: 'text', Text: '   ' }] })).toBeUndefined()
  })

  it('drops a global document with no url', () => {
    expect(mapGlobalDocument({ Parts: [{ Type: 'text', Text: 'hi' }] })).toBeUndefined()
    expect(mapGlobalDocument({ Url: '', Parts: [{ Type: 'text', Text: 'hi' }] })).toBeUndefined()
  })

  it('maps a response with filtered sources and no generated content', () => {
    const custom = mapDoubaoResponse('custom', {
      Result: {
        WebResults: [
          { Url: 'https://a.test', Content: 'one' },
          { Url: 'https://bad.test' },
          { Url: 'https://c.test', Title: 'C', Content: 'three' },
        ],
      },
    })
    expect(custom).toEqual({
      sources: [
        { url: 'https://a.test', snippet: 'one' },
        { url: 'https://c.test', title: 'C', snippet: 'three' },
      ],
      truncated: false,
    })
    expect(custom.content).toBeUndefined()

    const global = mapDoubaoResponse('global', {})
    expect(global.sources).toEqual([])
  })
})

describe('DoubaoSearchProvider availability', () => {
  it('is unavailable without a key or resolver', () => {
    expect(new DoubaoSearchProvider(thunk({ ...options, apiKey: '' })).available()).toBe(false)
  })

  it('is available with a key', () => {
    expect(new DoubaoSearchProvider(thunk(options)).available()).toBe(true)
  })

  it('is available with a resolveApiKey callback even without a literal key', () => {
    expect(new DoubaoSearchProvider(thunk({ ...options, apiKey: '', resolveApiKey: async () => 'resolved' })).available()).toBe(true)
  })

  it('is misconfigured when the base URL is unparseable', () => {
    expect(new DoubaoSearchProvider(thunk({ ...options, baseURL: 'not a url' })).available()).toBe(false)
  })
})

describe('DoubaoSearchProvider request mapping (custom edition)', () => {
  it('sends Query, SearchType, Count and bearer auth to the custom endpoint', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ Result: { WebResults: [{ Url: 'https://a.test', Content: 'hi' }] } }))
    vi.stubGlobal('fetch', fetchMock)

    const provider = new DoubaoSearchProvider(thunk(options))
    await provider.search({ query: 'hello', maxResults: 5 })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://doubao-search.test/search_api/web_search')
    expect(init).toMatchObject({ method: 'POST', redirect: 'error' })
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer doubao-key')
    expect(JSON.parse(init.body as string)).toMatchObject({
      Query: 'hello',
      SearchType: 'web',
      Count: 5,
    })
  })

  it('omits Count when the request carries no maxResults', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ Result: { WebResults: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    await new DoubaoSearchProvider(thunk(options)).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).not.toHaveProperty('Count')
  })

  it('threads authLevel config into Filter.AuthInfoLevel', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ Result: { WebResults: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    await new DoubaoSearchProvider(thunk({ ...options, authLevel: 2 })).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string).Filter).toEqual({ AuthInfoLevel: 2 })
  })

  it('omits Filter when no authLevel is configured', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ Result: { WebResults: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    await new DoubaoSearchProvider(thunk(options)).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).not.toHaveProperty('Filter')
  })

  it('forwards the abort signal', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ Result: { WebResults: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await new DoubaoSearchProvider(thunk(options)).search({ query: 'q' }, controller.signal)
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.signal).toBe(controller.signal)
  })

  it('resolves the key through resolveApiKey when no literal key is set', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ Result: { WebResults: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = new DoubaoSearchProvider(thunk({ ...options, apiKey: '', resolveApiKey: async () => 'resolved-key' }))
    await provider.search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer resolved-key')
  })

  it('throws WEB_PROVIDER_CREDENTIAL_MISSING when no key resolves', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ Result: { WebResults: [] } })))
    const provider = new DoubaoSearchProvider(thunk({ ...options, apiKey: '', resolveApiKey: async () => undefined }))
    await expect(provider.search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_CREDENTIAL_MISSING' }))
  })
})

describe('DoubaoSearchProvider request mapping (global edition)', () => {
  it('posts to the global endpoint with query and doc_count', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ Result: { Documents: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    await new DoubaoSearchProvider(thunk({ ...options, edition: 'global' })).search({ query: 'hello', maxResults: 5 })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://doubao-search.test/search_api/global_search')
    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({ query: 'hello', doc_count: 5 })
    expect(body).not.toHaveProperty('SearchType')
  })

  it('threads maxSnippetLength into max_snippet_length', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ Result: { Documents: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    await new DoubaoSearchProvider(thunk({ ...options, edition: 'global', maxSnippetLength: 600 })).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string).max_snippet_length).toBe(600)
  })

  it('omits doc_count when the request carries no maxResults', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ Result: { Documents: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    await new DoubaoSearchProvider(thunk({ ...options, edition: 'global' })).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).not.toHaveProperty('doc_count')
  })
})

describe('DoubaoSearchProvider error handling', () => {
  it('maps an HTTP error to WEB_PROVIDER_ERROR with the ResponseMetadata message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ResponseMetadata: { Error: { Code: 'InvalidKey', Message: 'bad key' } } }, { status: 401 })))
    await expect(new DoubaoSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'bad key' }))
  })

  it('falls back to the error Code when no Message is present', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ResponseMetadata: { Error: { Code: 'InvalidParameter' } } }, { status: 400 })))
    await expect(new DoubaoSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'InvalidParameter' }))
  })

  it('falls back to a top-level Message field', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ Message: 'quota exceeded' }, { status: 429 })))
    await expect(new DoubaoSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'quota exceeded' }))
  })

  it('keeps a status-line message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('gateway down', { status: 502 })))
    await expect(new DoubaoSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'Doubao Search API error (HTTP 502)' }))
  })

  it('keeps the status-line message when the JSON error body carries no detail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, { status: 500 })))
    await expect(new DoubaoSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ message: 'Doubao Search API error (HTTP 500)' }))
  })

  it('maps a network failure to WEB_PROVIDER_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('connection refused'))))
    await expect(new DoubaoSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }))
  })

  it('maps an abort to WEB_ABORTED', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new DOMException('aborted', 'AbortError'))))
    await expect(new DoubaoSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_ABORTED' }))
  })

  it('maps an unparseable success body to WEB_PROVIDER_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 200 })))
    await expect(new DoubaoSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }))
  })

  it('maps a well-formed body of the wrong shape to WEB_PROVIDER_ERROR, not a raw TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ Result: { WebResults: {} } }, { status: 200 })))
    await expect(new DoubaoSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }))
  })

  it('surfaces an abort during success-body parse as WEB_ABORTED, not provider error', async () => {
    const body = { json: () => Promise.reject(new DOMException('aborted', 'AbortError')), ok: true, status: 200 }
    vi.stubGlobal('fetch', vi.fn(async () => body as unknown as Response))
    await expect(new DoubaoSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_ABORTED' }))
  })

  it('surfaces an abort during error-body parse as WEB_ABORTED', async () => {
    const body = { json: () => Promise.reject(new DOMException('aborted', 'AbortError')), ok: false, status: 500 }
    vi.stubGlobal('fetch', vi.fn(async () => body as unknown as Response))
    await expect(new DoubaoSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_ABORTED' }))
  })
})

describe('web-search-doubao plugin registration', () => {
  it('registers the provider into ctx.web (HMR-safe)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ Result: { WebResults: [] } })))
    const ctx = new Context()
    await ctx.plugin(WebRuntime, { searchProvider: DOUBAO_PROVIDER_ID })
    const fiber = await ctx.plugin(doubaoPlugin, { apiKey: 'doubao-key' })
    await expect(ctx.web.search({ query: 'q' })).resolves.toMatchObject({ sources: [], truncated: false })
    await fiber.dispose()
    await expect(ctx.web.search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_CONFIGURED_MISSING' }))
  })

  it('has no default export (namespace plugin export shape)', () => {
    expect('default' in doubaoPlugin).toBe(false)
  })

  it('threads edition and maxSnippetLength config into the request', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ Result: { Documents: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = new Context()
    await ctx.plugin(WebRuntime, { searchProvider: DOUBAO_PROVIDER_ID })
    const fiber = await ctx.plugin(doubaoPlugin, { apiKey: 'doubao-key', edition: 'global', maxSnippetLength: 500 })
    await ctx.web.search({ query: 'q' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://open.feedcoopapi.com/search_api/global_search')
    expect(JSON.parse(init.body as string).max_snippet_length).toBe(500)
    await fiber.dispose()
  })

  it('falls back to $DOUBAO_SEARCH_API_KEY and the default base URL and edition when config omits them', async () => {
    const prev = process.env.DOUBAO_SEARCH_API_KEY
    process.env.DOUBAO_SEARCH_API_KEY = 'env-key'
    try {
      const fetchMock = vi.fn(async () => jsonResponse({ Result: { WebResults: [] } }))
      vi.stubGlobal('fetch', fetchMock)
      const ctx = new Context()
      await ctx.plugin(WebRuntime, { searchProvider: DOUBAO_PROVIDER_ID })
      const fiber = await ctx.plugin(doubaoPlugin, {})
      await ctx.web.search({ query: 'q' })
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
      expect(url).toBe('https://open.feedcoopapi.com/search_api/web_search')
      expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer env-key')
      expect(JSON.parse(init.body as string).SearchType).toBe('web')
      await fiber.dispose()
    } finally {
      if (prev === undefined) delete process.env.DOUBAO_SEARCH_API_KEY
      else process.env.DOUBAO_SEARCH_API_KEY = prev
    }
  })

  it('throws WEB_PROVIDER_CREDENTIAL_MISSING when neither config nor env supplies a key', async () => {
    const prev = process.env.DOUBAO_SEARCH_API_KEY
    delete process.env.DOUBAO_SEARCH_API_KEY
    try {
      const ctx = new Context()
      await ctx.plugin(WebRuntime, { searchProvider: DOUBAO_PROVIDER_ID })
      await ctx.plugin(doubaoPlugin, {})
      await expect(ctx.web.search({ query: 'q' }))
        .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_CREDENTIAL_MISSING' }))
    } finally {
      if (prev !== undefined) process.env.DOUBAO_SEARCH_API_KEY = prev
    }
  })
})

/** Fake credentials service keyed by raw reference name (a `CredentialRef` is a branded string). */
function credentialsService(stored: Record<string, string>) {
  return {
    resolve: async (ref: string) => {
      const value = stored[String(ref)]
      return value === undefined ? undefined : { value }
    },
  }
}

describe('credential-service precedence (settings-card values)', () => {
  it('prefers the key stored in the credentials service over a literal config key', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ Result: { WebResults: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = new Context()
    ctx.provide('credentials', credentialsService({ DOUBAO_SEARCH_API_KEY: 'card-key' }))
    await ctx.plugin(WebRuntime, { searchProvider: DOUBAO_PROVIDER_ID })
    const fiber = await ctx.plugin(doubaoPlugin, { apiKey: 'literal-key' })
    await ctx.web.search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer card-key')
    await fiber.dispose()
  })

  it('prefers the base URL stored in the credentials service over config', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ Result: { WebResults: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = new Context()
    ctx.provide('credentials', credentialsService({
      DOUBAO_SEARCH_API_KEY: 'card-key',
      DOUBAO_SEARCH_BASE_URL: 'https://card-endpoint.test',
    }))
    await ctx.plugin(WebRuntime, { searchProvider: DOUBAO_PROVIDER_ID })
    const fiber = await ctx.plugin(doubaoPlugin, { baseURL: 'https://config-endpoint.test' })
    await ctx.web.search({ query: 'q' })
    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://card-endpoint.test/search_api/web_search')
    await fiber.dispose()
  })

  it('prefers the edition stored in the credentials service over config', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ Result: { Documents: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = new Context()
    ctx.provide('credentials', credentialsService({
      DOUBAO_SEARCH_API_KEY: 'card-key',
      DOUBAO_SEARCH_EDITION: 'global',
    }))
    await ctx.plugin(WebRuntime, { searchProvider: DOUBAO_PROVIDER_ID })
    const fiber = await ctx.plugin(doubaoPlugin, { edition: 'custom' })
    await ctx.web.search({ query: 'q' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://open.feedcoopapi.com/search_api/global_search')
    expect(JSON.parse(init.body as string)).toMatchObject({ query: 'q' })
    await fiber.dispose()
  })

  it('ignores an unrecognized stored edition and keeps the configured default', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ Result: { WebResults: [] } }))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = new Context()
    ctx.provide('credentials', credentialsService({
      DOUBAO_SEARCH_API_KEY: 'card-key',
      DOUBAO_SEARCH_EDITION: 'bogus',
    }))
    await ctx.plugin(WebRuntime, { searchProvider: DOUBAO_PROVIDER_ID })
    const fiber = await ctx.plugin(doubaoPlugin, {})
    await ctx.web.search({ query: 'q' })
    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://open.feedcoopapi.com/search_api/web_search')
    await fiber.dispose()
  })
})
