/**
 * `dsh-web-search-doubao`: registers a Doubao Search (Volcengine 豆包搜索)-backed
 * `WebSearchProvider` with `ctx.web`. A function/namespace plugin
 * (`inject: ['web']`), not a default-export service — it registers into the
 * seam's provider registry rather than owning the `ctx.web` key (which
 * belongs to `@deepseek-ai/dsh-web`).
 *
 * @module dsh-web-search-doubao
 */
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment';
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings';
import z from '@deepseek-ai/schemastery';
import { DoubaoSearchProvider, DOUBAO_DEFAULT_BASE_URL, DOUBAO_DEFAULT_EDITION, } from "./provider.js";
export { DOUBAO_DEFAULT_BASE_URL, DOUBAO_DEFAULT_EDITION, DOUBAO_PROVIDER_ID, DoubaoSearchProvider, } from "./provider.js";
/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-doubao';
/** The web seam this provider registers into. */
export const inject = ['web'];
const DEFAULT_API_KEY_ENV = 'DOUBAO_SEARCH_API_KEY';
/** Environment variable naming this provider's endpoint (distinct from Ark chat adapter's). */
const SEARCH_BASE_URL_ENV = 'DOUBAO_SEARCH_BASE_URL';
/**
 * Credential reference holding a GUI-stored edition override (`global` |
 * `custom`), written by the settings card's edition dropdown.
 */
const SEARCH_EDITION_REF = 'DOUBAO_SEARCH_EDITION';
export const Config = z.object({
    apiKey: z.string().role('secret'),
    apiKeyEnv: z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV),
    baseURL: z.string(),
    edition: z.union(['global', 'custom']).default(DOUBAO_DEFAULT_EDITION),
    maxSnippetLength: z.number(),
    authLevel: z.union([1, 2, 3, 4]),
});
/** Settings namespace carrying this provider's endpoint, edition, and key reference. */
export const WEB_SEARCH_DOUBAO_SETTINGS_NAMESPACE = settingsNamespace('web-search-doubao');
/**
 * Project one resolved section into the provider's options. Env-var fallbacks
 * live here, not in the provider, so everything it reads is fully defaulted.
 *
 * Values stored under credential references — the settings-GUI card's writes —
 * are resolved per search by the returned `resolve` hook and win over the
 * literal/env fallbacks below: credential service → config → environment →
 * constant default.
 *
 * @param ctx - plugin context supplying the credential and environment planes.
 * @param config - the currently authoritative section.
 * @returns options for one search.
 */
function resolveOptions(ctx, config) {
    const apiKeyEnv = credentialRef(config.apiKeyEnv ?? DEFAULT_API_KEY_ENV);
    const literalApiKey = config.apiKey !== undefined && config.apiKey.length > 0
        ? config.apiKey
        : undefined;
    return {
        ...literalApiKey === undefined ? {} : { apiKey: literalApiKey },
        resolveApiKey: async () => {
            // Credential-service values are merged by `resolve` below; this callback
            // is the launching-environment fallback.
            const ambient = launchEnvironmentOf(ctx).get(apiKeyEnv);
            return ambient !== undefined && ambient.value.length > 0 ? ambient.value : undefined;
        },
        apiKeyEnv,
        baseURL: config.baseURL
            ?? launchEnvironmentOf(ctx).get(SEARCH_BASE_URL_ENV)?.value
            ?? DOUBAO_DEFAULT_BASE_URL,
        edition: config.edition ?? DOUBAO_DEFAULT_EDITION,
        resolve: async () => {
            const credentials = ctx.get('credentials');
            if (credentials === undefined)
                return {};
            const stored = async (ref) => {
                const value = (await credentials.resolve(credentialRef(ref)))?.value;
                return value !== undefined && value.length > 0 ? value : undefined;
            };
            const [apiKey, baseURL, edition] = await Promise.all([
                stored(config.apiKeyEnv ?? DEFAULT_API_KEY_ENV),
                stored(SEARCH_BASE_URL_ENV),
                stored(SEARCH_EDITION_REF),
            ]);
            return {
                ...apiKey === undefined ? {} : { apiKey },
                ...baseURL === undefined ? {} : { baseURL },
                ...edition === 'global' || edition === 'custom' ? { edition } : {},
            };
        },
        ...config.maxSnippetLength !== undefined ? { maxSnippetLength: config.maxSnippetLength } : {},
        ...config.authLevel !== undefined ? { authLevel: config.authLevel } : {},
    };
}
/** Register the Doubao Search provider with `ctx.web`. */
export function apply(ctx, config) {
    let current = () => config;
    installSettingsSection(ctx, WEB_SEARCH_DOUBAO_SETTINGS_NAMESPACE, Config, config, {
        setSource: (source) => {
            current = source;
        },
        // No onChange: the provider re-projects the section per search.
        onChange: () => { },
    });
    ctx.web.registerSearchProvider(new DoubaoSearchProvider(() => resolveOptions(ctx, current())));
}
//# sourceMappingURL=index.js.map