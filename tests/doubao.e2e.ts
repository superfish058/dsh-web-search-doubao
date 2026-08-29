import { describe, expect, it } from 'vitest'
import { DoubaoSearchProvider, DOUBAO_DEFAULT_BASE_URL, DOUBAO_DEFAULT_EDITION } from '../src/index.ts'

/**
 * Real-API smoke for the Doubao Search provider. Self-skips without
 * `$DOUBAO_SEARCH_API_KEY` (CI runs without secrets).
 */
const apiKey = process.env.DOUBAO_SEARCH_API_KEY
const maybe = apiKey !== undefined && apiKey.length > 0 ? describe : describe.skip

maybe('DoubaoSearchProvider real API', () => {
  it('returns sources for a live query', async () => {
    const provider = new DoubaoSearchProvider(() => ({
      apiKey: apiKey!,
      baseURL: process.env.DOUBAO_BASE_URL ?? DOUBAO_DEFAULT_BASE_URL,
      edition: process.env.DOUBAO_EDITION === 'global' ? 'global' : DOUBAO_DEFAULT_EDITION,
    }))
    const result = await provider.search({ query: 'DeepSeek Harness', maxResults: 5 })
    expect(result.sources.length).toBeGreaterThan(0)
    for (const source of result.sources) expect(source.url).toMatch(/^https?:\/\//)
  }, 30_000)
})
