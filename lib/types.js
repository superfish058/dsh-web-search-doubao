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
export {};
//# sourceMappingURL=types.js.map