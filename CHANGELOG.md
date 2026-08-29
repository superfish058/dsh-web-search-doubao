# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-08-29

- Settings card signposting: a clickable "Get an API key ↗" link to the Doubao
  Search console next to the key field, and a storage-map footer — card values
  go to `~/.dsh/.credentials.yaml` (the credentials service), never into
  `settings.yaml`; that file's `web-search-doubao` section is only for
  file-based edits of the same fields.
- Card polish: full-width inputs/selects with inherited shell font.
- Repo polish: sibling-plugin cross-link (`dsh-web-search-zai`), sharpened npm
  description and keywords, GitHub About strings and topic list in the
  marketplace prep.

## [0.2.0] - 2026-08-29

- Settings GUI card ("Web Search (Doubao)"): paste the Doubao Search API key (plus base
  URL and edition) in the harness settings sidebar. Values are stored under credential
  references through the DSH credentials service — never in settings documents — with a
  live configured badge, save/reset, and en/zh locales.
- Credential-service values (`DOUBAO_SEARCH_API_KEY`, `DOUBAO_SEARCH_BASE_URL`,
  `DOUBAO_SEARCH_EDITION`) now win over settings-file fields and environment variables,
  resolved per search.
- The card is instantiated from a reusable config-driven factory (`src/client/card.tsx`)
  so future search-key providers can adopt the same pattern; the client half ships as a
  tsdown-built `lib/client.js` bundle for the shell's `__ModuleLoader__`.

## [0.1.0] - 2026-08-29

First public release.

- Doubao Search (Volcengine 豆包搜索) web search provider for the DeepSeek
  Harness `ctx.web` seam, backed by the standalone search API
  (`POST /search_api/web_search`, `POST /search_api/global_search`).
- Key resolves from the managed credentials store (`DOUBAO_SEARCH_API_KEY`),
  the launch environment, or a literal `apiKey` in config — independent of any
  Ark (`ARK_API_KEY`) credential, with its own 500-free-searches-per-month
  billing.
- Runtime-configurable settings section (`web-search-doubao`): endpoint,
  edition (`custom`/`global`), snippet length, and authority filter take
  effect on the next search, no restart.
- `publishedAt` mapped from the API's publish time — present whenever the
  upstream source provides one.
- `cordis.patch.yml` overlay registers the provider and selects it as the
  active `searchProvider` in one `dsh plugin add`.
- Unit suite plus a live-API smoke test that self-skips without
  `DOUBAO_SEARCH_API_KEY`.
