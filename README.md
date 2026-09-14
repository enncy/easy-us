# easy-us

> **easy user-script framework** —— 一个用于构建浏览器用户脚本（UserScript）的通用框架库。

`easy-us` 统一管理用户脚本的 **创建、UI 显示、数据联动、数据交互**。你只需声明脚本（`Script`）、配置项（`Config`）与工程（`Project`），框架即可根据配置自动生成悬浮窗设置面板，并提供弹窗、消息、跨域通信、持久化存储等一系列开箱即用的脚本 API。适配 **Tampermonkey（油猴）** 与 **ScriptCat（脚本猫）**，同时兼容普通浏览器环境。

![version](https://img.shields.io/badge/version-0.0.66-blue) ![license](https://img.shields.io/badge/license-MIT-green)

## 特性

- **声明式配置**：通过 `configs` 声明配置项，自动生成表单界面（input / select / textarea），并双向绑定到存储
- **响应式数据**：`script.cfg` 为响应式 Proxy，读写自动同步存储，支持跨 tab 实时联动
- **完整生命周期**：`onstart` / `onactive` / `oncomplete` / `onhashchange` / `onhistorychange` / `onrender` / `onbeforeunload` 等钩子
- **UI 组件开箱即用**：`$modal`（弹窗）、`$message`（消息提示）、`$menu`（菜单）、tooltip、dropdown 等，全部在 Shadow DOM 中渲染，与宿主页面样式隔离
- **存储抽象层**：油猴环境自动使用 GM 存储（持久化 + 跨 tab 监听），普通环境降级为内存存储
- **跨域通信**：`CorsEventEmitter` 支持跨 iframe / 跨 tab 事件通讯，`defineTopFunction` 让函数只在顶层窗口执行
- **工程化管理**：`Project` 聚合多个 `Script`，支持域名限定、URL 匹配与优先级调度
- **TypeScript 优先**：完善的类型声明，`h()` 多重载、`ConfigTagMap` 类型映射

## 安装

```bash
npm install easy-us
```

或在你的脚本工程中直接引入 UMD 包（全局变量 `EUS`）：

```js
// @require https://cdn.jsdelivr.net/npm/easy-us/dist/index.min.js
```

## 快速开始

```ts
import { start, Script, Project, createRenderScript } from 'easy-us';

// 1. 定义脚本
const demoScript = new Script({
    name: '示例脚本',
    namespace: 'demo',
    matches: [['所有页面', /.*/]],
    configs: {
        notes: { defaultValue: '这是一个示例脚本' },
        count: {
            label: '执行次数',
            defaultValue: 3,
            attrs: { type: 'number', min: 0, max: 10 },
        },
    },
    onactive() {
        console.log('脚本已激活，当前次数：', this.cfg.count);
    },
    oncomplete() {
        console.log('页面加载完成');
    },
});

// 2. 定义工程
const project = Project.create({
    name: '示例工程',
    scripts: { demo: demoScript },
});

// 3. 启动（renderConfig 提供后自动生成设置面板悬浮窗）
start({
    projects: [project],
    renderConfig: {
        renderScript: createRenderScript(),
        title: '我的脚本面板',
        styles: [],
        defaultPanelName: 'demo',
    },
});
```

## 核心概念

| 概念 | 说明 |
|------|------|
| **Script** | 用户脚本单元：匹配规则 + 配置 + 生命周期钩子 + 暴露方法 |
| **Project** | 工程容器，聚合多个 Script，可限定域名 |
| **Config** | 配置项声明，自动生成表单并双向绑定存储 |
| **StoreProvider** | 存储抽象层，油猴用 `GMStoreProvider`，浏览器用 `MemoryStoreProvider` |
| **CustomWindow** | 悬浮窗 UI 容器（closed Shadow DOM），由 `renderScript` 驱动 |
| **CorsEventEmitter** | 跨域 / 跨 iframe 事件通讯 |

## 常用 API 一览

| 导出 | 说明 |
|------|------|
| `start(config)` | 启动框架，解析匹配的脚本并挂载 UI |
| `Script` / `Project` | 定义脚本与工程 |
| `$modal` | 弹窗（`alert` / `confirm` / `prompt` / `simple`），替代原生对话框 |
| `$message` | 消息提示（`info` / `success` / `warn` / `error`） |
| `$menu(label, config)` | 注册菜单栏按钮 |
| `$ui` | UI 工具集（tooltip、configs、notes、copy、button 等） |
| `h()` / `$el` / `$$el` | 类型增强的 DOM 创建与查询 |
| `$` | 通用工具（uuid、sleep、waitForElement、createConfigProxy 等） |
| `$gm` | 油猴工具（notification、getTab、getMetadataFromScriptHead 等） |
| `$store` | 全局存储实例 |
| `cors` | 跨域事件通讯（`emit` / `on` / `defineTopFunction`） |
| `createRenderScript()` | 创建渲染脚本（窗口位置、字体、显隐等设置） |

完整 API 文档与开发规范请参阅 [api.md](./api.md)。

## 模块结构

```
src/
├── index.ts                # 入口
├── interfaces/             # 核心抽象：Script / Project / Config / StoreProvider / CorsEventEmitter / CustomWindow
├── elements/               # Web Components：config / container / modal / message / dropdown 等
├── render/                 # 渲染层：createRenderScript / $modal / $message / $menu
└── utils/                  # 工具：start / $ui / h() / $ / $store / $gm / $const
```

## 构建与发布

```bash
npm run build   # tsc + vite build + dts-bundle-generator
npm run dev     # vite watch 模式
npm run pub     # build + version patch + publish + git push --tags
```

- `lib/`：CommonJS 产物 + 类型声明
- `dist/`：UMD 包（全局名 `EUS`）+ 合并后的 `index.d.ts`
- `assets/`：全局样式（css / less）

提交信息遵循 Conventional Commits（commitizen + cz-conventional-changelog）。

## License

[MIT](./LICENSE) © [enncy](https://github.com/enncy)
