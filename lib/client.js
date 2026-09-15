window.__ModuleLoader__.load({
	id: "dsh-web-search-doubao",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/card.tsx
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
		const columnStyle = {
			display: "flex",
			flexDirection: "column",
			gap: "var(--dsw-spacing-3, 12px)"
		};
		const descriptionStyle = {
			margin: 0,
			color: "var(--dsw-alias-fg-secondary, #667085)",
			fontSize: "var(--dsw-font-size-sm, 13px)"
		};
		const fieldStyle = {
			display: "flex",
			flexDirection: "column",
			gap: "var(--dsw-spacing-1, 4px)"
		};
		const labelRowStyle = {
			display: "flex",
			alignItems: "center",
			gap: "var(--dsw-spacing-2, 8px)"
		};
		const labelStyle = {
			fontWeight: "var(--dsw-font-weight-medium, 500)",
			fontSize: "var(--dsw-font-size-sm, 13px)"
		};
		const hintStyle = {
			color: "var(--dsw-alias-fg-tertiary, #98a2b3)",
			fontSize: "var(--dsw-font-size-xs, 12px)"
		};
		const inputStyle = {
			padding: "var(--dsw-spacing-2, 8px)",
			border: "1px solid var(--dsw-alias-border-primary, #d0d5dd)",
			borderRadius: "var(--dsw-radius-md, 6px)",
			background: "var(--dsw-alias-bg-primary, transparent)",
			color: "inherit",
			font: "inherit",
			width: "100%",
			boxSizing: "border-box"
		};
		const linkStyle = {
			color: "var(--dsw-alias-fg-link, #2970ff)",
			fontSize: "var(--dsw-font-size-xs, 12px)",
			textDecoration: "none"
		};
		const badgeConfiguredStyle = {
			padding: "1px 8px",
			borderRadius: "9999px",
			fontSize: "var(--dsw-font-size-xs, 12px)",
			color: "var(--dsw-alias-fg-success, #067647)",
			background: "var(--dsw-alias-bg-success-muted, rgba(23, 178, 106, 0.12))"
		};
		const badgeMissingStyle = {
			padding: "1px 8px",
			borderRadius: "9999px",
			fontSize: "var(--dsw-font-size-xs, 12px)",
			color: "var(--dsw-alias-fg-tertiary, #98a2b3)",
			background: "var(--dsw-alias-bg-secondary, rgba(152, 162, 179, 0.16))"
		};
		const badgeWarnStyle = {
			padding: "1px 8px",
			borderRadius: "9999px",
			fontSize: "var(--dsw-font-size-xs, 12px)",
			color: "var(--dsw-alias-fg-warning, #b54708)",
			background: "var(--dsw-alias-bg-warning-muted, rgba(247, 144, 9, 0.14))"
		};
		const actionsStyle = {
			display: "flex",
			alignItems: "center",
			gap: "var(--dsw-spacing-2, 8px)"
		};
		const primaryButtonStyle = {
			padding: "var(--dsw-spacing-1, 4px) var(--dsw-spacing-3, 12px)",
			borderRadius: "var(--dsw-radius-md, 6px)",
			border: "1px solid var(--dsw-alias-border-primary, #d0d5dd)",
			background: "var(--dsw-alias-bg-brand, #2970ff)",
			color: "var(--dsw-alias-fg-on-brand, #ffffff)",
			cursor: "pointer"
		};
		const secondaryButtonStyle = {
			padding: "var(--dsw-spacing-1, 4px) var(--dsw-spacing-3, 12px)",
			borderRadius: "var(--dsw-radius-md, 6px)",
			border: "1px solid var(--dsw-alias-border-primary, #d0d5dd)",
			background: "transparent",
			color: "inherit",
			cursor: "pointer"
		};
		const messageStyle = {
			color: "var(--dsw-alias-fg-secondary, #667085)",
			fontSize: "var(--dsw-font-size-xs, 12px)"
		};
		const detailStyle = {
			color: "var(--dsw-alias-fg-error, #d92d20)",
			fontSize: "var(--dsw-font-size-xs, 12px)"
		};
		const warningBannerStyle = {
			display: "flex",
			flexDirection: "column",
			gap: "var(--dsw-spacing-1, 4px)",
			padding: "var(--dsw-spacing-2, 8px) var(--dsw-spacing-3, 12px)",
			borderRadius: "var(--dsw-radius-md, 6px)",
			border: "1px solid var(--dsw-alias-border-warning, #f79009)",
			background: "var(--dsw-alias-bg-warning-muted, rgba(247, 144, 9, 0.10))",
			color: "var(--dsw-alias-fg-warning, #b54708)",
			fontSize: "var(--dsw-font-size-xs, 12px)"
		};
		/** Resolve the badge label for the key field from the current state. */
		function badgeKey(state, configured) {
			if (state.apiState === "unavailable" || state.apiState === "error") return "keyUnknown";
			return configured ? "keyConfigured" : "keyMissing";
		}
		/** Resolve the badge style for the key field from the current state. */
		function badgeStyle(state, configured) {
			if (state.apiState !== "ok") return badgeWarnStyle;
			return configured ? badgeConfiguredStyle : badgeMissingStyle;
		}
		/**
		* The card's form. Registered as the section's single child item; receives the
		* store (as a hook), the save/reset actions, the locale translator, and the
		* field specs through the slot runtime's `inject` mechanism.
		*/
		function CardForm(props) {
			const state = props.useSearchProviderCard((s) => s);
			const [values, setValues] = (0, react.useState)({});
			const setValue = (id, value) => setValues((prev) => ({
				...prev,
				[id]: value
			}));
			const apiDown = state.apiState === "unavailable" || state.apiState === "error";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: columnStyle,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: descriptionStyle,
						children: props.t("description")
					}),
					apiDown ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: warningBannerStyle,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: props.t("apiUnavailable") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: state.apiState === "error" && state.apiError !== void 0 ? `${props.t("keyCheckFailed")}: ${state.apiError}` : props.t("apiUnavailableHint") })]
					}) : null,
					props.fields.map((field) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: fieldStyle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: labelRowStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: labelStyle,
									children: props.t(field.id)
								}), field.id === props.keyFieldId ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: badgeStyle(state, state.keyConfigured),
									children: props.t(badgeKey(state, state.keyConfigured))
								}) : null]
							}),
							field.kind === "select" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								style: inputStyle,
								value: values[field.id] ?? "",
								onChange: (event) => setValue(field.id, event.target.value),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: props.t(`${field.id}Default`)
								}), field.options?.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: option,
									children: option
								}, option))]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								style: inputStyle,
								type: field.kind,
								value: values[field.id] ?? "",
								placeholder: field.placeholder,
								onChange: (event) => setValue(field.id, event.target.value)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: hintStyle,
								children: props.t(`${field.id}Hint`)
							}),
							field.id === props.keyFieldId && props.keyConsoleUrl !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								style: linkStyle,
								href: props.keyConsoleUrl,
								target: "_blank",
								rel: "noreferrer",
								children: props.t("getApiKey")
							}) : null
						]
					}, field.id)),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: actionsStyle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: primaryButtonStyle,
								disabled: state.saving || state.apiState === "ok" && !state.writable,
								onClick: () => {
									props.save(values);
								},
								children: props.t(state.saving ? "saving" : "save")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: secondaryButtonStyle,
								disabled: state.saving || state.apiState === "ok" && !state.writable,
								onClick: () => {
									props.reset();
								},
								children: props.t("reset")
							}),
							state.message !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: messageStyle,
								children: props.t(state.message)
							}) : null
						]
					}),
					state.messageDetail !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: detailStyle,
						children: state.messageDetail
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: hintStyle,
						children: props.t("storageNote")
					})
				]
			});
		}
		/**
		* Build the settings card for one search provider.
		*
		* @param config - the provider's card configuration.
		* @returns the client plugin fragments: `apply(ctx)` plus the required
		*   service `inject` list, ready to re-export from the client entry.
		*/
		function createSearchProviderCard(config) {
			const localeNs = `settings.plugins.${config.moduleKey}`;
			const itemSlot = `settings.${config.moduleKey}.item`;
			const keyRef = config.fields.find((field) => field.id === config.keyFieldId)?.refName ?? "";
			function apply(ctx) {
				const api = ctx.get("connection")?.api;
				const t = ctx.locale.bind(localeNs);
				let snapshot = {
					saving: false,
					message: void 0,
					messageDetail: void 0,
					keyConfigured: false,
					writable: true,
					apiState: "unknown",
					apiError: void 0
				};
				const listeners = /* @__PURE__ */ new Set();
				const store = {
					getSnapshot: () => snapshot,
					subscribe: (listener) => {
						listeners.add(listener);
						return () => {
							listeners.delete(listener);
						};
					}
				};
				const setSnapshot = (patch) => {
					snapshot = {
						...snapshot,
						...patch
					};
					for (const listener of listeners) listener();
				};
				/** Refresh the configured badge from the credentials service. */
				const refreshCredential = async () => {
					if (keyRef === "") return;
					if (api?.credentials?.describe === void 0) {
						setSnapshot({
							apiState: "unavailable",
							apiError: void 0,
							keyConfigured: false,
							writable: false
						});
						return;
					}
					setSnapshot({ apiState: "unknown" });
					try {
						const response = await api.credentials.describe({ refs: [keyRef] });
						if (response.result?.ok === true) {
							const view = response.result.value?.credentials?.[keyRef];
							setSnapshot({
								apiState: "ok",
								apiError: void 0,
								keyConfigured: view?.configured === true,
								writable: view?.writable !== false
							});
						} else setSnapshot({
							apiState: "error",
							apiError: response.result?.error?.message ?? "describe failed",
							keyConfigured: false,
							writable: false
						});
					} catch (error) {
						setSnapshot({
							apiState: "error",
							apiError: error instanceof Error ? error.message : String(error)
						});
					}
				};
				let messageTimer;
				/** Show a transient status message; the persistent badge stays the source of truth. */
				const flash = (message, detail) => {
					setSnapshot({
						saving: false,
						message,
						messageDetail: detail
					});
					if (messageTimer !== void 0) clearTimeout(messageTimer);
					if (message !== void 0) messageTimer = setTimeout(() => setSnapshot({
						message: void 0,
						messageDetail: void 0
					}), 4e3);
				};
				/** Store every non-blank staged value under its credential reference. */
				const save = async (values) => {
					if (api?.credentials?.set === void 0) {
						flash("apiUnavailable", t("apiUnavailableHint"));
						return;
					}
					setSnapshot({
						saving: true,
						message: void 0,
						messageDetail: void 0
					});
					try {
						for (const field of config.fields) {
							const value = values[field.id]?.trim() ?? "";
							if (value.length === 0) continue;
							const response = await api.credentials.set({
								ref: field.refName,
								value
							});
							if (response.result?.ok !== true) throw new Error(response.result?.error?.message ?? String(response.result?.error));
						}
						flash("saved");
					} catch (error) {
						flash("saveFailed", error instanceof Error ? error.message : void 0);
					}
					await refreshCredential();
				};
				/** Remove every credential reference this card writes. */
				const reset = async () => {
					if (api?.credentials?.unset === void 0) {
						flash("resetUnavailable", t("apiUnavailableHint"));
						return;
					}
					setSnapshot({
						saving: true,
						message: void 0,
						messageDetail: void 0
					});
					for (const field of config.fields) try {
						await api.credentials.unset({ ref: field.refName });
					} catch {}
					flash("resetDone");
					await refreshCredential();
				};
				const sectionLabel = () => t("title");
				const Section = ({ renderSlot }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: columnStyle,
					children: renderSlot(itemSlot)
				});
				ctx.slots.inject("settings.section", () => ctx.slots.register({
					name: "settings.section",
					id: config.sectionId,
					order: config.order,
					label: sectionLabel,
					locale: localeNs,
					children: { [itemSlot]: {
						kind: "list",
						scope: "root"
					} }
				}, Section));
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
						keyConsoleUrl: config.keyConsoleUrl
					})
				}, CardForm));
				ctx.effect(() => ctx.locale.register(localeNs, config.dictionaries), `ui-plugins-${config.moduleKey}: card dictionaries`);
				ctx.effect(() => ctx.remote.$on("credentials/updated", (ref) => {
					if (ref === keyRef) refreshCredential();
				}), `ui-plugins-${config.moduleKey}: credential invalidations`);
				refreshCredential();
			}
			return {
				apply,
				inject: [
					"slots",
					"locale",
					"connection",
					"remote"
				]
			};
		}
		//#endregion
		//#region src/client/index.tsx
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
		const card = createSearchProviderCard({
			moduleKey: "doubao",
			sectionId: "doubao-web-search",
			order: 20,
			keyFieldId: "apiKey",
			keyConsoleUrl: "https://console.volcengine.com/search-infinity/api-key",
			fields: [
				{
					id: "apiKey",
					refName: "DOUBAO_SEARCH_API_KEY",
					kind: "password",
					placeholder: "Doubao Search API key"
				},
				{
					id: "baseURL",
					refName: "DOUBAO_SEARCH_BASE_URL",
					kind: "text",
					placeholder: "https://open.feedcoopapi.com"
				},
				{
					id: "edition",
					refName: "DOUBAO_SEARCH_EDITION",
					kind: "select",
					options: ["custom", "global"]
				}
			],
			dictionaries: {
				en: {
					title: "Web Search (Doubao)",
					description: "Doubao Search (Volcengine 豆包搜索) provider. Values are stored by the DSH credentials service; leave a field blank to keep its current value.",
					apiKey: "API key",
					apiKeyHint: "Your Doubao Search API key from the Volcengine console. Leave blank to keep the current key.",
					baseURL: "Base URL",
					baseURLHint: "Leave blank for https://open.feedcoopapi.com.",
					edition: "Edition",
					editionHint: "custom honors the result count; global returns document parts.",
					editionDefault: "(default: custom)",
					getApiKey: "Get an API key ↗",
					keyConfigured: "configured",
					keyMissing: "not configured",
					keyUnknown: "status unknown",
					keyCheckFailed: "status check failed",
					apiUnavailable: "Credentials API unavailable",
					apiUnavailableHint: "This host does not expose the credentials API (api.credentials) to plugins, so the key cannot be saved or detected from this card. Configure it from a file instead: write the key to refs.DOUBAO_SEARCH_API_KEY in ~/.dsh/.credentials.yaml, or set web-search-doubao.apiKey in settings.yaml.",
					save: "Save",
					saving: "Saving…",
					reset: "Reset",
					saved: "Saved.",
					saveFailed: "Save failed.",
					resetDone: "Cleared.",
					resetUnavailable: "Cannot clear.",
					storageNote: "Where things live: values saved here go to the DSH credentials service (~/.dsh/.credentials.yaml) — never into settings.yaml. The web-search-doubao section in settings.yaml is only for file-based edits of the same fields."
				},
				zh: {
					title: "网页搜索（豆包搜索）",
					description: "豆包搜索（火山引擎）提供方。取值由 DSH 凭据服务保存；留空表示保留当前值。",
					apiKey: "API Key",
					apiKeyHint: "在火山引擎控制台创建的豆包搜索 API Key。留空表示保留当前 Key。",
					baseURL: "接口地址",
					baseURLHint: "留空使用 https://open.feedcoopapi.com。",
					edition: "服务版本",
					editionHint: "custom 版本支持结果数上限；global 版本返回文档分片。",
					editionDefault: "（默认：custom）",
					getApiKey: "获取 API Key ↗",
					keyConfigured: "已配置",
					keyMissing: "未配置",
					keyUnknown: "状态未知",
					keyCheckFailed: "状态检测失败",
					apiUnavailable: "凭据接口不可用",
					apiUnavailableHint: "当前宿主未向本插件暴露 credentials 读写接口（api.credentials 不可用），因此无法在界面保存或检测密钥。请改用文件方式配置：将密钥写入 ~/.dsh/.credentials.yaml 的 refs.DOUBAO_SEARCH_API_KEY，或在 settings.yaml 的 web-search-doubao.apiKey 直接填写。",
					save: "保存",
					saving: "保存中…",
					reset: "清空",
					saved: "已保存。",
					saveFailed: "保存失败。",
					resetDone: "已清空。",
					resetUnavailable: "无法清空。",
					storageNote: "存储说明：此处保存的取值写入 DSH 凭据服务（~/.dsh/.credentials.yaml）——不会写入 settings.yaml。settings.yaml 中的 web-search-doubao 分区仅用于以文件方式编辑同一批字段。"
				}
			}
		});
		/** Client plugin entry; the shell loads this bundle and calls `apply(ctx)`. */
		const apply = card.apply;
		/** Services the shell must supply to `apply`. */
		const inject = card.inject;
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map