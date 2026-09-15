import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.tsx'
import type { CardState, ClientContext } from '../src/client/card.tsx'

const KEY_REF = 'DOUBAO_SEARCH_API_KEY'

/** Flush the async describe/save chains started by the synchronous `apply`. */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

interface RegisteredSlot {
  name: string
  definition: Record<string, unknown>
  component: unknown
}

/** A client context capturing every service interaction, with a scriptable credentials API. */
function fakeContext(options: { configuredRefs?: Set<string>, failSet?: boolean, noCredentialsApi?: boolean, failDescribe?: boolean } = {}) {
  const sections: RegisteredSlot[] = []
  const items: RegisteredSlot[] = []
  const locales: Array<[string, unknown]> = []
  const remoteHandlers: Array<(ref: string) => void> = []
  const setCalls: Array<{ ref: string, value: string }> = []
  const unsetCalls: string[] = []
  const describeCalls: string[][] = []
  const configuredRefs = options.configuredRefs ?? new Set<string>()

  const ctx: ClientContext = {
    get: (service) => service === 'connection'
      ? options.noCredentialsApi === true
        ? undefined
        : {
            api: {
              credentials: {
                set: async ({ ref, value }) => {
                  setCalls.push({ ref, value })
                  return options.failSet === true
                    ? { result: { ok: false, error: { message: 'denied' } } }
                    : { result: { ok: true } }
                },
                unset: async ({ ref }) => {
                  unsetCalls.push(ref)
                  return { result: { ok: true } }
                },
                describe: async ({ refs }) => {
                  describeCalls.push([...refs])
                  if (options.failDescribe === true) throw new Error('describe boom')
                  return {
                    result: {
                      ok: true,
                      value: {
                        credentials: Object.fromEntries(refs.map((ref) => [
                          ref,
                          { configured: configuredRefs.has(ref), writable: true },
                        ])),
                      },
                    },
                  }
                },
              },
            },
          }
      : undefined,
    locale: {
      bind: () => (key: string) => `t:${key}`,
      register: (namespace, dictionaries) => {
        locales.push([namespace, dictionaries])
        return undefined
      },
    },
    slots: {
      inject: (slot, factory) => {
        const registration = factory() as { definition: Record<string, unknown>, component: unknown }
        const entry: RegisteredSlot = { name: slot, definition: registration.definition, component: registration.component }
        if (slot === 'settings.section') sections.push(entry)
        else items.push(entry)
        return undefined
      },
      register: (definition, component) => ({ definition, component }),
    },
    effect: (install) => {
      install()
      return undefined
    },
    remote: {
      $on: (event, handler) => {
        if (event === 'credentials/updated') remoteHandlers.push(handler)
        return undefined
      },
    },
  }
  return { ctx, sections, items, locales, remoteHandlers, setCalls, unsetCalls, describeCalls, configuredRefs }
}

/** Materialize the item slot's `inject` return — the form's props. */
function itemProps(entry: RegisteredSlot): {
  hooks: { searchProviderCard: { getSnapshot(): CardState, subscribe(listener: () => void): () => void } }
  save: (values: Record<string, string>) => Promise<void>
  reset: () => Promise<void>
  t: (key: string) => string
  fields: readonly { id: string, refName: string }[]
  keyFieldId: string
  keyConsoleUrl: string | undefined
} {
  const injectFn = entry.definition.inject as () => Record<string, unknown>
  return injectFn() as never
}

describe('web-search-doubao client card registration', () => {
  it('declares the services it injects', () => {
    expect(inject).toEqual(['slots', 'locale', 'connection', 'remote'])
  })

  it('registers a section and its item with the expected ids and locale namespace', () => {
    const c = fakeContext()
    apply(c.ctx)
    expect(c.sections).toHaveLength(1)
    const section = c.sections[0]!
    expect(section.name).toBe('settings.section')
    expect(section.definition).toMatchObject({ id: 'doubao-web-search', order: 20, locale: 'settings.plugins.doubao' })
    const label = section.definition.label as () => string
    expect(label()).toBe('t:title')
    expect(Object.keys(section.definition.children as object)).toEqual(['settings.doubao.item'])

    expect(c.items).toHaveLength(1)
    const item = c.items[0]!
    expect(item.name).toBe('settings.doubao.item')
    expect(item.definition).toMatchObject({ id: 'doubao-config', locale: 'settings.plugins.doubao' })
  })

  it('registers en/zh dictionaries under the plugin locale namespace', () => {
    const c = fakeContext()
    apply(c.ctx)
    expect(c.locales).toEqual([['settings.plugins.doubao', { en: expect.anything(), zh: expect.anything() }]])
  })

  it('hands the form the console link and the signposting copy', () => {
    const c = fakeContext()
    apply(c.ctx)
    const props = itemProps(c.items[0]!)
    expect(props.keyConsoleUrl).toBe('https://console.volcengine.com/search-infinity/api-key')
    const dictionaries = c.locales[0]![1] as { en: Record<string, string>, zh: Record<string, string> }
    for (const key of ['getApiKey', 'storageNote', 'keyConfigured', 'keyMissing']) {
      expect(dictionaries.en[key]).toBeTruthy()
      expect(dictionaries.zh[key]).toBeTruthy()
    }
  })

  it('describes the key reference on apply and seeds the badge from the response', async () => {
    const configured = fakeContext({ configuredRefs: new Set([KEY_REF]) })
    apply(configured.ctx)
    await tick()
    expect(configured.describeCalls).toEqual([[KEY_REF]])
    const props = itemProps(configured.items[0]!)
    expect(props.hooks.searchProviderCard.getSnapshot()).toMatchObject({ keyConfigured: true, writable: true })

    const missing = fakeContext()
    apply(missing.ctx)
    await tick()
    expect(itemProps(missing.items[0]!).hooks.searchProviderCard.getSnapshot())
      .toMatchObject({ keyConfigured: false, writable: true })
  })
})

describe('web-search-doubao client card save/reset', () => {
  it('stores every non-blank staged value (trimmed) under its reference', async () => {
    const c = fakeContext()
    apply(c.ctx)
    await tick()
    const props = itemProps(c.items[0]!)
    await props.save({ apiKey: '  key-1  ', baseURL: 'https://x.test', edition: '' })
    expect(c.setCalls).toEqual([
      { ref: 'DOUBAO_SEARCH_API_KEY', value: 'key-1' },
      { ref: 'DOUBAO_SEARCH_BASE_URL', value: 'https://x.test' },
    ])
    expect(props.hooks.searchProviderCard.getSnapshot()).toMatchObject({ saving: false, message: 'saved' })
  })

  it('reports saveFailed without writing further references when a set fails', async () => {
    const c = fakeContext({ failSet: true })
    apply(c.ctx)
    await tick()
    const props = itemProps(c.items[0]!)
    await props.save({ apiKey: 'key-1', baseURL: 'https://x.test', edition: 'global' })
    expect(c.setCalls).toEqual([{ ref: 'DOUBAO_SEARCH_API_KEY', value: 'key-1' }])
    expect(props.hooks.searchProviderCard.getSnapshot()).toMatchObject({ saving: false, message: 'saveFailed' })
  })

  it('resets every reference and reports resetDone', async () => {
    const c = fakeContext()
    apply(c.ctx)
    await tick()
    const props = itemProps(c.items[0]!)
    await props.reset()
    expect(c.unsetCalls).toEqual([KEY_REF, 'DOUBAO_SEARCH_BASE_URL', 'DOUBAO_SEARCH_EDITION'])
    expect(props.hooks.searchProviderCard.getSnapshot()).toMatchObject({ saving: false, message: 'resetDone' })
  })

  it('clears the status message after four seconds (the badge stays authoritative)', async () => {
    vi.useFakeTimers()
    try {
      const c = fakeContext()
      apply(c.ctx)
      const props = itemProps(c.items[0]!)
      await props.save({ apiKey: 'key-1' })
      expect(props.hooks.searchProviderCard.getSnapshot().message).toBe('saved')
      vi.advanceTimersByTime(4100)
      expect(props.hooks.searchProviderCard.getSnapshot().message).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('hands the form the doubao field specs and key field id', () => {
    const c = fakeContext()
    apply(c.ctx)
    const props = itemProps(c.items[0]!)
    expect(props.fields.map((field) => field.refName)).toEqual([KEY_REF, 'DOUBAO_SEARCH_BASE_URL', 'DOUBAO_SEARCH_EDITION'])
    expect(props.keyFieldId).toBe('apiKey')
  })
})

describe('web-search-doubao client card live refresh', () => {
  it('re-describes when credentials/updated fires for the key reference', async () => {
    const c = fakeContext()
    apply(c.ctx)
    await tick()
    expect(c.remoteHandlers).toHaveLength(1)
    c.configuredRefs.add(KEY_REF)
    c.remoteHandlers[0]!(KEY_REF)
    await tick()
    const props = itemProps(c.items[0]!)
    expect(props.hooks.searchProviderCard.getSnapshot()).toMatchObject({ keyConfigured: true })
  })

  it('ignores credentials/updated for other references', async () => {
    const c = fakeContext()
    apply(c.ctx)
    await tick()
    const before = c.describeCalls.length
    c.remoteHandlers[0]!('OTHER_REF')
    await tick()
    expect(c.describeCalls.length).toBe(before)
  })
})

describe('web-search-doubao client card without credentials API', () => {
  it('reports the API as unavailable instead of pretending "not configured"', async () => {
    const c = fakeContext({ noCredentialsApi: true })
    apply(c.ctx)
    await tick()
    const props = itemProps(c.items[0]!)
    const state = props.hooks.searchProviderCard.getSnapshot()
    expect(state.apiState).toBe('unavailable')
    expect(state.keyConfigured).toBe(false)
    expect(state.writable).toBe(false)
    expect(c.describeCalls).toHaveLength(0)
  })

  it('does not silently no-op on save when the API is missing; it shows the guide', async () => {
    const c = fakeContext({ noCredentialsApi: true })
    apply(c.ctx)
    await tick()
    const props = itemProps(c.items[0]!)
    await props.save({ apiKey: 'key-1' })
    const state = props.hooks.searchProviderCard.getSnapshot()
    expect(state.message).toBe('apiUnavailable')
    expect(state.messageDetail).toBeTruthy()
    expect(c.setCalls).toHaveLength(0)
  })

  it('does not silently no-op on reset when the API is missing', async () => {
    const c = fakeContext({ noCredentialsApi: true })
    apply(c.ctx)
    await tick()
    const props = itemProps(c.items[0]!)
    await props.reset()
    const state = props.hooks.searchProviderCard.getSnapshot()
    expect(state.message).toBe('resetUnavailable')
    expect(c.unsetCalls).toHaveLength(0)
  })

  it('surfaces a describe transport failure as an error state', async () => {
    const c = fakeContext({ failDescribe: true })
    apply(c.ctx)
    await tick()
    const props = itemProps(c.items[0]!)
    const state = props.hooks.searchProviderCard.getSnapshot()
    expect(state.apiState).toBe('error')
    expect(state.apiError).toBe('describe boom')
  })

  it('shows the failing set message on a rejected set', async () => {
    const c = fakeContext({ failSet: true })
    apply(c.ctx)
    await tick()
    const props = itemProps(c.items[0]!)
    await props.save({ apiKey: 'key-1' })
    const state = props.hooks.searchProviderCard.getSnapshot()
    expect(state.message).toBe('saveFailed')
    expect(state.messageDetail).toBe('denied')
  })
})

const bundlePath = new URL('../lib/client.js', import.meta.url)
const maybeBundle = existsSync(bundlePath) ? describe : describe.skip

maybeBundle('client bundle (lib/client.js)', () => {
  it('loads through window.__ModuleLoader__ and exports apply/inject', () => {
    const code = readFileSync(bundlePath, 'utf8')
    const loads: Array<{ id: string, factory: (request: (name: string) => unknown) => unknown }> = []
    ;(globalThis as { window?: unknown }).window = {
      __ModuleLoader__: { load: (spec: { id: string, factory: (request: (name: string) => unknown) => unknown }) => { loads.push(spec) } },
    }
    try {
      new Function(code)()
      expect(loads).toHaveLength(1)
      expect(loads[0]!.id).toBe('dsh-web-search-doubao')
      const fakeReact = { useState: () => ['', () => {}] }
      const fakeJsxRuntime = { jsx: () => null, jsxs: () => null, Fragment: 'Fragment' }
      const mod = loads[0]!.factory((name: string) => {
        if (name === 'react') return fakeReact
        if (name === 'react/jsx-runtime') return fakeJsxRuntime
        throw new Error(`unexpected require: ${name}`)
      }) as { apply: unknown, inject: string[] }
      expect(typeof mod.apply).toBe('function')
      expect(mod.inject).toEqual(['slots', 'locale', 'connection', 'remote'])
    } finally {
      delete (globalThis as { window?: unknown }).window
    }
  })
})
