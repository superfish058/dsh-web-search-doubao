# Contributing

Thanks for your interest in improving `dsh-web-search-doubao`!

## Architecture note

This package ships two halves. The **node half** registers a
`WebSearchProvider` into the `ctx.web` seam (`inject: ['web']`) and owns
nothing else — the `ctx.web` key belongs to `@deepseek-ai/dsh-web`, and the
model-facing tool lives in `@deepseek-ai/dsh-tool-web`. The **client half**
(`src/client/`) renders the "Web Search (Doubao)" settings card into the
harness GUI and stores values under credential references through the
credentials service. The two halves meet only at the credentials service;
the card factory is provider-agnostic by design — keep it that way.

## Setup

Requirements: Node.js 22.19+ (or 24+) and pnpm 10+ (Corepack-enabled).

```sh
pnpm install
```

There is no monorepo to clone — all dependencies (including the DSH seam
packages) install from npm.

## Build, check, test

```sh
pnpm typecheck   # tsc --noEmit (node + client halves)
pnpm build       # tsc: lib/*.js + lib/types/*.d.ts, then tsdown: wrapped lib/client.js
pnpm test        # node + client suites (57 tests); CI builds first so the
                 #   client-bundle smoke test runs against fresh output
```

The live-API smoke test self-skips unless a `DOUBAO_SEARCH_API_KEY` is present
in the environment:

```sh
DOUBAO_SEARCH_API_KEY=<your key> pnpm exec vitest run tests/doubao.e2e.ts
```

Note that `lib/*.js` is committed, so git installs work without a build step —
run `pnpm build` after touching `src/` and commit the result.

## Guidelines

- Match the existing code style: strict TypeScript, single quotes, no
  semicolons, 2-space indent.
- Keep the seam contract intact: errors must surface as `WebError` codes
  (`WEB_PROVIDER_ERROR`, `WEB_ABORTED`, `WEB_PROVIDER_CREDENTIAL_MISSING`),
  and cancellation must never be swallowed into a generic provider error.
- Add or update tests for behavior changes; the suite must stay green before
  opening a PR.
- Update both `README.md` and `README.zh.md` when user-facing behavior changes.
