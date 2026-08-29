/**
 * Client-half build: `src/client/index.tsx` → `lib/client.js`, a CJS-style
 * bundle wrapped for the harness shell's `window.__ModuleLoader__` handoff
 * (module id: the package name). Same recipe as dsh-web-search-anysearch's
 * published client bundle: the banner also declares the `module`/`exports`
 * shim the wrapper body expects. The node half stays with `tsc --build`;
 * `clean` is off because this config runs after tsc in the build script.
 */
import { defineConfig } from 'tsdown'

/** Modules resolved by the shell's platform module table at `require()` time. */
const PLATFORM_MODULES = ['react', 'react/jsx-runtime']

export default defineConfig({
  entry: ['src/client/index.tsx'],
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  deps: { neverBundle: PLATFORM_MODULES },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: [
      'window.__ModuleLoader__.load({',
      '\tid: "dsh-web-search-doubao",',
      '\tfactory: (require) => {',
      '\t\tvar module = { exports: {} };',
      '\t\tvar exports = module.exports;',
    ].join('\n'),
    footer: '\n\t\treturn module.exports;\n\t}\n});',
  },
  dts: false,
  sourcemap: true,
  clean: false,
})
