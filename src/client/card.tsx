/**
 * Reusable settings-GUI card for DSH search-provider plugins.
 *
 * This is the "universal adapter" half of the package: a config-driven card
 * factory that registers an independent settings section into the harness
 * shell's `settings.section` slot and stores field values under **credential
 * references** through the connection API — never in settings documents.
 *
 * The mechanism is verified against `dsh-web-search-anysearch`'s published
 * client bundle: `window.__ModuleLoader__` CJS handoff, `ctx.get('connection')
 * .api.credentials.{set,unset,describe}`, `ctx.remote.$on('credentials/updated')`
 * for live refresh, and the slot/props conventions below. A future search
 * provider (ZAI, Kimi, Qwen, …) instantiates this factory with its own refs
 * and dictionaries instead of re-implementing the card.
 *
 * @module dsh-web-search-doubao/client/card
 */

import { useState } from 'react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'

/** One configurable field of the card. */
export interface CardFieldSpec {
  /** Field id; keys into the staged-values map and the locale dictionaries. */
  id: string
  /** Credential reference the value is stored under on save. */
  refName: string
  /** Input kind: masked `password` (keys), `text`, or `select`. */
  kind: 'password' | 'text' | 'select'
  /** `select` only: the allowed values. */
  options?: readonly string[]
  /** Input placeholder. */
  placeholder?: string
}

/** Full configuration for one provider's card. */
export interface SearchProviderCardConfig {
  /** Slot namespace segment, e.g. `doubao` → item slot `settings.doubao.item`. */
  moduleKey: string
  /** Registered settings-section id (unique across the settings sidebar). */
  sectionId: string
  /** Sort order among settings sections (the native Web section sits lower). */
  order: number
  /** The field whose configured badge is shown (the credential field). */
  keyFieldId: string
  /**
   * Console URL where a key is issued; rendered as a "get a key" link under
   * the key field. Omit when the provider has no self-service console.
   */
  keyConsoleUrl?: string
  /** The card's fields, in render order. */
  fields: readonly CardFieldSpec[]
  /** en/zh dictionaries keyed by message and field id. */
  dictionaries: { en: Record<string, string>, zh: Record<string, string> }
}

/** The credentials API's availability, probed on apply. */
export type CardApiState = 'unknown' | 'ok' | 'unavailable' | 'error'

/** Reactive card state exposed to the form through the injected hook. */
export interface CardState {
  saving: boolean
  message: 'saved' | 'saveFailed' | 'resetDone' | 'apiUnavailable' | 'resetUnavailable' | undefined
  /** Optional detail for the current message (e.g. the failing API error). */
  messageDetail: string | undefined
  keyConfigured: boolean
  writable: boolean
  /** Whether the host exposes the credentials API this card writes through. */
  apiState: CardApiState
  /** The describe()/set() error, when apiState is `error`. */
  apiError: string | undefined
}

/** The store contract the slot runtime turns into a `useSearchProviderCard` hook. */
interface CardStore {
  getSnapshot(): CardState
  subscribe(listener: () => void): () => void
}

/** Response envelope of `api.credentials.set`/`unset`. */
interface CredentialsWriteResponse {
  result?: { ok?: boolean, error?: { message?: string } }
}

/** Response envelope of `api.credentials.describe`. */
interface CredentialsDescribeResponse {
  result?: {
    ok?: boolean
    error?: { message?: string }
    value?: { credentials?: Record<string, { configured?: boolean, writable?: boolean }> }
  }
}

/** The slice of the connection API the card needs. */
interface CredentialsApi {
  set(input: { ref: string, value: string }): Promise<CredentialsWriteResponse>
  unset(input: { ref: string }): Promise<CredentialsWriteResponse>
  describe(input: { refs: readonly string[] }): Promise<CredentialsDescribeResponse>
}

/**
 * The client services this card consumes, typed structurally (the client half
 * carries no `@deepseek-ai/*` imports — the shell provides everything).
 */
export interface ClientContext {
  get(service: 'connection'): { api: { credentials: CredentialsApi } } | undefined
  locale: {
    bind(namespace: string): (key: string) => string
    register(namespace: string, dictionaries: unknown): unknown
  }
  slots: {
    inject(slot: string, factory: () => unknown): unknown
    register(definition: Record<string, unknown>, component: unknown): unknown
  }
  effect(install: () => unknown, label: string): unknown
  remote: { $on(event: string, handler: (ref: string) => void): unknown }
}

/** Props the slot runtime hands the form component (from the item's `inject`). */
interface CardFormProps {
  useSearchProviderCard: (selector: (state: CardState) => CardState) => CardState
  save: (values: Record<string, string>) => Promise<void>
  reset: () => Promise<void>
  t: (key: string) => string
  fields: readonly CardFieldSpec[]
  keyFieldId: string
  keyConsoleUrl: string | undefined
}

/* jscpd:ignore-start */
const columnStyle = { display: 'flex', flexDirection: 'column', gap: 'var(--dsw-spacing-3, 12px)' } as const
const descriptionStyle = { margin: 0, color: 'var(--dsw-alias-fg-secondary, #667085)', fontSize: 'var(--dsw-font-size-sm, 13px)' } as const
const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 'var(--dsw-spacing-1, 4px)' } as const
const labelRowStyle = { display: 'flex', alignItems: 'center', gap: 'var(--dsw-spacing-2, 8px)' } as const
const labelStyle = { fontWeight: 'var(--dsw-font-weight-medium, 500)', fontSize: 'var(--dsw-font-size-sm, 13px)' } as const
const hintStyle = { color: 'var(--dsw-alias-fg-tertiary, #98a2b3)', fontSize: 'var(--dsw-font-size-xs, 12px)' } as const
const inputStyle = {
  padding: 'var(--dsw-spacing-2, 8px)',
  border: '1px solid var(--dsw-alias-border-primary, #d0d5dd)',
  borderRadius: 'var(--dsw-radius-md, 6px)',
  background: 'var(--dsw-alias-bg-primary, transparent)',
  color: 'inherit',
  font: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
} as const
const linkStyle = {
  color: 'var(--dsw-alias-fg-link, #2970ff)',
  fontSize: 'var(--dsw-font-size-xs, 12px)',
  textDecoration: 'none',
} as const
const badgeConfiguredStyle = {
  padding: '1px 8px',
  borderRadius: '9999px',
  fontSize: 'var(--dsw-font-size-xs, 12px)',
  color: 'var(--dsw-alias-fg-success, #067647)',
  background: 'var(--dsw-alias-bg-success-muted, rgba(23, 178, 106, 0.12))',
} as const
const badgeMissingStyle = {
  padding: '1px 8px',
  borderRadius: '9999px',
  fontSize: 'var(--dsw-font-size-xs, 12px)',
  color: 'var(--dsw-alias-fg-tertiary, #98a2b3)',
  background: 'var(--dsw-alias-bg-secondary, rgba(152, 162, 179, 0.16))',
} as const
const badgeWarnStyle = {
  padding: '1px 8px',
  borderRadius: '9999px',
  fontSize: 'var(--dsw-font-size-xs, 12px)',
  color: 'var(--dsw-alias-fg-warning, #b54708)',
  background: 'var(--dsw-alias-bg-warning-muted, rgba(247, 144, 9, 0.14))',
} as const
const actionsStyle = { display: 'flex', alignItems: 'center', gap: 'var(--dsw-spacing-2, 8px)' } as const
const primaryButtonStyle = {
  padding: 'var(--dsw-spacing-1, 4px) var(--dsw-spacing-3, 12px)',
  borderRadius: 'var(--dsw-radius-md, 6px)',
  border: '1px solid var(--dsw-alias-border-primary, #d0d5dd)',
  background: 'var(--dsw-alias-bg-brand, #2970ff)',
  color: 'var(--dsw-alias-fg-on-brand, #ffffff)',
  cursor: 'pointer',
} as const
const secondaryButtonStyle = {
  padding: 'var(--dsw-spacing-1, 4px) var(--dsw-spacing-3, 12px)',
  borderRadius: 'var(--dsw-radius-md, 6px)',
  border: '1px solid var(--dsw-alias-border-primary, #d0d5dd)',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
} as const
const messageStyle = { color: 'var(--dsw-alias-fg-secondary, #667085)', fontSize: 'var(--dsw-font-size-xs, 12px)' } as const
const detailStyle = { color: 'var(--dsw-alias-fg-error, #d92d20)', fontSize: 'var(--dsw-font-size-xs, 12px)' } as const
const warningBannerStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--dsw-spacing-1, 4px)',
  padding: 'var(--dsw-spacing-2, 8px) var(--dsw-spacing-3, 12px)',
  borderRadius: 'var(--dsw-radius-md, 6px)',
  border: '1px solid var(--dsw-alias-border-warning, #f79009)',
  background: 'var(--dsw-alias-bg-warning-muted, rgba(247, 144, 9, 0.10))',
  color: 'var(--dsw-alias-fg-warning, #b54708)',
  fontSize: 'var(--dsw-font-size-xs, 12px)',
} as const
/* jscpd:ignore-end */

/** Resolve the badge label for the key field from the current state. */
function badgeKey(state: CardState, configured: boolean): string {
  if (state.apiState === 'unavailable' || state.apiState === 'error') return 'keyUnknown'
  return configured ? 'keyConfigured' : 'keyMissing'
}

/** Resolve the badge style for the key field from the current state. */
function badgeStyle(state: CardState, configured: boolean): CSSProperties {
  if (state.apiState !== 'ok') return badgeWarnStyle
  return configured ? badgeConfiguredStyle : badgeMissingStyle
}

/**
 * The card's form. Registered as the section's single child item; receives the
 * store (as a hook), the save/reset actions, the locale translator, and the
 * field specs through the slot runtime's `inject` mechanism.
 */
function CardForm(props: CardFormProps): ReactElement {
  const state = props.useSearchProviderCard((s) => s)
  const [values, setValues] = useState<Record<string, string>>({})
  const setValue = (id: string, value: string) => setValues((prev) => ({ ...prev, [id]: value }))
  const apiDown = state.apiState === 'unavailable' || state.apiState === 'error'
  return (
    <div style={columnStyle}>
      <p style={descriptionStyle}>{props.t('description')}</p>
      {apiDown
        ? (
            <div style={warningBannerStyle}>
              <strong>{props.t('apiUnavailable')}</strong>
              <span>
                {state.apiState === 'error' && state.apiError !== undefined
                  ? `${props.t('keyCheckFailed')}: ${state.apiError}`
                  : props.t('apiUnavailableHint')}
              </span>
            </div>
          )
        : null}
      {props.fields.map((field) => (
        <div key={field.id} style={fieldStyle}>
          <div style={labelRowStyle}>
            <span style={labelStyle}>{props.t(field.id)}</span>
            {field.id === props.keyFieldId
              ? (
                  <span style={badgeStyle(state, state.keyConfigured)}>
                    {props.t(badgeKey(state, state.keyConfigured))}
                  </span>
                )
              : null}
          </div>
          {field.kind === 'select'
            ? (
                <select
                  style={inputStyle}
                  value={values[field.id] ?? ''}
                  onChange={(event) => setValue(field.id, event.target.value)}
                >
                  <option value="">{props.t(`${field.id}Default`)}</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )
            : (
                <input
                  style={inputStyle}
                  type={field.kind}
                  value={values[field.id] ?? ''}
                  placeholder={field.placeholder}
                  onChange={(event) => setValue(field.id, event.target.value)}
                />
              )}
          <span style={hintStyle}>{props.t(`${field.id}Hint`)}</span>
          {field.id === props.keyFieldId && props.keyConsoleUrl !== undefined
            ? (
                <a style={linkStyle} href={props.keyConsoleUrl} target="_blank" rel="noreferrer">
                  {props.t('getApiKey')}
                </a>
              )
            : null}
        </div>
      ))}
      <div style={actionsStyle}>
        <button
          type="button"
          style={primaryButtonStyle}
          disabled={state.saving || (state.apiState === 'ok' && !state.writable)}
          onClick={() => { void props.save(values) }}
        >
          {props.t(state.saving ? 'saving' : 'save')}
        </button>
        <button
          type="button"
          style={secondaryButtonStyle}
          disabled={state.saving || (state.apiState === 'ok' && !state.writable)}
          onClick={() => { void props.reset() }}
        >
          {props.t('reset')}
        </button>
        {state.message !== undefined ? <span style={messageStyle}>{props.t(state.message)}</span> : null}
      </div>
      {state.messageDetail !== undefined ? <span style={detailStyle}>{state.messageDetail}</span> : null}
      <p style={hintStyle}>{props.t('storageNote')}</p>
    </div>
  )
}

/**
 * Build the settings card for one search provider.
 *
 * @param config - the provider's card configuration.
 * @returns the client plugin fragments: `apply(ctx)` plus the required
 *   service `inject` list, ready to re-export from the client entry.
 */
export function createSearchProviderCard(config: SearchProviderCardConfig): {
  apply(ctx: ClientContext): void
  inject: string[]
} {
  const localeNs = `settings.plugins.${config.moduleKey}`
  const itemSlot = `settings.${config.moduleKey}.item`
  const keyField = config.fields.find((field) => field.id === config.keyFieldId)
  const keyRef = keyField?.refName ?? ''

  function apply(ctx: ClientContext): void {
    const api = ctx.get('connection')?.api
    const t = ctx.locale.bind(localeNs)

    let snapshot: CardState = {
      saving: false,
      message: undefined,
      messageDetail: undefined,
      keyConfigured: false,
      writable: true,
      apiState: 'unknown',
      apiError: undefined,
    }
    const listeners = new Set<() => void>()
    const store: CardStore = {
      getSnapshot: () => snapshot,
      subscribe: (listener) => {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
    }
    const setSnapshot = (patch: Partial<CardState>) => {
      snapshot = { ...snapshot, ...patch }
      for (const listener of listeners) listener()
    }

    /** Refresh the configured badge from the credentials service. */
    const refreshCredential = async () => {
      if (keyRef === '') return
      if (api?.credentials?.describe === undefined) {
        // The host does not expose the credentials API: be explicit instead of
        // silently showing "not configured" (which is misleading when a key
        // IS configured from a file).
        setSnapshot({ apiState: 'unavailable', apiError: undefined, keyConfigured: false, writable: false })
        return
      }
      setSnapshot({ apiState: 'unknown' })
      try {
        const response = await api.credentials.describe({ refs: [keyRef] })
        if (response.result?.ok === true) {
          const view = response.result.value?.credentials?.[keyRef]
          setSnapshot({
            apiState: 'ok',
            apiError: undefined,
            keyConfigured: view?.configured === true,
            writable: view?.writable !== false,
          })
        } else {
          setSnapshot({
            apiState: 'error',
            apiError: response.result?.error?.message ?? 'describe failed',
            keyConfigured: false,
            writable: false,
          })
        }
      } catch (error) {
        // Transient transport failure: surface it, but keep the previous badge state.
        setSnapshot({
          apiState: 'error',
          apiError: error instanceof Error ? error.message : String(error),
        })
      }
    }

    let messageTimer: ReturnType<typeof setTimeout> | undefined
    /** Show a transient status message; the persistent badge stays the source of truth. */
    const flash = (message: CardState['message'], detail?: string) => {
      setSnapshot({ saving: false, message, messageDetail: detail })
      if (messageTimer !== undefined) clearTimeout(messageTimer)
      if (message !== undefined) {
        messageTimer = setTimeout(() => setSnapshot({ message: undefined, messageDetail: undefined }), 4000)
      }
    }

    /** Store every non-blank staged value under its credential reference. */
    const save = async (values: Record<string, string>) => {
      if (api?.credentials?.set === undefined) {
        // No silent no-op: tell the user why the button did nothing and where to configure.
        flash('apiUnavailable', t('apiUnavailableHint'))
        return
      }
      setSnapshot({ saving: true, message: undefined, messageDetail: undefined })
      try {
        for (const field of config.fields) {
          const value = values[field.id]?.trim() ?? ''
          if (value.length === 0) continue
          const response = await api.credentials.set({ ref: field.refName, value })
          if (response.result?.ok !== true) {
            throw new Error(response.result?.error?.message ?? String(response.result?.error))
          }
        }
        flash('saved')
      } catch (error) {
        flash('saveFailed', error instanceof Error ? error.message : undefined)
      }
      await refreshCredential()
    }

    /** Remove every credential reference this card writes. */
    const reset = async () => {
      if (api?.credentials?.unset === undefined) {
        flash('resetUnavailable', t('apiUnavailableHint'))
        return
      }
      setSnapshot({ saving: true, message: undefined, messageDetail: undefined })
      for (const field of config.fields) {
        try {
          await api.credentials.unset({ ref: field.refName })
        } catch {
          // Keep resetting the remaining references.
        }
      }
      flash('resetDone')
      await refreshCredential()
    }

    const sectionLabel = () => t('title')
    const Section = ({ renderSlot }: { renderSlot: (name: string) => ReactNode }): ReactElement => (
      <div style={columnStyle}>{renderSlot(itemSlot)}</div>
    )

    ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section',
      id: config.sectionId,
      order: config.order,
      label: sectionLabel,
      locale: localeNs,
      children: { [itemSlot]: { kind: 'list', scope: 'root' } },
    }, Section))

    ctx.slots.inject(itemSlot, () => ctx.slots.register({
      name: itemSlot,
      id: `${config.moduleKey}-config`,
      order: 0,
      locale: localeNs,
      inject: () => ({
        hooks: { searchProviderCard: store },
        save,
        reset,
        t,
        fields: config.fields,
        keyFieldId: config.keyFieldId,
        keyConsoleUrl: config.keyConsoleUrl,
      }),
    }, CardForm))

    ctx.effect(() => ctx.locale.register(localeNs, config.dictionaries), `ui-plugins-${config.moduleKey}: card dictionaries`)
    ctx.effect(
      () => ctx.remote.$on('credentials/updated', (ref: string) => {
        if (ref === keyRef) void refreshCredential()
      }),
      `ui-plugins-${config.moduleKey}: credential invalidations`,
    )
    void refreshCredential()
  }

  return { apply, inject: ['slots', 'locale', 'connection', 'remote'] }
}
