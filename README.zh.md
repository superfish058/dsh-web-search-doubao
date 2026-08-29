# dsh-web-search-doubao

**为 DeepSeek Harness 提供由豆包搜索（火山引擎）驱动的网络搜索。**

[![CI](https://github.com/kenny2077/dsh-web-search-doubao/actions/workflows/ci.yml/badge.svg)](https://github.com/kenny2077/dsh-web-search-doubao/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/dsh-web-search-doubao)](https://www.npmjs.com/package/dsh-web-search-doubao)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | 中文

## 它是什么

`dsh-web-search-doubao` 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的社区插件，把[豆包搜索](https://www.volcengine.com/docs/82379/2309827)作为搜索提供方接入 harness 的 [`ctx.web` 能力接缝](https://github.com/deepseek-ai/deepseek-harness/blob/main/packages/web/web/README.md)。一条 `dsh plugin add`，你的 harness 即可通过字节跳动的独立豆包搜索 API 检索网络——无需修改基础 bundle，更改设置无需重启。

这不是方舟（Ark）聊天侧的联网内容插件：这里的一切都不经过豆包对话模型，搜索与模型推理完全解耦。

> 更偏好智谱/GLM？本插件有一个姊妹项目：[dsh-web-search-zai](https://github.com/kenny2077/dsh-web-search-zai)——面向 ZAI 独立网络搜索 API 的同一套提供方模式，设计语言一脉相承。

## 核心价值：独立于模型支出的搜索计费

- **计费独立。** 豆包搜索是独立服务、独立密钥：**每月 500 次免费搜索**，超出后按量后付费（`custom` 版亦可购买月度套餐）。搜索不消耗任何模型 token，费用不会与你的方舟/大模型账单混在一起。
- **字节系信源。** 后端与豆包 App 搜索同源，覆盖头条/抖音系公开内容——中文互联网覆盖出色，且发布时间可精确到秒（信源提供时）。
- **运行时可配置。** 服务版本、端点、摘要长度、权威度过滤都是普通配置项——提交后即在下一次搜索生效，无需重启。
- **贴合接缝而非绕开它。** 提供方以与内置 DeepSeek 提供方完全相同的方式注册进 `ctx.web`，[`dsh-tool-web`](https://github.com/deepseek-ai/deepseek-harness/blob/main/packages/web/tool-web/README.md) 及其上层全部原样工作。
- **不虚构字段。** 只映射 API 真正返回的内容——信源没有发布时间时，`publishedAt` 保持缺省。

## 工作原理

**搜索路径** —— 提供方以与内置 DeepSeek 提供方完全相同的方式注册进 `ctx.web`，`dsh-tool-web` 及其上层全部原样工作：

```
┌────────────────────────────────────────────────┐
│                DeepSeek Harness                │
│                                                │
│  model ──▶ web_search 工具 ──▶ ctx.web 接缝    │
└───────────────────────────────────────────┬────┘
                                            │
                                            ▼
                            ┌──────────────────────────────┐
DOUBAO_SEARCH_API_KEY ─────▶│      web-search-doubao       │
 （凭据存储——               │        （本插件）             │
  每次搜索时解析）          └───────────────┬──────────────┘
                                            │  POST {baseURL}/search_api/web_search
                                            ▼        或 /search_api/global_search
                            ┌──────────────────────────────┐
                            │   豆包搜索（火山引擎）        │
                            └───────────────┬──────────────┘
                                            │  Result.WebResults[] / Documents[]
                                            ▼
                              归一化的 WebSearchResult
                             （sources + truncated，
                              信源提供时含 publishedAt）
                            ──▶ 原样返回给你的模型
```

**设置路径** —— 本插件的独到之处：设置界面中的专属卡片，把取值存入凭据服务，任何密钥都不会进入配置文件：

```
┌────────────────────────────────────────────────────┐
│  设置界面 ──「网页搜索（豆包搜索）」卡片            │
│  API Key（掩码，附「获取 API Key ↗」控制台链接）   │
│  接口地址 · 服务版本 · 已配置徽标                  │
└───────────────────────┬────────────────────────────┘
                        │  保存 / 清空
                        ▼
        ┌────────────────────────────────────┐
        │  DSH 凭据服务                      │
        │  ~/.dsh/.credentials.yaml          │
        │   DOUBAO_SEARCH_API_KEY            │
        │   DOUBAO_SEARCH_BASE_URL           │
        │   DOUBAO_SEARCH_EDITION            │
        └────────────────────┬───────────────┘
                             │  每次搜索重新解析——
                             ▼  下一次搜索即生效，无需重启
                      上面的搜索路径
```

服务有两个版本，报文格式不同，由 `edition` 选择：

**`custom`**（默认——服务端遵循结果数）

| 豆包字段 | 接缝字段 | 说明 |
|---|---|---|
| `Url` | `url` | 缺失则丢弃该条 |
| `Title` | `title` | 为空则省略 |
| `Content` ‖ `Summary` ‖ `Snippet` | `snippet` | 取第一个非空；全空则丢弃该条 |
| `PublishTime` | `publishedAt` | 信源未提供时省略 |
| `SiteName`、`AuthInfoDes` | — | 不映射 |

**`global`**（更长的正文，结构化 `Parts[]`）

| 豆包字段 | 接缝字段 | 说明 |
|---|---|---|
| `Url` | `url` | 缺失则丢弃该条 |
| `Title` | `title` | 为空则省略 |
| `Parts[]`（`Type: "text"`） | `snippet` | 文本片段拼接；无则丢弃该条 |
| `DocumentInfo.PublishTime` | `publishedAt` | 缺失时省略 |
| `HostInfo`、`ContentTokenCount`、图片片段 | — | 不映射；不请求图片 |

失败以标准 `WebError` 码暴露：`WEB_PROVIDER_ERROR`（HTTP/网络/响应体异常）、`WEB_ABORTED`（取消）、`WEB_PROVIDER_CREDENTIAL_MISSING`（无密钥）。经由 `dsh-tool-web`，这些错误按消费方惯用的包装送达模型。

## 快速开始

需要已安装 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh` CLI 可用）和一个豆包搜索 API 密钥。

1. **获取密钥**：打开[豆包搜索控制台](https://console.volcengine.com/search-infinity/web-search-exp)，登录火山引擎账号，开通服务，然后创建 API Key。该密钥**与 `ARK_API_KEY` 相互独立**——只授权豆包搜索服务。每个账号每月 500 次免费额度；超出后在同一控制台开通按量付费。

   > 这*不是*火山方舟（Ark）控制台的密钥。方舟聊天侧联网搜索插件是另一个产品、另一套计费。

   请妥善保存密钥，避免写入配置文件——直接粘贴到 harness 设置界面中的**网页搜索（豆包搜索）**卡片（见[下文](#设置界面卡片)）、在 `$DSH_HOME/.credentials.yaml` 中添加 `DOUBAO_SEARCH_API_KEY` 条目，或通过启动环境变量提供。

2. **安装插件：**

   ```sh
   dsh plugin add dsh-web-search-doubao        # 来自 npm
   dsh plugin add github:kenny2077/dsh-web-search-doubao   # 来自 git（已预构建，无需构建步骤）
   ```

   `cordis.patch.yml` 覆盖层会注册提供方，并把激活的 `searchProvider` 从 `deepseek-official` 一步切换为 `doubao`。想换回去：`dsh plugin remove dsh-web-search-doubao`。

3. **搜索。** 问 harness 一件时效性强的事，观察 `web_search` 工具返回豆包搜索结果。

## 设置界面卡片

安装后，harness 设置侧边栏会新增**网页搜索（豆包搜索）**分区，包含三个字段——API Key（掩码输入，附可点击的**获取 API Key ↗**链接直达[豆包搜索控制台](https://console.volcengine.com/search-infinity/web-search-exp)）、接口地址、服务版本。**保存**会把它们写入 DSH 凭据服务（引用名分别为 `DOUBAO_SEARCH_API_KEY`、`DOUBAO_SEARCH_BASE_URL`、`DOUBAO_SEARCH_EDITION`）；**清空**会移除全部三个。API Key 旁的徽标在存入密钥后变为*已配置*，密钥变化时实时刷新。保存的值在下一次搜索即生效——无需重启。

卡片底部的存储说明标注了取值的实际去向，无需猜测：卡片保存的值 → `~/.dsh/.credentials.yaml`（凭据服务），**绝不**写入 `settings.yaml`；`settings.yaml` 中的 `web-search-doubao` 分区仅在你以文件方式编辑同一批字段时才会出现。

由于卡片以凭据引用存储取值，其优先级高于配置文件字段与环境变量：

| 优先级 | 来源 |
|---|---|
| 1 | 凭据服务（卡片写入的值） |
| 2 | `web-search-doubao` 设置（`apiKey`、`baseURL`、`edition`） |
| 3 | 环境变量（`DOUBAO_SEARCH_API_KEY`、`DOUBAO_SEARCH_BASE_URL`） |
| 4 | 内置默认值 |

`maxSnippetLength` 与 `authLevel` 仍仅通过配置文件设置（很少调整）。卡片本身由可复用、配置驱动的工厂（`src/client/card.tsx`）构建——未来的搜索密钥提供方（ZAI、Kimi、Qwen 等）可以用各自的引用与文案实例化同一个组件。

## 配置

所有字段均可通过设置界面（`web-search-doubao` 命名空间）在运行时修改；下一次搜索即生效。**网页搜索（豆包搜索）**设置卡片写入的凭据引用取值优先于下列所有字段——见[设置界面卡片](#设置界面卡片)。

| 键 | 默认值 | 含义 |
|---|---|---|
| `apiKey` | （来自凭据存储） | 字面量豆包搜索 API 密钥。建议用 `apiKeyEnv`，避免密钥进入配置文件。 |
| `apiKeyEnv` | `DOUBAO_SEARCH_API_KEY` | 每次搜索时解析的凭据引用。 |
| `baseURL` | `https://open.feedcoopapi.com` | 端点基址；按版本追加 `/search_api/web_search` 或 `/search_api/global_search`。 |
| `edition` | `custom` | `custom` 版服务端遵循请求结果数；`global` 版返回更长的正文。 |
| `maxSnippetLength` | （未设置） | 仅 `global` 版：单条正文摘要的最大字符数（`max_snippet_length`）。 |
| `authLevel` | （未设置） | 仅 `custom` 版：信源权威度下限 1–4（`Filter.AuthInfoLevel`；1 = 政府/头部机构）。 |

## 已知限制

- 没有链接或正文的条目会被丢弃，因此返回的条目可能少于请求数。
- `global` 版无论请求数量多少可能只返回约 10 条（服务端上限）；`custom` 版遵循 `Count`。无论哪种，接缝都会在返回时执行 `maxResults` 截断。
- 无时间窗口过滤——API 未提供公开的服务端 recency 参数。
- 仅当上游信源提供发布时间时才有 `publishedAt`。
- 从不请求图片（`max_image_count_per_doc` 保持未设置）；接缝没有图片字段。
- 只有名为 `AbortError` 的 `DOMException` 映射为 `WEB_ABORTED`；携带自定义原因的中断会表现为 `WEB_PROVIDER_ERROR`。
- 未实现聊天侧联网内容插件变体（方舟 `web_search` 工具 / Bot 端点）；本插件仅使用独立搜索 API。

## 仓库架构

一个包，两半：**node 半**对接 `ctx.web` 接缝；**client 半**在 harness 界面中渲染设置卡片。两者只在凭据服务处交汇。

```
dsh-web-search-doubao/
├── src/                          # ── 发布源码 ──
│   ├── index.ts                  #     node 入口：Config 模式、设置分区、
│   │                             #       凭据链解析、apply()
│   ├── provider.ts               #     DoubaoSearchProvider：每次搜索的选项快照
│   │                             #       + 凭据覆盖、两个版本的请求/响应映射、
│   │                             #       WebError 纪律
│   ├── types.ts                  #     两个豆包搜索版本的报文类型
│   ├── invariant.ts              #     包自有 invariant 伴随插件（no-op）
│   └── client/                   # ── 设置卡片半（浏览器 bundle）──
│       ├── card.tsx              #     createSearchProviderCard()：可复用、
│       │                         #       与提供方无关的卡片工厂
│       └── index.tsx             #     豆包实例化：凭据引用、控制台链接、
│                                 #       中英文文案
├── tests/
│   ├── doubao.spec.ts            #     node 套件：映射、请求、错误、注册、
│   │                             #       凭据优先级
│   ├── doubao.e2e.ts             #     真实 API 冒烟（无密钥自动跳过）
│   └── client-card.spec.ts       #     卡片套件：基于伪上下文的保存/清空/徽标
│                                 #       流程 + 构建产物的 ModuleLoader 加载冒烟
├── lib/                          # ── 构建产物（入库：git 安装无需构建）──
│   ├── index.js                  #     node 入口（ESM，tsc）
│   ├── client.js                 #     设置卡片（浏览器 bundle，tsdown），按壳的
│   │                             #       window.__ModuleLoader__ 约定包装
│   └── types/                    #     类型声明
├── cordis.patch.yml              # 安装覆盖层：一条 `dsh plugin add` 同时注册提供方
│                                 #   并选中 searchProvider: doubao
├── tsconfig.json                 # 严格 TS、ES2024 ESM、client 半使用 react-jsx
├── tsdown.config.ts              # client 构建配方（ModuleLoader 包装、react 外置）
├── vitest.config.ts
└── .github/workflows/ci.yml      # typecheck + build + test，node 22/24 × Linux/Windows
```

## 开发

```sh
pnpm install     # 全部依赖（包括 DSH 接缝包）均来自 npm
pnpm typecheck   # tsc --noEmit
pnpm build       # 产出 lib/*.js + lib/types/*.d.ts
pnpm test        # 单元测试
```

在线冒烟测试在没有密钥时自动跳过：

```sh
DOUBAO_SEARCH_API_KEY=<密钥> pnpm exec vitest run tests/doubao.e2e.ts
```

贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT](LICENSE)
