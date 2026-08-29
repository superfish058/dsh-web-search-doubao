/**
 * Browser half of `dsh-web-search-doubao`.
 *
 * Registers an independent "Web Search (Doubao)" settings section into the
 * harness shell's settings sidebar. The card stores the Doubao Search API key,
 * endpoint base, and edition under credential references through the DSH
 * credentials service — the same references the node half resolves per search —
 * so a saved key takes effect on the next search without a restart, and no
 * secret ever lands in settings documents.
 *
 * Built by tsdown into `lib/client.js`, wrapped for the shell's
 * `window.__ModuleLoader__` handoff (module id: the package name).
 *
 * @module dsh-web-search-doubao/client
 */

import { createSearchProviderCard } from './card.tsx'
import type { CardFieldSpec } from './card.tsx'

/** The card's fields, keyed to the credential references the node half reads. */
const fields = [
  { id: 'apiKey', refName: 'DOUBAO_SEARCH_API_KEY', kind: 'password', placeholder: 'Doubao Search API key' },
  { id: 'baseURL', refName: 'DOUBAO_SEARCH_BASE_URL', kind: 'text', placeholder: 'https://open.feedcoopapi.com' },
  { id: 'edition', refName: 'DOUBAO_SEARCH_EDITION', kind: 'select', options: ['custom', 'global'] },
] as const satisfies readonly CardFieldSpec[]

const en: Record<string, string> = {
  title: 'Web Search (Doubao)',
  description: 'Doubao Search (Volcengine 豆包搜索) provider. Values are stored by the DSH'
    + ' credentials service; leave a field blank to keep its current value.',
  apiKey: 'API key',
  apiKeyHint: 'Your Doubao Search API key from the Volcengine console.'
    + ' Leave blank to keep the current key.',
  baseURL: 'Base URL',
  baseURLHint: 'Leave blank for https://open.feedcoopapi.com.',
  edition: 'Edition',
  editionHint: 'custom honors the result count; global returns document parts.',
  editionDefault: '(default: custom)',
  getApiKey: 'Get an API key ↗',
  keyConfigured: 'configured',
  keyMissing: 'not configured',
  save: 'Save',
  saving: 'Saving…',
  reset: 'Reset',
  saved: 'Saved.',
  saveFailed: 'Save failed.',
  resetDone: 'Cleared.',
  storageNote: 'Where things live: values saved here go to the DSH credentials service'
    + ' (~/.dsh/.credentials.yaml) — never into settings.yaml. The web-search-doubao'
    + ' section in settings.yaml is only for file-based edits of the same fields.',
}

const zh: Record<string, string> = {
  title: '网页搜索（豆包搜索）',
  description: '豆包搜索（火山引擎）提供方。取值由 DSH 凭据服务保存；留空表示保留当前值。',
  apiKey: 'API Key',
  apiKeyHint: '在火山引擎控制台创建的豆包搜索 API Key。留空表示保留当前 Key。',
  baseURL: '接口地址',
  baseURLHint: '留空使用 https://open.feedcoopapi.com。',
  edition: '服务版本',
  editionHint: 'custom 版本支持结果数上限；global 版本返回文档分片。',
  editionDefault: '（默认：custom）',
  getApiKey: '获取 API Key ↗',
  keyConfigured: '已配置',
  keyMissing: '未配置',
  save: '保存',
  saving: '保存中…',
  reset: '清空',
  saved: '已保存。',
  saveFailed: '保存失败。',
  resetDone: '已清空。',
  storageNote: '存储说明：此处保存的取值写入 DSH 凭据服务（~/.dsh/.credentials.yaml）——'
    + '不会写入 settings.yaml。settings.yaml 中的 web-search-doubao 分区仅用于以文件方式编辑同一批字段。',
}

const card = createSearchProviderCard({
  moduleKey: 'doubao',
  sectionId: 'doubao-web-search',
  order: 20,
  keyFieldId: 'apiKey',
  keyConsoleUrl: 'https://console.volcengine.com/search-infinity/web-search-exp',
  fields,
  dictionaries: { en, zh },
})

/** Client plugin entry; the shell loads this bundle and calls `apply(ctx)`. */
export const apply = card.apply
/** Services the shell must supply to `apply`. */
export const inject = card.inject
